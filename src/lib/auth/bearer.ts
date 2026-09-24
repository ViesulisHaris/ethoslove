/**
 * The iPhone app signs its API requests with the user's Supabase access token, as
 * `Authorization: Bearer <jwt>`, instead of the cookies a browser carries. Only a JWT's shape is
 * accepted here (three base64url parts): anything else, such as the cron routes' shared secret or
 * a stray "Basic" header, is not a Supabase token and leaves the request to its cookies. Browsers
 * never send this header on their own, so accepting it adds no cross-site way in.
 */
const BEARER = /^Bearer[ \t]+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)[ \t]*$/i;
/** A Supabase access token is well under 2 KB; a header far past that is not one. */
const MAX_TOKEN_CHARS = 8192;

export function parseBearer(header: string | null | undefined): string | null {
  if (!header || header.length > MAX_TOKEN_CHARS + 16) return null;
  return BEARER.exec(header)?.[1] ?? null;
}

type Claims = { iat?: unknown; exp?: unknown; sub?: unknown };

/**
 * The payload of a JWT, read without checking its signature. Only for claims of a token that
 * Supabase has already validated (getUser), such as when it was issued.
 */
export function jwtClaims(token: string): Claims | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as unknown;
    return json && typeof json === "object" && !Array.isArray(json) ? (json as Claims) : null;
  } catch {
    return null;
  }
}

/** How recent a token must be to be turned into something longer-lived (a web session, a deletion). */
export const FRESH_TOKEN_SECONDS = 10 * 60;

/**
 * Whether a validated token was issued within the last ten minutes. A leaked one-hour access token
 * must not be enough to mint a long-lived web session or delete the account: the app refreshes its
 * session right before those calls, so a real request always carries a token seconds old. A little
 * clock skew the other way (issued "in the future") is allowed.
 */
export function isFreshToken(token: string, nowMs: number, maxAgeSeconds = FRESH_TOKEN_SECONDS): boolean {
  const iat = jwtClaims(token)?.iat;
  if (typeof iat !== "number" || !Number.isFinite(iat)) return false;
  const age = nowMs / 1000 - iat;
  return age <= maxAgeSeconds && age >= -60;
}
