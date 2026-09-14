import { api } from "encore.dev/api";
import {
  insertEvent,
  listEvents,
  statsBuckets,
  cacheStatsBuckets,
  apiTypeStatsBuckets,
  staleCacheStatsBuckets,
  IngestEvent,
  QueryOrigin,
  TimeWindow,
} from "./db";

// Shared by every read endpoint below -- see originClause's comment in
// db.ts for why this exists. Anything unrecognized falls back to 'user'
// (excluding Cube's internal scheduler activity), the same as omitting
// the param entirely.
function parseOrigin(url: URL): QueryOrigin | undefined {
  const raw = url.searchParams.get("origin");
  return raw === "internal" || raw === "all" ? raw : undefined;
}

// The custom range picker sends from+to (an absolute ISO pair); every
// preset button sends sinceMinutes. from+to takes priority when both
// somehow show up -- see resolveTimeWindow in db.ts. Defaults to the last
// hour only when the caller specifies neither, same as every one of these
// endpoints already defaulted to before the custom picker existed.
function parseTimeWindow(url: URL): TimeWindow {
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  if (from && to) return { from, to };
  return { sinceMinutes: url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60 };
}

// api.raw throughout, matching preaggregations/api.ts's established
// pattern in this project: query-string/body parsing done by hand rather
// than fighting Encore's typed-schema analyzer (which rejects `unknown`
// and index-signature types) for data whose shape is either pass-through
// (ingest, sourced from cube.js's logger) or fully within our own
// control anyway (list/stats already return concrete row types from
// db.ts).

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
      // Unlike the stats endpoints below, list has always left the time
      // window off entirely (all-time) when the caller doesn't ask for
      // one -- preserved here rather than defaulting to the last hour.
      sinceMinutes: url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
      offset: url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : undefined,
      origin: parseOrigin(url),
    };
    sendJson(resp, 200, listEvents(params));
  }
);

export const stats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    sendJson(resp, 200, { buckets: statsBuckets(parseTimeWindow(url), parseOrigin(url)) });
  }
);

export const cacheStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/cache-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    sendJson(resp, 200, { buckets: cacheStatsBuckets(parseTimeWindow(url), parseOrigin(url)) });
  }
);

export const apiTypeStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/api-type-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    sendJson(resp, 200, { buckets: apiTypeStatsBuckets(parseTimeWindow(url), parseOrigin(url)) });
  }
);

export const staleCacheStats = api.raw(
  { expose: true, method: "GET", path: "/api/query-history/stale-cache-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    sendJson(resp, 200, { buckets: staleCacheStatsBuckets(parseTimeWindow(url), parseOrigin(url)) });
  }
);
