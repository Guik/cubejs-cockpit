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
// (cube.js) but /v1/meta doesn't apply row-level filtering, so any valid
// values work here -- this token is only ever used to ask "what does the
// data model look like", never to run a real tenant's query.
export function mintApiToken(ttlSeconds = 300): string {
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
      user_id: 0,
      organisation_id: 0,
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
