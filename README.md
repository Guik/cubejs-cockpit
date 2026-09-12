# cubejs-cockpit

Self-hosted operations dashboard for a Cube.js / Cube Core deployment: the
data model actually running (not just what a schema file is assumed to
say), pre-aggregation status and build history, a persistent query history
with cache/pre-aggregation attribution, and a Performance view (cache-type
breakdown, data model compilation wait time, request mix, auth/build
errors).

It is a companion to a Cube.js deployment, not a Cube.js deployment itself.
It talks to `cube_api` (REST/system API) and Cube Store (MySQL wire
protocol) over the internal network of whatever stack deploys it, and
receives a stream of query/cache/error events forwarded by that stack's
`cube.js` custom `logger` (see **Integrating with Cube.js** below). See
**Getting started** for adding it to your own Cube.js docker-compose.yml
using the public image.

Built with [Encore.ts](https://encore.dev/docs/ts). No external database or
cache dependency: history is persisted with Node's built-in `node:sqlite`
to a local file, deliberately chosen over any native-addon driver so
`encore build docker` can cross-compile cleanly for `linux/amd64` from an
arm64 dev machine.

## Getting started

Add a `cubejs_cockpit` service to your existing Cube.js docker-compose.yml,
pointing at the public image:

```yaml
cubejs_cockpit:
  image: ghcr.io/guik/cubejs-cockpit:latest
  ports:
    - "9080:8080"
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

See [docker-compose.yml](docker-compose.yml) in this repo for the full
reference (including `cube_api`/`cubestore` for context and the exact
env var list). Three things to get right:

- `CUBEJS_API_SECRET` and `CUBEJS_PLAYGROUND_AUTH_SECRET` must match your
  deployment's own secrets exactly.
- The `./schema` volume must point at the same directory your `cube_api`
  loads its schema from -- that's what lets the data-model view reflect
  what's actually deployed, not a copy.
- Add the three `QUERY_HISTORY_*`/`PERFORMANCE_*` ingest env vars to your
  real `cube_api` service (see **Integrating with Cube.js** below for
  exactly what those forward).

The image is published automatically by this repo's own GitHub Actions on
every push to `main` (`:latest`) and version tag (`:vX.Y.Z`) -- see
[.github/workflows/docker.yml](.github/workflows/docker.yml). No local
build is required; see **Building your own image** below if you want one
anyway. Cube Store's port and this dashboard's port should both stay
bound to a private address, not `0.0.0.0` -- see [SECURITY.md](SECURITY.md).

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

## Integrating with Cube.js

The `cube.js` side of the **Getting started** wiring above, in detail.

This dashboard is a passive receiver: nothing here talks back into Cube's
request path. The Cube.js side needs a custom `logger` in its `cube.js`
config that forwards specific events, fire-and-forget, to this app's
ingest endpoints -- see the events list in `queryhistory/db.ts` and
`performance/db.ts`'s header comments for exactly which event types and
shapes each endpoint expects. At minimum, point these env vars at wherever
this app is reachable from the Cube containers:

- `QUERY_HISTORY_INGEST_URL` &rarr; `POST /api/query-history/ingest`
- `PERFORMANCE_INGEST_URL` &rarr; `POST /api/performance/compile-ingest`
- `PERFORMANCE_ERROR_INGEST_URL` &rarr; `POST /api/performance/error-ingest`

A forwarder that can't reach this app (down, slow, unreachable) must never
add latency or failure risk to a real Cube query -- every forwarder on the
Cube.js side should be a non-awaited `fetch()` with a short timeout, per
the pattern already established there.

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
then point `docker-compose.yml`'s `cubejs_cockpit.image` at it instead of
the `ghcr.io` tag.

There is no hand-written `Dockerfile`: Encore's own compiler is the build
system for a TypeScript Encore app -- `encore build docker` compiles the
app, embeds Encore's native runtime binding, and produces the image
directly, in one step it doesn't expose a way to split into "compile" and
"package" stages. A conventional multi-stage Dockerfile can't reproduce
that without reimplementing Encore's own compiler, so `scripts/build.sh`
(wrapping the CLI) is the actual build step, not a placeholder for one.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, expectations
before opening a PR, and project scope/style notes. Please read
[SECURITY.md](SECURITY.md) before deploying this anywhere -- several of
its endpoints and config values need to be treated as sensitive.

## License

[MIT](LICENSE)
