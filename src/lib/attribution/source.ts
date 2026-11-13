import { isAdTrackingOff } from "@/lib/analytics/consent";
import { BRAND } from "@/config/brand";

/**
 * Where a buyer first came from, as it is recorded with their checkout (`checkout_sources`,
 * migration 0019): the first page of the visit, the site that sent them, the link's utm tags and
 * which platform's click id it carried. Revenue is then split by landing page and by channel
 * (docs/marketing/REVENUE-BY-SOURCE.md), so the SEO work can follow the pages that sell.
 *
 * Shared by the browser (lib/attribution/first-visit.ts takes it down) and the server (which checks
 * it all again before storing anything, lib/attribution/checkout-source.ts). Nothing here can carry
 * a person, a gift or a secret: a path is kept only when every part of it is a plain slug, and a
 * private page (a gift, checkout, the dashboard, sign-in, a shared plan or trip) only by its section,
 * "/g"; a referrer only by its host name; a utm tag only in lower-case letters, digits, dots, dashes
 * and underscores, and never one that looks like an id; a click id only as the platform's name.
 */
export const CLICK_PLATFORMS = ["meta", "tiktok", "google", "microsoft", "pinterest"] as const;
export type ClickPlatform = (typeof CLICK_PLATFORMS)[number];

/** The four the revenue report splits by. */
export const CHANNELS = ["search", "tiktok_brand", "direct", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export type VisitSource = {
  /** The first page of the visit: "/", "/es/blog/…", "/g" for any gift, or OTHER_LANDING. */
  landing: string;
  /** The referring site's host ("google.com"), or an Android app's id ("com.zhiliaoapp.musically"). */
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  click?: ClickPlatform;
  /** When the first page was opened (ms). */
  at: number;
};

/** A first page whose path isn't plain slugs (a typo, an encoded character, something very long). */
export const OTHER_LANDING = "(other)";

const SEGMENT = /^[a-z0-9][a-z0-9_-]{0,80}$/;
const LANDING_MAX = 120;
/** Pages that say who or what someone is, on top of the ad pixels' list (lib/analytics/consent.ts). */
const PRIVATE_SECTIONS = ["/hug", "/auth", "/api"];
const under = (path: string, roots: readonly string[]) => roots.some((p) => path === p || path.startsWith(`${p}/`));

/** The path of a first page, as it may be stored: see the module comment. */
export function landingPath(pathname: string): string {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (!path.startsWith("/")) return OTHER_LANDING;
  // English has no prefix on the site; Spanish keeps its "/es", which is a page of its own.
  const bare = path.replace(/^\/en(?=\/|$)/, "") || "/";
  const prefix = /^\/es(?=\/|$)/.test(bare) ? "/es" : "";
  const rest = bare.slice(prefix.length) || "/";
  if (isAdTrackingOff(rest) || under(rest, PRIVATE_SECTIONS)) {
    const section = rest.split("/")[1];
    return SEGMENT.test(section) ? `${prefix}/${section}` : OTHER_LANDING;
  }
  if (rest === "/") return prefix || "/";
  const segments = rest.split("/").slice(1);
  const kept = `${prefix}${rest}`;
  return kept.length <= LANDING_MAX && segments.length <= 5 && segments.every((s) => SEGMENT.test(s)) ? kept : OTHER_LANDING;
}

/** A landing that came back from somewhere (the browser's storage, a request), made safe again. */
export function cleanLanding(value: string): string | undefined {
  if (value === OTHER_LANDING) return value;
  return value.startsWith("/") ? landingPath(value) : undefined;
}

const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const HOST_MAX = 100;

export function isHost(value: string): boolean {
  return value.length <= HOST_MAX && HOST.test(value);
}

/**
 * The referring site's host name, from `document.referrer`: nothing of its path or query. Android
 * apps send `android-app://<package>/`, which says which app (TikTok, Gmail, the Google app).
 */
export function referrerHost(referrer: string | null | undefined): string | undefined {
  if (!referrer) return undefined;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:" && url.protocol !== "android-app:") return undefined;
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  return isHost(host) ? host : undefined;
}

const UTM = /^[a-z0-9][a-z0-9._-]{0,59}$/;
/** A phone number, an order or customer number: not a campaign's name. */
const LONG_NUMBER = /\d{7,}/;
const UUID_LIKE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/;

/** A utm tag as it may be stored, or nothing. An email can't pass (no "@"), nor can an id. */
export function utmValue(raw: string | null | undefined): string | undefined {
  const value = raw?.trim().toLowerCase().replace(/[\s+]+/g, "-");
  if (!value || !UTM.test(value) || LONG_NUMBER.test(value) || UUID_LIKE.test(value)) return undefined;
  return value;
}

/** Which platform's click id the link carried. The id itself is never kept here. */
const CLICK_PARAMS: readonly [string, ClickPlatform][] = [
  ["ttclid", "tiktok"],
  ["fbclid", "meta"],
  ["gclid", "google"],
  ["gbraid", "google"],
  ["wbraid", "google"],
  ["msclkid", "microsoft"],
  ["epik", "pinterest"],
];

export function clickPlatform(params: URLSearchParams): ClickPlatform | undefined {
  return CLICK_PARAMS.find(([key]) => params.get(key))?.[1];
}

/** The visit as its first page sees it: the address it opened at and `document.referrer`. */
export function visitSource(location: { pathname: string; search: string }, referrer: string | null | undefined, now: number): VisitSource {
  const params = new URLSearchParams(location.search);
  const source: VisitSource = { landing: landingPath(location.pathname), at: now };
  const host = referrerHost(referrer);
  if (host) source.referrer = host;
  const utmSource = utmValue(params.get("utm_source"));
  const utmMedium = utmValue(params.get("utm_medium"));
  const utmCampaign = utmValue(params.get("utm_campaign"));
  if (utmSource) source.utmSource = utmSource;
  if (utmMedium) source.utmMedium = utmMedium;
  if (utmCampaign) source.utmCampaign = utmCampaign;
  const click = clickPlatform(params);
  if (click) source.click = click;
  return source;
}

/** What the channel is worked out from: the visit, plus the `?ref=` link checkout already sends. */
export type Classifiable = Omit<VisitSource, "at"> & { ref?: string };

/**
 * Our own site, and Stripe's page coming back: a first page reached from these is a reload or a
 * return, and where the visit really began was lost with the tab's memory. Counted as direct, the
 * way analytics tools count a referral from oneself.
 */
const INTERNAL = new RegExp(`(^|\\.)${BRAND.domain.replace(/\./g, "\\.")}$|^checkout\\.stripe\\.com$|^localhost$|^127\\.0\\.0\\.1$`);
const SEARCH =
  /^(?:google\.[a-z]{2,3}(?:\.[a-z]{2})?|(?:cn\.)?bing\.com|duckduckgo\.com|(?:[a-z]{2}\.)?search\.yahoo\.com|yahoo\.com|ecosia\.org|yandex\.[a-z]{2,3}|baidu\.com|search\.brave\.com|startpage\.com|qwant\.com|search\.naver\.com|seznam\.cz|com\.google\.android\.googlequicksearchbox)$/;
const TIKTOK = /(^|\.)tiktok\.com$|^com\.zhiliaoapp\.musically$|^com\.ss\.android\.ugc\.(?:trill|aweme)$/;
const PAID_MEDIUM = /^(?:cpc|ppc|paid|paid[-_]?search|paid[-_]?social|paidsocial|display|ads?)$/;
/** The home page, in either language: where a search for the name itself lands. */
const HOME = ["/", "/es"];

const externalReferrer = (s: Classifiable) => (s.referrer && !INTERNAL.test(s.referrer) ? s.referrer : undefined);

/**
 * The channel, first match wins:
 * - tiktok_brand: anything that says TikTok (a `tt-` bio link, a TikTok referrer, utm or click id),
 *   and a search that landed on the home page. TikTok viewers reach us by searching the name, since
 *   the carousels can't carry a link (docs/marketing/REVENUE-BY-SOURCE.md); Google hides the words
 *   searched, so landing on the home page is the sign of a search for "ethos" itself.
 * - search: a search engine that sent someone to any other page: the pages SEO works on.
 * - direct: nothing known: no referrer, tag, link or click id (typed in, a bookmark, many apps).
 * - other: everything else (other sites and apps, AI answers, email, ads, creators, gifts' links).
 */
export function channelOf(s: Classifiable): Channel {
  const referrer = externalReferrer(s);
  if (s.ref?.startsWith("tt-") || s.utmSource?.includes("tiktok") || s.click === "tiktok" || (referrer && TIKTOK.test(referrer))) return "tiktok_brand";
  if (referrer && SEARCH.test(referrer)) {
    // A search ad, not the results: not what SEO earns.
    if (s.click === "google" || s.click === "microsoft" || PAID_MEDIUM.test(s.utmMedium ?? "")) return "other";
    return HOME.includes(s.landing) ? "tiktok_brand" : "search";
  }
  if (!referrer && !s.utmSource && !s.utmMedium && !s.utmCampaign && !s.ref && !s.click) return "direct";
  return "other";
}

const FAMILIES: readonly [RegExp, string][] = [
  [/^google\.|^com\.google\.android\.googlequicksearchbox$/, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/^duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\.com$/, "yahoo"],
  [/^ecosia\.org$/, "ecosia"],
  [/^search\.brave\.com$/, "brave"],
  [TIKTOK, "tiktok"],
  [/(^|\.)instagram\.com$|^com\.instagram\.android$/, "instagram"],
  [/(^|\.)facebook\.com$|^com\.facebook\.(?:katana|orca)$/, "facebook"],
  [/(^|\.)pinterest\.[a-z.]+$|^pin\.it$|^com\.pinterest$/, "pinterest"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/^(?:t\.co|x\.com|twitter\.com)$/, "x"],
  [/^(?:chatgpt\.com|chat\.openai\.com)$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/^gemini\.google\.com$/, "gemini"],
  [/^copilot\.microsoft\.com$/, "copilot"],
  [/^claude\.ai$/, "claude"],
  [/(^|\.)etsy\.com$/, "etsy"],
  [/^mail\.google\.com$|^com\.google\.android\.gm$/, "gmail"],
];

/**
 * A short name for where from, for the report's detail table: the `?ref=` link (`tt-…` as
 * "tiktok-link", `ad-…` as "ad", `c-…` as "creator", any other as itself), else utm_source, else the
 * referrer's family ("google", "instagram", "chatgpt"…) or its host, else the click id's platform,
 * else "(direct)".
 */
export function sourceOf(s: Classifiable): string {
  if (s.ref) return s.ref.startsWith("tt-") ? "tiktok-link" : s.ref.startsWith("ad-") ? "ad" : s.ref.startsWith("c-") ? "creator" : s.ref;
  if (s.utmSource) return s.utmSource;
  const referrer = externalReferrer(s);
  if (referrer) return FAMILIES.find(([pattern]) => pattern.test(referrer))?.[1] ?? referrer;
  return s.click ?? "(direct)";
}
