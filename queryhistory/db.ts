// node:sqlite (Node's built-in module) rather than better-sqlite3 or any
// other native addon -- a native module risks failing to cross-compile
// for linux/amd64 inside `encore build docker`'s target image when built
// from an arm64 Mac; the built-in module sidesteps that risk entirely.
// Verified working locally on Node 22.22 before committing to this design.
//
// File-backed on a docker-compose volume (not the ephemeral container
// filesystem) so history survives container recreation, unlike the
// cube_api container logs this data is sourced from.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.QUERY_HISTORY_DB_PATH || "/app/data/query-history.db";
const RETENTION_DAYS = Number(process.env.QUERY_HISTORY_RETENTION_DAYS || 30);

let db: DatabaseSync | null = null;

// Lightweight migration for columns added after the table already existed
// in production (query_events had 2 real rows before usedPreAggregation/
// servedStaleCache were added) -- CREATE TABLE IF NOT EXISTS alone doesn't
// alter an existing table. ALTER TABLE ADD COLUMN, ignoring "duplicate
// column" if it's already there.
function addColumnIfMissing(database: DatabaseSync, column: string, ddl: string) {
  try {
    database.exec(`ALTER TABLE query_events ADD COLUMN ${column} ${ddl}`);
  } catch (e) {
    if (!(e instanceof Error) || !/duplicate column/i.test(e.message)) throw e;
  }
}

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS query_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      api_type TEXT,
      organisation_id TEXT,
      user_id TEXT,
      query_json TEXT,
      error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_query_events_completed_at ON query_events(completed_at);
    CREATE INDEX IF NOT EXISTS idx_query_events_status ON query_events(status);
  `);
  // used_pre_aggregation: NULL = unknown (e.g. an error row that never got
  // far enough to resolve pre-aggregations), 0/1 once known.
  addColumnIfMissing(db, "used_pre_aggregation", "INTEGER");
  addColumnIfMissing(db, "served_stale_cache", "INTEGER NOT NULL DEFAULT 0");
  // pre_aggregations_json: JSON array of {id, tableName}, e.g.
  // [{"id":"Agg.preAggStation","tableName":"prod_pre_aggregations.agg_pre_agg_station"}] --
  // [] (not null) once resolved-but-empty (a genuine source-scan query),
  // null only when never resolved (most error types). security_context_json
  // is the full JWT claims object cube.js's queryRewrite saw for this
  // request (iat/exp/nbf/iss/user_id/organisation_id -- no extra custom
  // claims in this project, confirmed live).
  addColumnIfMissing(db, "pre_aggregations_json", "TEXT");
  addColumnIfMissing(db, "security_context_json", "TEXT");
  // cache_type: 'in-memory' | 'cube-store-cache' (QueryCache.js's own result
  // cache, actually served) | 'pre-aggregation' | 'source' (cache missed,
  // fetchNew() ran -- split the same way used_pre_aggregation already is) |
  // NULL (never resolved -- most error types). See cube.js's forwarder for
  // where each value comes from.
  addColumnIfMissing(db, "cache_type", "TEXT");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_query_events_request_id ON query_events(request_id)`);
  return db;
}

export interface PreAggregationUsed {
  id: string;
  tableName: string;
}

export interface IngestEvent {
  requestId?: string;
  type: string;
  durationMs?: number;
  apiType?: string;
  organisationId?: string;
  userId?: string;
  securityContext?: unknown;
  query?: unknown;
  error?: string;
  preAggregationsUsed?: PreAggregationUsed[];
  servedStaleCache?: boolean;
}

// 'Load Request Success' -> success. 'Continue wait' -> pending (Cube
// served a stale cached result while a slow renewal ran in the
// background -- not a failure, but not a clean instant success either).
// Everything else that reaches here (Orchestrator error, Internal Server
// Error, User error, ...) is a genuine failure.
function statusForType(type: string): "success" | "pending" | "error" {
  if (type === "Load Request Success") return "success";
  if (type === "Continue wait") return "pending";
  return "error";
}

function pruneOld(database: DatabaseSync) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  database.prepare("DELETE FROM query_events WHERE completed_at < ?").run(cutoff);
}

// 'Slow Query Warning' fires separately from (usually just after) the
// completion event for the same requestId -- see cube.js. It only ever
// flags an existing row, never creates one: if the completion event
// hasn't landed yet (or never does), there's nothing to flag and this
// is a no-op rather than an incomplete/orphaned row.
function flagStaleCache(database: DatabaseSync, requestId: string | undefined): void {
  if (!requestId) return;
  database
    .prepare("UPDATE query_events SET served_stale_cache = 1 WHERE request_id = ?")
    .run(requestId);
}

