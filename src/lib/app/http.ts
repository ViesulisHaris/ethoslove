/**
 * Small pieces the /api/app routes share. Pure, so the tests can hold them to the contract in the
 * Ethos app's docs/ARCHITECTURE.md §2.6.
 */

/** Whether an If-None-Match header names this ETag (weak or strong, or "*"). */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const bare = etag.replace(/^W\//, "");
  return ifNoneMatch
    .split(",")
    .map((tag) => tag.trim().replace(/^W\//, ""))
    .some((tag) => tag === "*" || tag === bare);
}

/** A number from a query parameter, or null when it is missing or not a finite number. */
export function queryNumber(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export const appLocale = (params: URLSearchParams): "en" | "es" => (params.get("locale") === "es" ? "es" : "en");

/** Never cached, by the CDN or the phone: anything that answers for one person, or an error. */
export const NO_STORE = { "cache-control": "private, no-store" } as const;
