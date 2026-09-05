# Contributing

Thanks for taking a look at this project. It's a small, self-hosted
companion app, so the bar for contributions is "does this make the
dashboard more useful or more correct for a real Cube deployment" -- not
every idea needs to fit, and that's fine.

## Getting set up

See the README's **Running locally** section. In short:

```bash
npm install
QUERY_HISTORY_DB_PATH=/tmp/dashboard-data/query-history.db \
PERFORMANCE_DB_PATH=/tmp/dashboard-data/performance.db \
encore run
```

You don't need a live Cube deployment to work on the `queryhistory` and
`performance` services -- you can `curl`/`POST` synthetic events straight
at their ingest endpoints (see the README's **API** table and the header
comments in `queryhistory/db.ts` / `performance/db.ts` for event shapes).
The `datamodel` and `preaggregations` views do need a reachable `cube_api`
and Cube Store.

## Before opening a PR

- `npm run typecheck` -- must pass cleanly.
- If you touched a view, check it in the browser against real or synthetic
  data, not just that it compiles.
- If you're changing what the dashboard expects from Cube.js's `logger`
  (event shapes, new ingest endpoints), update the README's
  **Integrating with Cube.js** section in the same PR.

## Scope and style

- No build step for the frontend, no external UI framework, no new runtime
  dependencies unless there's a real reason -- see the README's rationale
  for `node:sqlite` over a native-addon driver as the kind of tradeoff this
  project cares about (cross-compilation for `linux/amd64` from an arm64
  dev machine must keep working).
- This dashboard is a passive receiver: it should never add latency or
  failure risk to Cube's own request path. Anything that talks back into
  Cube's request handling is out of scope.
- Comments should explain *why*, not *what* -- match the existing style
  where a comment exists because a choice was non-obvious (e.g. why
  `node:sqlite` instead of `better-sqlite3`), not to restate the code.

## Reporting bugs / requesting features

Open an issue using the provided templates. For anything that might be a
security issue, see [SECURITY.md](SECURITY.md) instead of filing a public
issue.
