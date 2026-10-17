/**
 * What "a surprise inside" (GiftData.unwrap) may point at, written without zod so the pages that
 * build one (/plan, a trip) can check their own work without bringing 85 KB of schema library
 * along. The gift schema (./schema) enforces the same rules on everything it saves.
 *
 * Pictures come from an allow-list and nowhere else. A gift is opened by somebody who never
 * agreed to anything, so an image URL is a request made in their name: Wikimedia's two image
 * hosts (what the dates map's photographs are) and pictures this site serves itself are the only
 * places a gift may send it. The CSP allows the same two hosts.
 */
export const UNWRAP_IMAGE_HOSTS = ["https://upload.wikimedia.org/", "https://thumb.wikimedia.org/"] as const;
export const UNWRAP_IMAGE_PATHS = ["/dates/", "/trips/", "/templates/"] as const;

export const UNWRAP_LIMITS = {
  title: 80,
  when: 40,
  city: 60,
  stops: 8,
  stopName: 80,
  stopKind: 30,
  stopNote: 140,
  place: 60,
  nights: 60,
  image: 600,
  link: 8200,
} as const;

/**
 * Characters no honest picture URL has. Parentheses and apostrophes stay allowed: Commons file
 * names are full of them ("Torre_de_Belém_(Lisboa).jpg").
 */
const UNSAFE = /[\s"<>\\`]/;
/** A way out of the folder a site path names ("/dates/../api/…"), written plainly or escaped. */
const CLIMB = /\.\.|%2e/i;

export function isUnwrapImage(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0 || url.length > UNWRAP_LIMITS.image || UNSAFE.test(url)) return false;
  if (UNWRAP_IMAGE_HOSTS.some((host) => url.startsWith(host))) return true;
  // A site path, and never a protocol-relative "//elsewhere": the prefixes all start with one slash and a name.
  return UNWRAP_IMAGE_PATHS.some((path) => url.startsWith(path)) && !CLIMB.test(url) && !url.includes("?");
}

/** The plan's own share link (the plan rides after the #, as /plan writes it) or one of the preset trips. */
const PLAN_LINK = /^(?:\/es)?\/plan#p=[A-Za-z0-9_-]{1,8000}$/;
const TRIP_LINK = /^(?:\/es)?\/trips\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isUnwrapLink(url: unknown): url is string {
  return typeof url === "string" && url.length <= UNWRAP_LIMITS.link && (PLAN_LINK.test(url) || TRIP_LINK.test(url));
}

export const UNWRAP_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day as YYYY-MM-DD: 2026-02-30 is not one. */
export function isUnwrapDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = YMD.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** Clipped to `max` characters with an ellipsis, so a long name still fits the schema rather than failing it. */
export const clipText = (s: string, max: number): string => {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
