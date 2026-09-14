import { api } from "encore.dev/api";
import {
  fetchPreAggregationsList,
  fetchPreAggregationPartitions,
  triggerPreAggregationBuild,
  fetchRebuildJobStatus,
  runIntegrityCheck,
} from "../shared/cubeApi";
import { fetchPartitionHistory, fetchTableRowCounts } from "../shared/cubeStore";

// Both endpoints pass cube_api's response through mostly as-is -- see the
// plan's notes on gateway.js for the exact shape:
//   GET  /cubejs-system/v1/pre-aggregations            -> { preAggregations: [...] }
//   POST /cubejs-system/v1/pre-aggregations/partitions -> { preAggregationPartitions: [{
//     preAggregation, partitions: [...], invalidateKeyQueries, ... }] }
// each partition carrying tableName, dataSource, type, versionEntries
// (build/refresh history) and structureVersion once expand includes
// partitions.meta/versions.
//
// Deliberately api.raw rather than the typed api() wrapper: Encore's
// static schema analyzer requires a concrete named interface for typed
// endpoints (rejects `unknown`/index-signature passthrough types), but
// these two are pure proxies whose exact shape gets confirmed against a
// live response as part of this plan's verification step, not hand-typed
// here -- api.raw forwards the JSON bytes untouched instead.

function sendJson(resp: Parameters<Parameters<typeof api.raw>[1]>[1], status: number, body: unknown) {
  resp.writeHead(status, { "Content-Type": "application/json" });
  resp.end(JSON.stringify(body));
}

