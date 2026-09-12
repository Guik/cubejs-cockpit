import { api } from "encore.dev/api";
import {
  insertEvent,
  listEvents,
  getEventById,
  statsBuckets,
  cacheStatsBuckets,
  apiTypeStatsBuckets,
  staleCacheStatsBuckets,
  IngestEvent,
} from "./db";

// api.raw throughout, matching preaggregations/api.ts's established
// pattern in this project: query-string/body parsing done by hand rather
// than fighting Encore's typed-schema analyzer (which rejects `unknown`
// and index-signature types) for data whose shape is either pass-through
// (ingest, sourced from cube.js's logger) or fully within our own
// control anyway (list/stats/detail already return concrete row types
// from db.ts).

function sendJson(resp: Parameters<Parameters<typeof api.raw>[1]>[1], status: number, body: unknown) {
  resp.writeHead(status, { "Content-Type": "application/json" });
  resp.end(JSON.stringify(body));
}

async function readBody(req: Parameters<Parameters<typeof api.raw>[1]>[0]): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

// Called only by cube.js's custom logger (see the plan) -- internal
// docker-network trust boundary only, same as every other internal call
// in this stack (cubejs_cockpit -> cube_api, cube_api -> cubestore).
export const ingest = api.raw(
  { expose: true, method: "POST", path: "/api/query-history/ingest" },
  async (req, resp) => {
    try {
      const body = JSON.parse(await readBody(req)) as IngestEvent;
      if (!body.type) throw new Error("missing 'type'");
      insertEvent(body);
      sendJson(resp, 200, { ok: true });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

export const list = api.raw(
  { expose: true, method: "GET", path: "/api/query-history" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const params = {
      status: url.searchParams.get("status") || undefined,
      search: url.searchParams.get("search") || undefined,
      sinceMinutes: url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
    };
    sendJson(resp, 200, listEvents(params));
  }
);

export const stats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: statsBuckets(sinceMinutes) });
  }
);

export const cacheStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/cache-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: cacheStatsBuckets(sinceMinutes) });
  }
);

export const apiTypeStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/api-type-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: apiTypeStatsBuckets(sinceMinutes) });
  }
);

export const staleCacheStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/stale-cache-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: staleCacheStatsBuckets(sinceMinutes) });
  }
);

export const detail = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/detail" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      sendJson(resp, 400, { error: "missing or invalid 'id'" });
      return;
    }
    const row = getEventById(id);
    if (!row) {
      sendJson(resp, 404, { error: "not found" });
      return;
    }
    sendJson(resp, 200, row);
  }
);