// Bridges 'Load Request SQL' (carries the real pre-aggregation signal --
// see cube.js's long comment on why 'Load Request Success's own
// queriesWithPreAggregations field turned out to be unreliable) with the
// completion event for the same requestId, which creates the row and
// arrives moments later. Purely in-memory: this only ever bridges two
// near-simultaneous events for the same in-flight request, nothing here
// needs to survive a restart. A request can generate more than one 'Load
// Request SQL' (compareDateRange-style multi-query requests), hence
// union-by-id rather than overwriting.
const pendingPreAgg = new Map<string, { list: PreAggregationUsed[]; recordedAt: number }>();
const PENDING_TTL_MS = 60_000;

function notePreAggregationUsage(requestId: string | undefined, used: PreAggregationUsed[]): void {
  if (!requestId) return;
  const existing = pendingPreAgg.get(requestId);
  const merged = new Map((existing?.list ?? []).map((p) => [p.id, p]));
  for (const p of used) merged.set(p.id, p);
  pendingPreAgg.set(requestId, { list: [...merged.values()], recordedAt: Date.now() });
}

// Consumes (removes) any buffered signal for this requestId. Also sweeps
// stale entries -- e.g. a 'Load Request SQL' whose completion event never
// arrived (process crash, dropped POST) -- so this can't grow unbounded.
function takePreAggregationUsage(requestId: string | undefined): PreAggregationUsed[] | undefined {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, entry] of pendingPreAgg) {
    if (entry.recordedAt < cutoff) pendingPreAgg.delete(key);
  }
  if (!requestId) return undefined;
  const entry = pendingPreAgg.get(requestId);
  if (!entry) return undefined;
  pendingPreAgg.delete(requestId);
  return entry.list;
}

// Same bridging pattern as pendingPreAgg above, for QueryCache.js's own
// events (see cube.js): 'Found in memory cache entry' fires when the
// in-process memory cache serves the request outright (fastest path, skips
// the persistent cache driver entirely); 'Using cache for' fires when the
// persistent cache driver (Cube Store here, per CUBEJS_CUBESTORE_HOST) has
// a live, non-renewing entry. Both can, in principle, fire more than once
// per requestId (compareDateRange-style multi-query requests); 'in-memory'
// never gets downgraded by a later 'cube-store-cache' signal for the same
// request, since a genuinely fast in-memory hit is the more representative
// tier for the whole request even if one sub-query happened to miss it.
type CacheTier = "in-memory" | "cube-store-cache";
const pendingCacheTier = new Map<string, { tier: CacheTier; recordedAt: number }>();

function noteCacheTier(requestId: string | undefined, tier: CacheTier): void {
  if (!requestId) return;
  const existing = pendingCacheTier.get(requestId);
  if (existing?.tier === "in-memory") return;
  pendingCacheTier.set(requestId, { tier, recordedAt: Date.now() });
}

function takeCacheTier(requestId: string | undefined): CacheTier | undefined {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [key, entry] of pendingCacheTier) {
    if (entry.recordedAt < cutoff) pendingCacheTier.delete(key);
  }
  if (!requestId) return undefined;
  const entry = pendingCacheTier.get(requestId);
  if (!entry) return undefined;
  pendingCacheTier.delete(requestId);
  return entry.tier;
}