async function readBody(req: Parameters<Parameters<typeof api.raw>[1]>[0]): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export const list = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations" },
  async (_req, resp) => {
    try {
      sendJson(resp, 200, await fetchPreAggregationsList());
    } catch (e) {
      sendJson(resp, 502, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// Merges in each partition's real row count from Cube Store (rowCount,
// null if unknown) -- a 0 on an otherwise "built" partition is exactly
// the signal that would have caught this week's two silent-failure bugs
// immediately instead of requiring a manual day-vs-hour comparison. Best-
// effort: a Cube Store hiccup degrades to rowCount: null for every row
// rather than failing the whole partitions view, since cube_api's own
// response is the part this page can't work without.
export const partitions = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations/partitions" },
  async (_req, resp) => {
    try {
      const data = (await fetchPreAggregationPartitions()) as {
        preAggregationPartitions?: { partitions?: { tableName?: string; rowCount?: number | null }[] }[];
      };
      const rowCounts = await fetchTableRowCounts().catch(() => new Map<string, number>());
      for (const group of data.preAggregationPartitions || []) {
        for (const p of group.partitions || []) {
          p.rowCount = p.tableName && rowCounts.has(p.tableName) ? rowCounts.get(p.tableName)! : null;
        }
      }
      sendJson(resp, 200, data);
    } catch (e) {
      sendJson(resp, 502, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// The immediate need this whole feature exists for: this week's two
// pre-aggregation bugs each took hours of manual curl/JWT diagnosis to
// even detect, let alone fix -- a targeted rebuild button removes the
// "fix" half of that. Scoped to exactly the caller-provided dateRange
// (see triggerPreAggregationBuild's comment on why omitting it would be
// dangerous) -- the frontend is expected to send one partition's own
// buildRangeStart/buildRangeEnd, never the pre-aggregation's full range.
export const rebuild = api.raw(
  { expose: true, method: "POST", path: "/api/pre-aggregations/rebuild" },
  async (req, resp) => {
    try {
      const body = JSON.parse(await readBody(req)) as {
        preAggregationId?: string;
        dateRange?: [string, string];
        dataSource?: string;
        timezone?: string;
      };
      if (!body.preAggregationId) throw new Error("missing 'preAggregationId'");
      if (!body.dateRange || body.dateRange.length !== 2) {
        throw new Error("missing or invalid 'dateRange' -- expected [start, end]");
      }
      const tokens = await triggerPreAggregationBuild({
        preAggregationId: body.preAggregationId,
        dateRange: body.dateRange,
        dataSource: body.dataSource,
        timezone: body.timezone,
      });
      sendJson(resp, 200, { tokens });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// Light polling target for the tokens `rebuild` above returns -- see
// fetchRebuildJobStatus's comment on how to read `status`.
export const rebuildStatus = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations/rebuild-status" },
  async (req, resp) => {
    try {
      const url = new URL(req.url || "", "http://internal");
      const tokens = url.searchParams.getAll("token");
      if (!tokens.length) throw new Error("missing 'token' query param (one or more)");
      sendJson(resp, 200, { statuses: await fetchRebuildJobStatus(tokens) });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// Productizes this week's manual day-vs-hour diagnostic -- see
// runIntegrityCheck's comment in shared/cubeApi.ts. organisationId/userId
// are required, not optional: this project's queryRewrite rejects any
// query whose security context has either at 0/missing, and a real
// tenant is exactly the point (see that same comment for why).
export const integrityCheck = api.raw(
  { expose: true, method: "POST", path: "/api/pre-aggregations/integrity-check" },
  async (req, resp) => {
    try {
      const body = JSON.parse(await readBody(req)) as {
        measures?: string[];
        timeDimension?: string;
        dateRange?: [string, string];
        organisationId?: number;
        userId?: number;
      };
      if (!body.measures || !body.measures.length) {
        throw new Error("missing 'measures' (non-empty array of fully-qualified measure names)");
      }
      if (!body.timeDimension) throw new Error("missing 'timeDimension'");
      if (!body.dateRange || body.dateRange.length !== 2) {
        throw new Error("missing or invalid 'dateRange' -- expected [start, end]");
      }
      if (!body.organisationId) throw new Error("missing 'organisationId' -- must be a real tenant, see README");
      if (!body.userId) throw new Error("missing 'userId' -- must be a real tenant, see README");
      const results = await runIntegrityCheck({
        measures: body.measures,
        timeDimension: body.timeDimension,
        dateRange: body.dateRange,
        securityContext: { user_id: body.userId, organisation_id: body.organisationId },
      });
      sendJson(resp, 200, { results });
    } catch (e) {
      sendJson(resp, 400, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// Real rebuild timeline per pre-aggregation, composed from three sources:
//  1. fetchPreAggregationsList() -- refreshKey.updateWindow/every per pre-agg
//     (already present on the compiled preAggregation config cube_api
//     returns, confirmed live -- no need to parse the schema source for it)
//  2. fetchPreAggregationPartitions() -- tableName -> preAggregationId
//     mapping, so Cube Store's generations can be attributed correctly
//  3. fetchPartitionHistory() (Cube Store's own system.tables) -- the only
//     place old table generations (past rebuilds) are still visible, and
//     only for partitions still inside their updateWindow -- see the
//     comments in shared/cubeStore.ts.
export const buildHistory = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations/build-history" },
  async (_req, resp) => {
    try {
      const [defs, partitionsResp, history] = await Promise.all([
        fetchPreAggregationsList(),
        fetchPreAggregationPartitions() as Promise<{
          preAggregationPartitions?: {
            preAggregation?: { id?: string };
            partitions?: { tableName?: string }[];
          }[];
        }>,
        fetchPartitionHistory(),
      ]);

      const tableNameToPreAggId = new Map<string, string>();
      for (const group of partitionsResp.preAggregationPartitions || []) {
        const id = group.preAggregation?.id;
        if (!id) continue;
        for (const p of group.partitions || []) {
          if (p.tableName) tableNameToPreAggId.set(p.tableName, id);
        }
      }

      const byPreAgg = new Map<
        string,
        { id: string; refreshKey: unknown; partitions: typeof history }
      >();
      for (const def of defs.preAggregations) {
        byPreAgg.set(def.id, {
          id: def.id,
          refreshKey: (def as { preAggregation?: { refreshKey?: unknown } }).preAggregation
            ?.refreshKey,
          partitions: [],
        });
      }
      for (const partitionGroup of history) {
        const preAggId = tableNameToPreAggId.get(partitionGroup.logicalName);
        const bucket = preAggId && byPreAgg.get(preAggId);
        if (bucket) bucket.partitions.push(partitionGroup);
      }

      sendJson(resp, 200, { preAggregations: [...byPreAgg.values()] });
    } catch (e) {
      sendJson(resp, 502, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);
