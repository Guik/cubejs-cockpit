// Talks to the self-hosted cube_api container over the internal docker
// network. Auth is minted here, per-request, from secrets read out of
// process.env -- same in-process signing scripts/mint-token-docker.sh
// does at the repo root, just done here so no long-lived token needs
// storing anywhere.
//
// Deliberately reads secrets straight from process.env rather than
// Encore's secret() API: this app is self-hosted via docker-compose like
// every other service in this stack, and gets its config the same way
// they do -- through environment variables, not Encore's platform-backed
// secrets manager (which assumes an Encore Cloud-linked deployment).
import { createHmac } from "node:crypto";

const CUBE_API_INTERNAL_URL =
  process.env.CUBE_API_INTERNAL_URL || "http://cube_api:4000";

function b64url(input: object | Buffer): string {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(JSON.stringify(input));
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(payload: object, secret: string, alg: "HS512" | "HS256"): string {
  const header = b64url({ typ: "JWT", alg });
  const encodedPayload = b64url(payload);
  const sig = createHmac(alg === "HS512" ? "sha512" : "sha256", secret)
    .update(`${header}.${encodedPayload}`)
    .digest();
  return `${header}.${encodedPayload}.${b64url(sig)}`;
}

// Mints a short-lived JWT for the regular /cubejs-api/v1/* endpoints.
// user_id/organisation_id are required by this project's queryRewrite
// (cube.js, in the sibling git_cube repo) but /v1/meta doesn't apply
// row-level filtering, so the placeholder 0/0 default works fine there --
// this is the shape every existing caller (fetchMeta) relies on, never
// used to run a real tenant's query.
//
// securityContext lets a caller mint a token scoped to a REAL tenant
// instead, for the one caller that actually runs a data query:
// runIntegrityCheck below. queryRewrite rejects the query outright if
// either claim is falsy (`!securityContext.user_id` / `!organisation_id`,
// confirmed by reading cube.js directly) and otherwise unconditionally
// filters every query to that organisation_id -- so the placeholder
// would silently compare two empty/wrong result sets rather than the
// tenant's actual data. Minting with a real context is the same trust
// boundary as any real end-user token for that org, not a queryRewrite
// bypass (unlike mintSystemToken below).
export function mintApiToken(
  ttlSeconds = 300,
  securityContext?: { user_id: number; organisation_id: number }
): string {
  const secret = process.env.CUBEJS_API_SECRET;
  if (!secret) {
    throw new Error("CUBEJS_API_SECRET is not set for the dashboard service");
  }
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      iat: now,
      iss: "cubejs-cockpit",
      nbf: now,
      exp: now + ttlSeconds,
      user_id: securityContext?.user_id ?? 0,
      organisation_id: securityContext?.organisation_id ?? 0,
    },
    secret,
    "HS512"
  );
}

