# Security

## Reporting a vulnerability

Please report security issues privately by emailing **git@guik.fr** rather
than opening a public issue. Include what you found, how to reproduce it,
and its potential impact. You should get a response within a few days.

## Trust model (read this before deploying)

This dashboard is designed to sit entirely inside the private network
boundary of a Cube.js/Cube Core deployment, alongside `cube_api` and Cube
Store -- it is **not** meant to be exposed on a public interface. A few
specifics worth being deliberate about:

- None of the ingest/read API endpoints authenticate callers beyond
  network reachability (see the README's **API** section). This mirrors
  the trust model Cube Store's own unauthenticated MySQL wire protocol
  already relies on.
- `CUBEJS_PLAYGROUND_AUTH_SECRET` mints tokens that bypass the Cube
  deployment's `queryRewrite` row-level security. Treat it like a
  credential, not a config value -- same handling as `CUBEJS_API_SECRET`.
- The `datamodel` and `preaggregations` views expose schema source and
  pre-aggregation metadata, which may itself be sensitive depending on
  your data model's naming.

If you need to reach this dashboard from outside that private network
(e.g. a remote ops team), put a real authenticating proxy in front of it --
don't add ad hoc auth here that could drift out of sync with the actual
Cube deployment's own access model.
