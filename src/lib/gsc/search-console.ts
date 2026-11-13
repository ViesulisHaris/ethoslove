import { createHash, createSign, timingSafeEqual } from "node:crypto";

/**
 * Google Search Console, read-only, for the cloud SEO routines (docs/blog/SEO-AGENT.md): the
 * searches tryethos.io already appears for, with impressions, clicks, click rate and average
 * position, straight from Google. The routines can't sign in to Search Console, so the site asks
 * on their behalf with a service account the owner added to the property as a restricted user,
 * and /api/internal/gsc hands the rows to whoever holds GSC_EXPORT_KEY.
 */

/** The two fields of the service account's JSON key that the token request needs. */
export type ServiceAccount = { client_email: string; private_key: string };

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://searchconsole.googleapis.com/webmasters/v3/sites";

export class GscError extends Error {
  constructor(
    readonly code: "token" | "query",
    readonly status: number,
  ) {
    super(`search console ${code} failed (${status})`);
  }
}

/** The service account from GSC_SERVICE_ACCOUNT_JSON (the whole key file), or null if it isn't one. */
export function parseServiceAccount(json: string | undefined): ServiceAccount | null {
  if (!json) return null;
  try {
    const sa = JSON.parse(json) as Partial<ServiceAccount>;
    if (typeof sa.client_email !== "string" || !sa.client_email.includes("@")) return null;
    if (typeof sa.private_key !== "string" || !sa.private_key.includes("PRIVATE KEY")) return null;
    // Vercel keeps the key's line breaks; a value pasted as one line has them as "\n".
    return { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

/** Whether an Authorization header carries this key, compared in constant time. */
export function bearerMatches(header: string | null, key: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(header.slice(7)), hash(key));
}

const base64url = (value: string) => Buffer.from(value).toString("base64url");

/** The signed JWT that trades for an access token (Google's service-account flow, RS256). */
export function serviceAccountAssertion(sa: ServiceAccount, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({ iss: sa.client_email, scope: GSC_SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  return `${header}.${claim}.${signer.sign(sa.private_key).toString("base64url")}`;
}

let cached: { email: string; token: string; expires: number } | null = null;

/** A read-only access token, reused until a minute before it expires. */
export async function accessToken(sa: ServiceAccount, now = Date.now(), doFetch: typeof fetch = fetch): Promise<string> {
  if (cached && cached.email === sa.client_email && cached.expires - 60_000 > now) return cached.token;
  const res = await doFetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: serviceAccountAssertion(sa, Math.floor(now / 1000)) }),
  });
  if (!res.ok) throw new GscError("token", res.status);
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new GscError("token", 502);
  cached = { email: sa.client_email, token: body.access_token, expires: now + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Forget the cached token (tests). */
export function resetTokenCache(): void {
  cached = null;
}

export const GSC_DIMENSIONS = ["query", "page", "country", "device", "date"] as const;
export type GscDimension = (typeof GSC_DIMENSIONS)[number];

export type GscQuery = {
  startDate: string;
  endDate: string;
  dimensions: GscDimension[];
  rowLimit: number;
  startRow: number;
  /** Only rows whose page URL contains this (e.g. "/blog/monthiversary-ideas"). */
  page?: string;
  /** Only rows whose search contains this. */
  query?: string;
  /** ISO 3166-1 alpha-3, lower case, as Search Console writes it (usa, gbr, esp). */
  country?: string;
};

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const isDay = (s: string | null): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  // A 13th month parses to NaN; a 31 November rolls over to 1 December. Neither is that day.
  return !Number.isNaN(t) && isoDay(t) === s;
};

/**
 * The request from the URL's parameters: `days` (1–480, default 28) up to `end`, or `start` and
 * `end` (YYYY-MM-DD); `dimensions` (default "query,page"); `limit` (1–25000, default 5000);
 * `offset`; and the filters `page`, `query`, `country`. The default end is two days ago: Search
 * Console's last two days are still filling in, which would make a change look like a drop.
 */
export function parseGscQuery(params: URLSearchParams, now = Date.now()): GscQuery | { error: string } {
  const end = params.get("end");
  if (end !== null && !isDay(end)) return { error: "end must be YYYY-MM-DD" };
  const endDate = end ?? isoDay(now - 2 * DAY);
  const start = params.get("start");
  let startDate: string;
  if (start !== null) {
    if (!isDay(start)) return { error: "start must be YYYY-MM-DD" };
    if (start > endDate) return { error: "start is after end" };
    startDate = start;
  } else {
    const days = Number(params.get("days") ?? 28);
    if (!Number.isInteger(days) || days < 1 || days > 480) return { error: "days must be 1 to 480" };
    startDate = isoDay(Date.parse(`${endDate}T00:00:00Z`) - (days - 1) * DAY);
  }
  const dimensions = (params.get("dimensions") ?? "query,page").split(",").map((d) => d.trim()).filter(Boolean);
  if (dimensions.length === 0 || dimensions.length > 4) return { error: "one to four dimensions" };
  for (const d of dimensions) if (!(GSC_DIMENSIONS as readonly string[]).includes(d)) return { error: `unknown dimension ${d}` };
  const rowLimit = Number(params.get("limit") ?? 5000);
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 25000) return { error: "limit must be 1 to 25000" };
  const startRow = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(startRow) || startRow < 0) return { error: "offset must be 0 or more" };
  const filter = (key: string, max: number) => {
    const v = params.get(key)?.trim();
    return v ? v.slice(0, max) : undefined;
  };
  const country = filter("country", 3)?.toLowerCase();
  if (country !== undefined && !/^[a-z]{3}$/.test(country)) return { error: "country is three letters, like usa" };
  return { startDate, endDate, dimensions: dimensions as GscDimension[], rowLimit, startRow, page: filter("page", 300), query: filter("query", 200), country };
}

/** The body for searchAnalytics.query. */
export function gscRequestBody(q: GscQuery) {
  const filters = [
    ...(q.page ? [{ dimension: "page", operator: "contains", expression: q.page }] : []),
    ...(q.query ? [{ dimension: "query", operator: "contains", expression: q.query }] : []),
    ...(q.country ? [{ dimension: "country", operator: "equals", expression: q.country }] : []),
  ];
  return {
    startDate: q.startDate,
    endDate: q.endDate,
    dimensions: q.dimensions,
    rowLimit: q.rowLimit,
    startRow: q.startRow,
    type: "web",
    dataState: "all",
    ...(filters.length ? { dimensionFilterGroups: [{ groupType: "and", filters }] } : {}),
  };
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** The rows for one request, from the property `site` (e.g. "sc-domain:tryethos.io"). */
export async function searchAnalytics(site: string, q: GscQuery, token: string, doFetch: typeof fetch = fetch): Promise<GscRow[]> {
  const res = await doFetch(`${API}/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(gscRequestBody(q)),
  });
  if (!res.ok) throw new GscError("query", res.status);
  const body = (await res.json()) as { rows?: GscRow[] };
  return body.rows ?? [];
}