export function insertEvent(ev: IngestEvent): void {
  const database = getDb();

  if (ev.type === "Load Request SQL") {
    notePreAggregationUsage(ev.requestId, ev.preAggregationsUsed ?? []);
    return;
  }

  if (ev.type === "Slow Query Warning") {
    flagStaleCache(database, ev.requestId);
    return;
  }

  // Cache-tier signals (see cube.js): buffered the same way as 'Load
  // Request SQL' above, consumed below at row-insert time rather than
  // creating their own row.
  if (ev.type === "Found in memory cache entry") {
    noteCacheTier(ev.requestId, "in-memory");
    return;
  }
  if (ev.type === "Using cache for") {
    noteCacheTier(ev.requestId, "cube-store-cache");
    return;
  }

  const durationMs = Math.max(0, Math.round(ev.durationMs ?? 0));
  const completedAt = new Date();
  const startedAt = new Date(completedAt.getTime() - durationMs);
  // Prefer the buffered 'Load Request SQL' signal (reliable, see above)
  // over ev.preAggregationsUsed (cube.js only sets that on the SQL event
  // itself, so this is effectively always the buffered path -- kept as a
  // direct fallback for forward compatibility rather than removed).
  const preAggregations = takePreAggregationUsage(ev.requestId) ?? ev.preAggregationsUsed;
  // Cache type: a buffered tier (in-memory/cube-store-cache) means the
  // request never even reached fetchNew(); no tier means it did, so fall
  // back to the (already-resolved) pre-aggregation signal to split
  // "pre-aggregation" from "source" -- same reasoning as used_pre_aggregation
  // above. Stays null when preAggregations itself is unresolved (most error
  // rows), rather than guessing.
  const cacheTier = takeCacheTier(ev.requestId);
  const cacheType =
    cacheTier ?? (preAggregations === undefined ? null : preAggregations.length > 0 ? "pre-aggregation" : "source");
  database
    .prepare(
      `INSERT INTO query_events
        (request_id, type, status, duration_ms, started_at, completed_at, api_type, organisation_id, user_id, query_json, error_message, used_pre_aggregation, pre_aggregations_json, security_context_json, cache_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      ev.requestId ?? null,
      ev.type,
      statusForType(ev.type),
      durationMs,
      startedAt.toISOString(),
      completedAt.toISOString(),
      ev.apiType ?? null,
      ev.organisationId ?? null,
      ev.userId ?? null,
      ev.query !== undefined ? JSON.stringify(ev.query) : null,
      ev.error ?? null,
      preAggregations === undefined ? null : preAggregations.length > 0 ? 1 : 0,
      preAggregations !== undefined ? JSON.stringify(preAggregations) : null,
      ev.securityContext !== undefined ? JSON.stringify(ev.securityContext) : null,
      cacheType
    );
  pruneOld(database);
}

export interface QueryEventRow {
  id: number;
  requestId: string | null;
  type: string;
  status: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  apiType: string | null;
  organisationId: string | null;
  userId: string | null;
  queryJson: string | null;
  errorMessage: string | null;
  // null = unknown (row never resolved far enough to tell, e.g. most
  // error types), 0/1 once known. servedStaleCache is always 0/1 (defaults
  // false; only ever set true by a matching 'Slow Query Warning').
  usedPreAggregation: number | null;
  servedStaleCache: number;
  // JSON-encoded PreAggregationUsed[] (see above) / raw JWT claims object;
  // left as strings here, parsed on the frontend -- same pattern as
  // queryJson/errorMessage, avoids a JSON.parse+reserialize round trip for
  // rows the caller only lists, never opens.
  preAggregationsJson: string | null;
  securityContextJson: string | null;
  // 'in-memory' | 'cube-store-cache' | 'pre-aggregation' | 'source' | null
  // (unresolved -- most error rows). See the long comment on takeCacheTier.
  cacheType: string | null;
}

const SELECT_COLUMNS = `
  id, request_id as requestId, type, status, duration_ms as durationMs,
  started_at as startedAt, completed_at as completedAt, api_type as apiType,
  organisation_id as organisationId, user_id as userId,
  query_json as queryJson, error_message as errorMessage,
  used_pre_aggregation as usedPreAggregation, served_stale_cache as servedStaleCache,
  pre_aggregations_json as preAggregationsJson, security_context_json as securityContextJson,
  cache_type as cacheType
`;

export interface ListParams {
  status?: string;
  search?: string;
  sinceMinutes?: number;
  limit?: number;
  offset?: number;
}

export function listEvents(params: ListParams): { rows: QueryEventRow[]; total: number } {
  const database = getDb();
  const clauses: string[] = [];
  const args: unknown[] = [];
  if (params.status) {
    clauses.push("status = ?");
    args.push(params.status);
  }
  if (params.search) {
    clauses.push("query_json LIKE ?");
    args.push(`%${params.search}%`);
  }
  if (params.sinceMinutes) {
    clauses.push("completed_at >= ?");
    args.push(new Date(Date.now() - params.sinceMinutes * 60 * 1000).toISOString());
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);

  const rows = database
    .prepare(`SELECT ${SELECT_COLUMNS} FROM query_events ${where} ORDER BY completed_at DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, offset) as unknown as QueryEventRow[];
  const totalRow = database
    .prepare(`SELECT COUNT(*) as c FROM query_events ${where}`)
    .get(...args) as { c: number };
  return { rows, total: totalRow.c };
}

