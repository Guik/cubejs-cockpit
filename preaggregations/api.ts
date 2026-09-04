import { api } from "encore.dev/api";
import {
  fetchPreAggregationsList,
  fetchPreAggregationPartitions,
} from "../shared/cubeApi";

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

export const list = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations" },
  async (_req, resp) => {
    try {
      const body = await fetchPreAggregationsList();
      resp.writeHead(200, { "Content-Type": "application/json" });
      resp.end(JSON.stringify(body));
    } catch (e) {
      resp.writeHead(502, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  }
);

export const partitions = api.raw(
  { expose: true, method: "GET", path: "/api/pre-aggregations/partitions" },
  async (_req, resp) => {
    try {
      const body = await fetchPreAggregationPartitions();
      resp.writeHead(200, { "Content-Type": "application/json" });
      resp.end(JSON.stringify(body));
    } catch (e) {
      resp.writeHead(502, { "Content-Type": "application/json" });
      resp.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  }
);