// The /cubejs-system/v1/* routes verify a JWT signed with
// CUBEJS_PLAYGROUND_AUTH_SECRET as an HS256 key (createCheckAuthSystemFn
// in gateway.js) -- NOT the raw secret as a bearer token, and no
// user_id/organisation_id claim is required. Confirmed against the live
// deployment: a bare `Authorization: <secret>` header gets "Invalid
// token" (403); a minimal {iat, exp} JWT signed HS256 with the secret
// works. This bypasses queryRewrite's organisation_id filter entirely
// (see the warning on CUBEJS_PLAYGROUND_AUTH_SECRET in env.example) --
// never expose this secret, or a token minted from it, to the frontend;
// only this backend holds it and mints short-lived tokens per request.
function mintSystemToken(ttlSeconds = 300): string {
  const secret = process.env.CUBEJS_PLAYGROUND_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CUBEJS_PLAYGROUND_AUTH_SECRET is not set -- the /cubejs-system/* " +
        "routes aren't even registered on cube_api without it. Set it in " +
        ".env and restart cube_api first."
    );
  }
  const now = Math.floor(Date.now() / 1000);
  return signJwt({ iat: now, exp: now + ttlSeconds }, secret, "HS256");
}

async function request(
  path: string,
  { method = "GET", token, body }: { method?: string; token: string; body?: unknown }
): Promise<unknown> {
  const res = await fetch(`${CUBE_API_INTERNAL_URL}${path}`, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `cube_api ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }
  if (!res.ok) {
    const message =
      (json as { error?: string })?.error || `HTTP ${res.status}`;
    throw new Error(`cube_api ${path} failed: ${message}`);
  }
  return json;
}

export function fetchMeta(): Promise<unknown> {
  return request("/cubejs-api/v1/meta", { token: mintApiToken() });
}

interface PreAggregationsListResponse {
  preAggregations: { id: string }[];
}

export function fetchPreAggregationsList(): Promise<PreAggregationsListResponse> {
  return request("/cubejs-system/v1/pre-aggregations", {
    token: mintSystemToken(),
  }) as Promise<PreAggregationsListResponse>;
}

// expand: which detail levels to include per partition, mirroring the
// gateway.js checkExpand() options (see the plan's source-code notes).
// The `preAggregations` selector is required -- omitting it 500s
// ("Cannot read properties of undefined (reading 'reduce')"), confirmed
// live -- so the defined pre-aggregation IDs are fetched first rather
// than hard-coded, so this keeps working as the schema evolves.
export async function fetchPreAggregationPartitions(): Promise<unknown> {
  const { preAggregations } = await fetchPreAggregationsList();
  return request("/cubejs-system/v1/pre-aggregations/partitions", {
    method: "POST",
    token: mintSystemToken(),
    body: {
      query: {
        timezones: ["UTC"],
        preAggregations: preAggregations.map((p) => ({ id: p.id })),
        expand: ["partitions.details", "partitions.meta", "partitions.versions"],
      },
    },
  });
}

// Triggers an async rebuild job for one partition's date range via
// POST /cubejs-api/v1/pre-aggregations/jobs (action: "post") -- NOT
// /cubejs-system/v1/pre-aggregations/build, which needs a full raw Cube
// query object and has no polling story of its own. This route is
// registered under the regular basePath ('/cubejs-api') with
// userMiddlewares, confirmed live in gateway.js -- NOT systemMiddlewares
// like every other /cubejs-system/* call in this file -- so it's
// mintApiToken() here, not mintSystemToken().
//
// selector.contexts[].securityContext is required by the endpoint's own
// Joi schema but doesn't affect which data actually gets built: this
// project's schema/*.js never references SECURITY_CONTEXT (confirmed:
// zero matches), tenant filtering only ever happens in queryRewrite at
// query time. A fixed placeholder context is safe here, same idea as
// mintApiToken's own placeholder claims below.
//
// dateRange must be scoped to the ONE partition being rebuilt (e.g. its
// own buildRangeStart/buildRangeEnd from fetchPreAggregationPartitions,
// not the pre-aggregation's full history) -- omitting it rebuilds every
// partition in range, a real, costly full Athena rescan triggered from
// what looks like a single row's button.
export async function triggerPreAggregationBuild(params: {
  preAggregationId: string;
  dateRange: [string, string];
  dataSource?: string;
  timezone?: string;
}): Promise<string[]> {
  const cubeName = params.preAggregationId.split(".")[0];
  const result = await request("/cubejs-api/v1/pre-aggregations/jobs", {
    method: "POST",
    token: mintApiToken(),
    body: {
      action: "post",
      selector: {
        contexts: [{ securityContext: { user_id: 0, organisation_id: 0 } }],
        timezones: [params.timezone || "UTC"],
        dataSources: params.dataSource ? [params.dataSource] : undefined,
        cubes: [cubeName],
        preAggregations: [params.preAggregationId],
        dateRange: params.dateRange,
      },
    },
  });
  return result as string[];
}

export interface RebuildJobStatus {
  token: string;
  table?: string;
  status: string;
}

// Polls previously-triggered job tokens -- same endpoint as
// triggerPreAggregationBuild, action: "get" instead of "post". `status`
// is a free-form string from Cube's refresh scheduler/queue (queued/
// in-progress states, or 'done'/one of the 'failure*' variants once
// settled) rather than a fixed enum -- confirmed live values aren't
// exhaustively documented in gateway.js, so callers should treat
// anything starting with 'done' or 'failure' as terminal and everything
// else as still in progress, matching gateway.js's own check.
export async function fetchRebuildJobStatus(tokens: string[]): Promise<RebuildJobStatus[]> {
  const result = await request("/cubejs-api/v1/pre-aggregations/jobs", {
    method: "POST",
    token: mintApiToken(),
    body: { action: "get", tokens },
  });
  return result as RebuildJobStatus[];
}

// Sums one granularity's worth of results for each measure. Cube's own
// /v1/load response keys each row by fully-qualified field name
// ("Cube.measure") and returns measure values as JSON strings for large
// sums (precision) -- Number() handles both that and the plain-number
// case. Missing/non-finite values are skipped rather than coerced to 0,
// so a genuinely absent value doesn't masquerade as a real zero.
async function loadGranularityTotals(
  measures: string[],
  timeDimension: string,
  dateRange: [string, string],
  granularity: "day" | "hour",
  securityContext: { user_id: number; organisation_id: number }
): Promise<Record<string, number | null>> {
  const result = (await request("/cubejs-api/v1/load", {
    method: "POST",
    token: mintApiToken(300, securityContext),
    body: {
      query: {
        measures,
        timeDimensions: [{ dimension: timeDimension, granularity, dateRange }],
      },
    },
  })) as { data?: Record<string, string | number | null>[] };

  const totals: Record<string, number | null> = {};
  for (const m of measures) totals[m] = null;
  for (const row of result.data || []) {
    for (const m of measures) {
      const raw = row[m];
      if (raw === undefined || raw === null) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      totals[m] = (totals[m] ?? 0) + n;
    }
  }
  return totals;
}

export interface IntegrityCheckMeasureResult {
  measure: string;
  rollupTotal: number | null;
  sourceTotal: number | null;
}

// Productizes this week's manual diagnostic (see the plan): the same
// measures/time dimension/date range/tenant, queried twice through
// Cube's stable, publicly documented /cubejs-api/v1/load -- 'day'
// granularity (routes through a covering rollup pre-aggregation when one
// exists) vs 'hour' (finer than any rollup this schema defines, so Cube
// always falls back to source). A mismatch between the two totals for
// the same measure is exactly the silent-failure signal both of this
// week's incidents needed a manual curl comparison to find.
//
// securityContext must be a REAL tenant's {user_id, organisation_id} --
// see mintApiToken's comment above for why a placeholder would silently
// compare two empty/wrong result sets instead of real data.
export async function runIntegrityCheck(params: {
  measures: string[];
  timeDimension: string;
  dateRange: [string, string];
  securityContext: { user_id: number; organisation_id: number };
}): Promise<IntegrityCheckMeasureResult[]> {
  const [rollup, source] = await Promise.all([
    loadGranularityTotals(params.measures, params.timeDimension, params.dateRange, "day", params.securityContext),
    loadGranularityTotals(params.measures, params.timeDimension, params.dateRange, "hour", params.securityContext),
  ]);
  return params.measures.map((m) => ({
    measure: m,
    rollupTotal: rollup[m] ?? null,
    sourceTotal: source[m] ?? null,
  }));
}
