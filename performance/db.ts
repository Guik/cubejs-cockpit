// Same node:sqlite choice as dashboard/queryhistory/db.ts (see its header
// comment) -- separate file on the same already-mounted /app/data volume,
// not a new table in query_events, since compile events aren't tied to a
// single query the way cache-type is (see cube.js: they carry their own
// requestId + duration and are inserted directly on completion, no
// pending-buffer correlation needed).
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.PERFORMANCE_DB_PATH || "/app/data/performance.db";
const RETENTION_DAYS = Number(process.env.QUERY_HISTORY_RETENTION_DAYS || 30);

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS compile_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      error_message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_compile_events_completed_at ON compile_events(completed_at);

    -- 'auth' (a failed/rejected auth attempt -- see cube.js: detected
    -- structurally, not by message text, since Cube's auth failures use
    -- the thrown error's own message as the event type) or 'preagg-build'
    -- ('Pre-aggregations build job error' from query-orchestrator's
    -- PreAggregationLoader.js -- a background refresh-worker job, not a
    -- live request, so no duration to record here).
    CREATE TABLE IF NOT EXISTS error_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      type TEXT,
      request_id TEXT,
      context TEXT,
      error_message TEXT,
      occurred_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_error_events_occurred_at ON error_events(occurred_at);
  `);
  return db;
}

export interface CompileIngestEvent {
  requestId?: string;
  type: "Compiling schema completed" | "Compiling schema error";
  durationMs?: number;
  error?: string;
}

function pruneOld(database: DatabaseSync) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  database.prepare("DELETE FROM compile_events WHERE completed_at < ?").run(cutoff);
}

function pruneOldErrors(database: DatabaseSync) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  database.prepare("DELETE FROM error_events WHERE occurred_at < ?").run(cutoff);
}

export function insertCompileEvent(ev: CompileIngestEvent): void {
  const database = getDb();
  const durationMs = Math.max(0, Math.round(ev.durationMs ?? 0));
  database
    .prepare(
      `INSERT INTO compile_events (request_id, status, duration_ms, completed_at, error_message)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      ev.requestId ?? null,
      ev.type === "Compiling schema error" ? "error" : "success",
      durationMs,
      new Date().toISOString(),
      ev.error ?? null
    );
  pruneOld(database);
}

export interface CompileStatsBucket {
  bucket: string;
  count: number;
  avgDurationMs: number;
  errorCount: number;
}

// Same adaptive bucket width as dashboard/queryhistory/db.ts's
// bucketSecondsFor -- deliberately kept as its own copy (four lines) rather
// than a shared module for one function used by two independent services.
function bucketSecondsFor(sinceMinutes: number): number {
  if (sinceMinutes <= 15) return 60;
  if (sinceMinutes <= 60) return 2 * 60;
  if (sinceMinutes <= 6 * 60) return 15 * 60;
  if (sinceMinutes <= 24 * 60) return 60 * 60;
  if (sinceMinutes <= 7 * 24 * 60) return 6 * 60 * 60;
  return 24 * 60 * 60;
}

export function compileStatsBuckets(sinceMinutes: number): CompileStatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  return database
    .prepare(
      `SELECT
         datetime((CAST(strftime('%s', completed_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         COUNT(*) as count,
         AVG(duration_ms) as avgDurationMs,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount
       FROM compile_events
       WHERE completed_at >= ?
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as CompileStatsBucket[];
}

export interface ErrorIngestEvent {
  kind: "auth" | "preagg-build";
  type?: string;
  requestId?: string;
  context?: string;
  error?: string;
}

export function insertErrorEvent(ev: ErrorIngestEvent): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO error_events (kind, type, request_id, context, error_message, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      ev.kind,
      ev.type ?? null,
      ev.requestId ?? null,
      ev.context ?? null,
      ev.error ?? null,
      new Date().toISOString()
    );
  pruneOldErrors(database);
}

export interface ErrorStatsBucket {
  bucket: string;
  kind: string;
  count: number;
}

// One row per (bucket, kind) pair, same shape as queryhistory's
// cacheStatsBuckets/apiTypeStatsBuckets -- the frontend pivots and charts
// it the same way, rather than listing individual error rows.
export function errorStatsBuckets(sinceMinutes: number): ErrorStatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  const bucketSeconds = bucketSecondsFor(sinceMinutes);
  return database
    .prepare(
      `SELECT
         datetime((CAST(strftime('%s', occurred_at) AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER), 'unixepoch') as bucket,
         kind,
         COUNT(*) as count
       FROM error_events
       WHERE occurred_at >= ?
       GROUP BY bucket, kind
       ORDER BY bucket ASC`
    )
    .all(bucketSeconds, bucketSeconds, since) as unknown as ErrorStatsBucket[];
}

export interface RecentErrorEntry {
  kind: string;
  type: string | null;
  requestId: string | null;
  context: string | null;
  errorMessage: string | null;
  occurredAt: string;
}

// The charts above only ever aggregate to a count -- this is the detail
// that count hides: what actually failed, for which request, with what
// message. Pulls in failed compile_events too (kind: 'compile') since a
// broken schema deploy is the same "something's wrong" signal an operator
// is looking for here, even though it's stored in a separate table.
export function recentErrors(sinceMinutes: number, limit = 50): RecentErrorEntry[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
  return database
    .prepare(
      `SELECT kind, type, request_id as requestId, context, error_message as errorMessage, occurred_at as occurredAt
         FROM error_events
        WHERE occurred_at >= ?
        UNION ALL
       SELECT 'compile' as kind, 'Compiling schema error' as type, request_id as requestId, NULL as context,
              error_message as errorMessage, completed_at as occurredAt
         FROM compile_events
        WHERE status = 'error' AND completed_at >= ?
        ORDER BY occurredAt DESC
        LIMIT ?`
    )
    .all(since, since, limit) as unknown as RecentErrorEntry[];
}
