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
  return db;
}

export interface IngestEvent {
  requestId?: string;
  type: string;
  durationMs?: number;
  apiType?: string;
  organisationId?: string;
  userId?: string;
  query?: unknown;
  error?: string;
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

export function insertEvent(ev: IngestEvent): void {
  const database = getDb();
  const durationMs = Math.max(0, Math.round(ev.durationMs ?? 0));
  const completedAt = new Date();
  const startedAt = new Date(completedAt.getTime() - durationMs);
  database
    .prepare(
      `INSERT INTO query_events
        (request_id, type, status, duration_ms, started_at, completed_at, api_type, organisation_id, user_id, query_json, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      ev.error ?? null
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
}

const SELECT_COLUMNS = `
  id, request_id as requestId, type, status, duration_ms as durationMs,
  started_at as startedAt, completed_at as completedAt, api_type as apiType,
  organisation_id as organisationId, user_id as userId,
  query_json as queryJson, error_message as errorMessage
`;

export interface ListParams {
  status?: string;
  search?: string;
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

export function statsBuckets(sinceHours: number): StatsBucket[] {
  const database = getDb();
  const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
  return database
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:00:00', completed_at) as bucket,
              COUNT(*) as count,
              AVG(duration_ms) as avgDurationMs,
              SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errorCount
       FROM query_events
       WHERE completed_at >= ?
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(since) as unknown as StatsBucket[];
}
