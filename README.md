# cubejs-cockpit

Self-hosted operations dashboard for a Cube.js / Cube Core deployment.

## Features

- **Live data model** -- the cube/measure/dimension metadata and raw
  schema source actually running, not just what a schema file is assumed
  to say.
- **Pre-aggregation status & build history** -- partition status and
  rebuild timeline read straight from Cube Store.
- **Persistent query history** -- every query with duration, status,
  cache type, and pre-aggregation attribution.
- **Performance view** -- cache-type breakdown, data model compilation
  wait time, request mix by API type, and an auth/build errors feed.

It is a companion to a Cube.js deployment, not a Cube.js deployment itself.
It talks to `cube_api` (REST/system API) and Cube Store (MySQL wire
protocol) over the internal network of whatever stack deploys it, and
receives a stream of query/cache/error events forwarded by that stack's
`cube.js` custom `logger` (see **Getting started**, step 4, below). See
**Getting started** for adding it to your own Cube.js docker-compose.yml
using the public image.

Built with [Encore.ts](https://encore.dev/docs/ts). No external database or
cache dependency: history is persisted with Node's built-in `node:sqlite`
to a local file, deliberately chosen over any native-addon driver so
`encore build docker` can cross-compile cleanly for `linux/amd64` from an
arm64 dev machine.

## Getting started

Four steps: add the service, add its secrets, tell your existing `cube_api`
where to send events, then paste in the code that actually sends them.

### 1. Add the service

Add this to your existing Cube.js `docker-compose.yml`, alongside your
`cube_api`/`cubestore` services:

```yaml
cubejs_cockpit:
  image: ghcr.io/guik/cubejs-cockpit:latest
  ports:
    - "9080:8080"
  networks:
    default:
      aliases: [${COCKPIT_ALIAS:-cube_cockpit}]
  environment:
    - CUBE_API_INTERNAL_URL=http://cube_api:4000
    - CUBESTORE_HOST=cubestore
    - CUBEJS_API_SECRET=${CUBEJS_API_SECRET}
    - CUBEJS_PLAYGROUND_AUTH_SECRET=${CUBEJS_PLAYGROUND_AUTH_SECRET}
  volumes:
    - ./schema:/app/schema:ro
    - ./.dashboard-data:/app/data
  depends_on:
    - cube_api
    - cubestore
```

Adjust `./schema` if your `cube_api` loads its schema from a different
path -- it must point at the exact same directory, so the dashboard shows
what's actually deployed, not a copy. `${COCKPIT_ALIAS:-cube_cockpit}`
already defaults to `cube_cockpit`, so you can skip the `.env` entry below
unless you want a different name.

### 2. Add its secrets to `.env`

```bash
CUBEJS_API_SECRET=...              # same value your cube_api already uses
CUBEJS_PLAYGROUND_AUTH_SECRET=...  # same value your cube_api already uses
COCKPIT_ALIAS=cube_cockpit         # optional -- only if you don't want the default name
```

`CUBEJS_API_SECRET`/`CUBEJS_PLAYGROUND_AUTH_SECRET` must be copied from
your existing `cube_api` config, not invented fresh -- see the
**Configuration** table below for what each one does.

### 3. Point `cube_api` at it

Add these three lines to your **existing** `cube_api` service's
`environment:` (and to `cube_refresh_worker` too, if you run one):

```yaml
- QUERY_HISTORY_INGEST_URL=http://${COCKPIT_ALIAS:-cube_cockpit}:8080/api/query-history/ingest
- PERFORMANCE_INGEST_URL=http://${COCKPIT_ALIAS:-cube_cockpit}:8080/api/performance/compile-ingest
- PERFORMANCE_ERROR_INGEST_URL=http://${COCKPIT_ALIAS:-cube_cockpit}:8080/api/performance/error-ingest
```

### 4. Wire up your `cube.js`

This is the part that actually sends the events -- without it, steps 1-3
just stand up a dashboard with nothing to show. Paste this block into your
`cube.js` config file (the one your `cube_api`/`cube_refresh_worker`
containers already mount), near the top:

```js
// --- cubejs-cockpit event forwarding --------------------------------------
const QUERY_HISTORY_INGEST_URL = process.env.QUERY_HISTORY_INGEST_URL;
const PERFORMANCE_INGEST_URL = process.env.PERFORMANCE_INGEST_URL;
const PERFORMANCE_ERROR_INGEST_URL = process.env.PERFORMANCE_ERROR_INGEST_URL;

const QUERY_HISTORY_EVENT_TYPES = new Set([
  'Load Request Success', 'Orchestrator error', 'Internal Server Error',
  'UserError', 'Continue wait', 'Slow Query Warning', 'Load Request SQL',
  'Found in memory cache entry', 'Using cache for',
]);
const COMPILE_EVENT_TYPES = new Set(['Compiling schema completed', 'Compiling schema error']);
const ERROR_EVENT_TYPES = new Set(['Pre-aggregations build job error']);

// Every catch branch that logs an auth failure also logs the raw token --
// never forward params.error verbatim for these without checking this first.
function isAuthFailureEvent(params) {
  return !!params && Object.prototype.hasOwnProperty.call(params, 'token');
}

// Fire-and-forget with a short timeout: a slow/unreachable dashboard must
// never add latency or failure risk to a real Cube query.
function post(url, body) {
  if (!url) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).catch(() => {}).finally(() => clearTimeout(timeoutId));
}

function forwardToQueryHistory(type, params) {
  const sc = params.securityContext || {};
  const preAggregationsUsed =
    type === 'Load Request SQL' && params.sqlQuery
      ? (params.sqlQuery.preAggregations || []).map((p) => ({ id: p.preAggregationId, tableName: p.tableName }))
      : undefined;
  post(QUERY_HISTORY_INGEST_URL, {
    requestId: params.requestId,
    type,
    durationMs: params.duration,
    apiType: params.apiType,
    organisationId: sc.organisation_id != null ? String(sc.organisation_id) : undefined,
    userId: sc.user_id != null ? String(sc.user_id) : undefined,
    securityContext: Object.keys(sc).length ? sc : undefined,
    query: params.query,
    error: params.error,
    preAggregationsUsed,
    servedStaleCache: type === 'Slow Query Warning' ? true : undefined,
  });
}

function forwardToPerformance(type, params) {
  post(PERFORMANCE_INGEST_URL, {
    requestId: params.requestId, type, durationMs: params.duration, error: params.error,
  });
}

function forwardErrorEvent(kind, type, params) {
  post(PERFORMANCE_ERROR_INGEST_URL, {
    kind, type, requestId: params.requestId,
    context: params.preAggregation ? JSON.stringify(params.preAggregation) : undefined,
    error: params.error ? String(params.error) : undefined, // never params.token
  });
}

// Call this from your `logger`, below.
function forwardCubeEvents(message, params) {
  if (QUERY_HISTORY_EVENT_TYPES.has(message)) forwardToQueryHistory(message, params || {});
  if (isAuthFailureEvent(params)) forwardErrorEvent('auth', message, params);
  else if (ERROR_EVENT_TYPES.has(message)) forwardErrorEvent('preagg-build', message, params);
  if (COMPILE_EVENT_TYPES.has(message)) forwardToPerformance(message, params || {});
}
// --- end cubejs-cockpit event forwarding ----------------------------------
```

Then call it from `module.exports.logger`:

```js
module.exports = {
  // ...your existing config (queryRewrite, http.cors, etc.) stays as-is...
  logger: (message, params) => {
    forwardCubeEvents(message, params); // add this one line
    // ...if you already log to the console here, keep doing that too...
  },
};
```

Redeploy (`docker compose up -d`), then open `http://<host>:9080` -- query
history and performance data start appearing as soon as Cube handles its
next request.

## Configuration

All configuration is environment variables (this app is deployed via
docker-compose alongside the rest of the Cube stack, not Encore Cloud, so
it reads plain `process.env` rather than Encore's secrets manager):

| Variable | Default | Used by |
| --- | --- | --- |
| `CUBE_API_INTERNAL_URL` | `http://cube_api:4000` | `datamodel`, `preaggregations` -- internal URL of the Cube API container. |
| `CUBEJS_API_SECRET` | *(required)* | Signs short-lived HS512 tokens for `/cubejs-api/v1/*` calls. Must match the Cube deployment's own secret. |
| `CUBEJS_PLAYGROUND_AUTH_SECRET` | *(required)* | Signs HS256 tokens for `/cubejs-system/v1/*` calls (pre-aggregation status/partitions). Bypasses the deployment's `queryRewrite` row-level filtering -- treat like a credential. |
| `CUBESTORE_HOST` | `cubestore` | `preaggregations` -- Cube Store's internal hostname. |
| `CUBESTORE_PORT` | `3306` | Cube Store's MySQL wire-protocol port. |
| `SCHEMA_DIR` | `/app/schema` | `datamodel` -- read-only mount of the deployment's schema source. |
| `QUERY_HISTORY_DB_PATH` | `/app/data/query-history.db` | `queryhistory`'s SQLite file. |
| `PERFORMANCE_DB_PATH` | `/app/data/performance.db` | `performance`'s SQLite file. |
| `QUERY_HISTORY_RETENTION_DAYS` | `30` | Row retention for both `queryhistory` and `performance`; pruned on each ingest. |


## Development

### Services

| Service | Purpose |
| --- | --- |
| `datamodel` | Live cube/measure/dimension metadata from `/cubejs-api/v1/meta`, plus the raw schema source files. |
| `preaggregations` | Pre-aggregation partition status and build history, read from Cube Store's `system.*` tables. |
| `queryhistory` | Ingests and serves per-query history: duration, status, cache type, pre-aggregations used, security context. |
| `performance` | Data model compilation timing and a recent-errors feed (auth failures, pre-aggregation build job errors). |
| `frontend` | The single-page dashboard UI (embedded HTML/CSS/JS, no build step, no external UI framework). |
| `shared` | Internal helpers: Cube API token minting/fetch, Cube Store queries, schema file reads. |

### API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/model/meta` | Live cube/measure/dimension metadata. |
| GET | `/api/model/files` | Raw schema source files. |
| GET | `/api/pre-aggregations` | Pre-aggregation list. |
| GET | `/api/pre-aggregations/partitions` | Per-partition detail. |
| GET | `/api/pre-aggregations/build-history` | Rebuild timeline from Cube Store. |
| POST | `/api/query-history/ingest` | Receives one query-lifecycle event from Cube.js. |
| GET | `/api/query-history` | Filterable/paginated query list. |
| GET | `/api/query-history/detail` | Full stored detail for one query. |
| GET | `/api/query-history/stats` | Time-bucketed count/duration/error-count. |
| GET | `/api/query-history/cache-stats` | Time-bucketed count/duration by cache type. |
| GET | `/api/query-history/api-type-stats` | Time-bucketed count by API type. |
| GET | `/api/query-history/stale-cache-stats` | Time-bucketed stale-cache-served rate. |
| POST | `/api/performance/compile-ingest` | Receives one schema-compilation event. |
| GET | `/api/performance/compile-stats` | Time-bucketed compilation count/wait-time. |
| POST | `/api/performance/error-ingest` | Receives one auth-failure or pre-agg build-job-error event. |
| GET | `/api/performance/error-stats` | Time-bucketed error count by kind. |

None of these endpoints authenticate callers beyond network reachability --
they're meant to sit behind the same private network boundary as the rest
of the Cube stack (never exposed on a public interface), the same trust
model Cube Store's own unauthenticated MySQL port already relies on.

### Running locally

Requires Node 22.5+ (for the built-in `node:sqlite` module) and the
[Encore CLI](https://encore.dev/docs/ts/install).

```bash
npm install
encore run
```

Open <http://localhost:9400/> for Encore's local dev dashboard, or
<http://localhost:4000/> for the app itself. Local SQLite files default to
`/app/data/*.db`, which won't exist on a dev machine outside the container
image -- point them somewhere writable:

```bash
QUERY_HISTORY_DB_PATH=/tmp/dashboard-data/query-history.db \
PERFORMANCE_DB_PATH=/tmp/dashboard-data/performance.db \
encore run
```

Without a reachable `cube_api`/Cube Store, the data-model and
pre-aggregation views will error on load -- that's expected when running
standalone; the query history and performance views work fine against
data posted directly to their ingest endpoints (see **API** above).


## Building your own image

Most deployments don't need this -- pull `ghcr.io/guik/cubejs-cockpit:latest`
as described in **Getting started** above. Build locally instead
if you're testing an unreleased change, working offline/air-gapped, or
maintaining a fork:

```bash
./scripts/build.sh                        # builds cubejs-cockpit:latest
./scripts/build.sh cubejs-cockpit:2026-01-01   # custom tag
```

Wraps `encore build docker`, cross-compiling for `linux/amd64` regardless
of the build machine's architecture. Load the resulting image on the
target host (`docker save | ssh host docker load`, or push to a registry),
then point your compose file's `cubejs_cockpit` service at it instead of
the `ghcr.io` tag.

There is no hand-written `Dockerfile`: Encore's own compiler is the build
system for a TypeScript Encore app -- `encore build docker` compiles the
app, embeds Encore's native runtime binding, and produces the image
directly, in one step it doesn't expose a way to split into "compile" and
"package" stages. A conventional multi-stage Dockerfile can't reproduce
that without reimplementing Encore's own compiler, so `scripts/build.sh`
(wrapping the CLI) is the actual build step, not a placeholder for one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, expectations
before opening a PR, and project scope/style notes. Please read
[SECURITY.md](SECURITY.md) before deploying this anywhere -- several of
its endpoints and config values need to be treated as sensitive.

## License

[MIT](LICENSE)
