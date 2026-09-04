import { api } from "encore.dev/api";
import {
  fetchPreAggregationsList,
  fetchPreAggregationPartitions,
} from "../shared/cubeApi";
import { fetchPartitionHistory } from "../shared/cubeStore";

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

export const partitions = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations/partitions" },
  async (_req, resp) => {
    try {
      sendJson(resp, 200, await fetchPreAggregationPartitions());
    } catch (e) {
      sendJson(resp, 502, { error: e instanceof Error ? e.message : String(e) });
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