export function getEventById(id: number): QueryEventRow | undefined {
  const database = getDb();
  return database
    .prepare(`SELECT ${SELECT_COLUMNS} FROM query_events WHERE id = ?`)
    .get(id) as unknown as QueryEventRow | undefined;
}

export interface StatsBucket {
  bucket: string;
  count: number;
  avgDurationMs: number;
  errorCount: number;
}

// Bucket width scales with the selected range -- 1-minute buckets for "last
// 5 minutes" would be fine, but hourly buckets for the same range would
// show one or two bars total; the reverse (1-minute buckets over 7 days)
// would be thousands of bars. Picked so a full range renders as roughly
// 15-40 bars regardless of which preset is selected.
function bucketSecondsFor(sinceMinutes: number): number {
  if (sinceMinutes <= 15) return 60; // 1 minute
  if (sinceMinutes <= 60) return 2 * 60; // 2 minutes
  if (sinceMinutes <= 6 * 60) return 15 * 60; // 15 minutes
  if (sinceMinutes <= 24 * 60) return 60 * 60; // 1 hour
  if (sinceMinutes <= 7 * 24 * 60) return 6 * 60 * 60; // 6 hours
  return 24 * 60 * 60; // 1 day
}

export function statsBuckets(sinceMinutes: number): StatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  // Groups rows into fixed-width time buckets by integer-dividing the unix
  // timestamp, rather than strftime('%H:00', ...) (hour-string formatting,
  // which can only ever produce hour-wide buckets) -- this works uniformly
  // for any bucket width, from 1 minute to multi-day.
  return database
    .prepare(
      // CAST(? AS INTEGER) on the bound parameters too, not just the
      // column -- without it SQLite performs real (floating-point)
      // division against a JS number parameter, so nothing actually
      // truncates to a bucket boundary and every row ends up in its own
      // "bucket" (verified locally: silently produces one bar per row,
      // no grouping, before this cast was added).
      `SELECT
         datetime((CAST(strftime('%s', completed_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         COUNT(*) as count,
         AVG(duration_ms) as avgDurationMs,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount
       FROM query_events
       WHERE completed_at >= ?
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as StatsBucket[];
}

export interface CacheStatsBucket {
  bucket: string;
  cacheType: string;
  count: number;
  avgDurationMs: number;
}

// One row per (bucket, cacheType) pair -- the frontend pivots this into one
// row per bucket for the stacked/multi-line charts. Rows with an unresolved
// cache_type (most error types -- see takeCacheTier) are excluded rather
// than lumped into a synthetic "unknown" series: they were never actually
// classified into any of the four real tiers, so charting them as a tier
// would misrepresent what's genuinely known.
export function cacheStatsBuckets(sinceMinutes: number): CacheStatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  return database
    .prepare(
      `SELECT
         datetime((CAST(strftime('%s', completed_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         cache_type as cacheType,
         COUNT(*) as count,
         AVG(duration_ms) as avgDurationMs
       FROM query_events
       WHERE completed_at >= ? AND cache_type IS NOT NULL
       GROUP BY bucket, cacheType
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as CacheStatsBucket[];
}

export interface ApiTypeStatsBucket {
  bucket: string;
  apiType: string;
  count: number;
}

// Same one-row-per-(bucket, series) shape as cacheStatsBuckets, grouped by
// api_type (rest/sql/graphql/... -- whatever this Cube instance actually
// serves) instead. Excludes NULL api_type the same way and for the same
// reason as cache_type above.
export function apiTypeStatsBuckets(sinceMinutes: number): ApiTypeStatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  return database
    .prepare(
      `SELECT
         datetime((CAST(strftime('%s', completed_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         api_type as apiType,
         COUNT(*) as count
       FROM query_events
       WHERE completed_at >= ? AND api_type IS NOT NULL
       GROUP BY bucket, apiType
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as ApiTypeStatsBucket[];
}

export interface StaleCacheStatsBucket {
  bucket: string;
  total: number;
  staleCount: number;
}

// served_stale_cache is only ever set true by a matching 'Slow Query
// Warning' (see flagStaleCache above) -- counted against every row in the
// window (not just successes) so the rate reflects "how often did Cube
// serve stale data" against the full traffic it saw, not a cherry-picked
// denominator.
export function staleCacheStatsBuckets(sinceMinutes: number): StaleCacheStatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  return database
    .prepare(
      `SELECT
         datetime((CAST(strftime('%s', completed_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         COUNT(*) as total,
         SUM(served_stale_cache) as staleCount
       FROM query_events
       WHERE completed_at >= ?
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as StaleCacheStatsBucket[];
}
