import { api } from "encore.dev/api";
import {
  insertCompileEvent,
  compileStatsBuckets,
  CompileIngestEvent,
  insertErrorEvent,
  errorStatsBuckets,
  ErrorIngestEvent,
} from "./db";

// api.raw, matching queryhistory/api.ts's established pattern in this
// project (see its header comment for why).

function sendJson(resp: Parameters<Parameters<typeof api.raw>[1]>[1], status: number, body: unknown) {
  resp.writeHead(status, { "Content-Type": "application/json" });
  resp.end(JSON.stringify(body));
}

async function readBody(req: Parameters<Parameters<typeof api.raw>[1]>[0]): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

// Called only by cube.js's custom logger, same internal-docker-network
// trust boundary as queryhistory's ingest endpoint.
export const compileIngest = api.raw(
  { expose: true, method: "POST", path: "/api/performance/compile-ingest" },
  async (req, resp) => {
    try {
      const body = JSON.parse(await readBody(req)) as CompileIngestEvent;
      if (!body.type) throw new Error("missing 'type'");
      insertCompileEvent(body);
      sendJson(resp, 200, { ok: true });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

export const compileStats = api.raw(
  { expose: true, method: "GET", path: "/api/performance/compile-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: compileStatsBuckets(sinceMinutes) });
  }
);

// Same trust boundary as compileIngest above. Never carries a raw token --
// cube.js strips it before forwarding, see its long comment on why.
export const errorIngest = api.raw(
  { expose: true, method: "POST", path: "/api/performance/error-ingest" },
  async (req, resp) => {
    try {
      const body = JSON.parse(await readBody(req)) as ErrorIngestEvent;
      if (body.kind !== "auth" && body.kind !== "preagg-build") throw new Error("missing or invalid 'kind'");
      insertErrorEvent(body);
      sendJson(resp, 200, { ok: true });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

export const errorStats = api.raw(
  { expose: true, method: "GET", path: "/api/performance/error-stats" },
  async (req, resp) => {
    const url = new URL(req.url || "", "http://internal");
    const sinceMinutes = url.searchParams.has("sinceMinutes") ? Number(url.searchParams.get("sinceMinutes")) : 60;
    sendJson(resp, 200, { buckets: errorStatsBuckets(sinceMinutes) });
  }
);
