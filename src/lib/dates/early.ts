import { round, snapSearch, type LatLng } from "./geo";

/**
 * The Dates page is static HTML, and the explorer only works out where to search once its scripts
 * have downloaded and hydrated: on a slow phone that is five seconds after the HTML arrived, and the
 * search only started then. The search it is going to make is already decided by the link (or by
 * last time's town), so a few lines in the HTML start it at once and park the answer on `window`;
 * the explorer picks it up instead of asking again. Everything here has to agree with the explorer
 * to the character, or the parked answer is never used: `datesUrls` is the one place both build
 * their addresses from, and the unit tests hold `earlyStart` to it.
 */

export const EARLY_KEY = "__ethosDatesEarly";
/** A parked answer older than this is from another visit to the page, not this one. */
const EARLY_MAX_AGE_MS = 60_000;

type Parked = Record<string, { at: number; response: Promise<Response> }>;

/** The four requests a search makes, for a centre and radius as the explorer holds them. */
export function datesUrls(center: LatLng, radiusM: number, locale: "en" | "es") {
  const snapped = snapSearch(center, radiusM);
  const at = `lat=${snapped.center.lat}&lng=${snapped.center.lng}`;
  // The rare finds and the forecast are asked for a wider cell, rounded from the snapped centre.
  const wide = { lat: round(snapped.center.lat, 2) + 0, lng: round(snapped.center.lng, 2) + 0 };
  return {
    snapped,
    wide,
    search: `/api/dates/search?${at}&radius=${snapped.radiusM}&locale=${locale}`,
    photos: `/api/dates/photos?${at}&radius=${snapped.radiusM}&locale=${locale}`,
    rare: `/api/dates/rare?lat=${wide.lat}&lng=${wide.lng}&locale=${locale}`,
    weather: `/api/dates/weather?lat=${wide.lat}&lng=${wide.lng}`,
  };
}

export const HERE_URL = "/api/dates/here";

/** The answer the page's HTML already asked for, once; otherwise a fresh request. */
export function takeEarly(url: string): Promise<Response> {
  const parked = (globalThis as unknown as Record<string, Parked | undefined>)[EARLY_KEY];
  const hit = parked?.[url];
  if (parked && hit) delete parked[url];
  return hit && Date.now() - hit.at < EARLY_MAX_AGE_MS ? hit.response : fetch(url);
}

export type EarlyOptions = {
  /** Where the answers are parked on `window`. */
  key: string;
  /** localStorage key of the last town (the explorer's WHERE_KEY). */
  whereKey: string;
  locale: "en" | "es";
  /** The explorer's first radius, already snapped. */
  radius: number;
  /** The heading in the page's HTML, and "Date ideas in {place}" to write into it. */
  headingId: string;
  titleIn: string;
  /**
   * Files a wide screen is certain to need (a desktop always shows the map beside the list): fetched
   * into the HTTP cache alongside the app's own scripts instead of after them.
   */
  warm?: string[];
};

/**
 * Runs in the page's HTML before React. It is sent as its own source text, so it may use nothing but
 * its argument and the browser: no imports, no helpers from this file. It mirrors the explorer's
 * first-visit order (the link, then last time's town, then the connection's guess) and snaps the
 * centre exactly as `snapSearch` does. It also names the town in the heading, which the explorer
 * would otherwise only do after hydrating, and only when the explorer will: a town from the link,
 * or last time's when it was one they picked (not "near me"). It writes text, never markup.
 *
 * A town named without coordinates (/dates?q=Lisboa) is looked up by the explorer first, and it
 * only falls back to last time's town or the connection's guess when the lookup can't be made:
 * nothing is started for it here, where either would be a request made for nothing.
 */
export function earlyStart(o: EarlyOptions): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const ok = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const name = (place: string) => {
      const heading = document.getElementById(o.headingId);
      if (place && heading) heading.textContent = o.titleIn.replace("{place}", () => place);
    };
    let start: { lat: number; lng: number } | null = null;
    let lookUp = false;
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    if (params.get("lat") && params.get("lng") && ok(lat, lng)) {
      start = { lat, lng };
      name((params.get("q") ?? "").slice(0, 80));
    } else if ((params.get("q") ?? "").trim().length >= 2) {
      lookUp = true;
    } else {
      try {
        const saved = JSON.parse(window.localStorage.getItem(o.whereKey) ?? "null") as { lat?: unknown; lng?: unknown; name?: unknown; share?: unknown } | null;
        if (saved && typeof saved.lat === "number" && typeof saved.lng === "number" && ok(saved.lat, saved.lng) && typeof saved.name === "string") {
          start = { lat: saved.lat, lng: saved.lng };
          if (saved.share === true) name(saved.name.slice(0, 80));
        }
      } catch {
        // No storage: the explorer asks the connection instead, and so does this.
      }
    }
    const w = window as unknown as Record<string, Record<string, { at: number; response: Promise<Response> }> | undefined>;
    const parked = (w[o.key] = w[o.key] ?? {});
    const ask = (url: string) => {
      const response = fetch(url);
      // Nobody may come for it (the visitor left); a failure must not be an unhandled rejection.
      response.catch(() => undefined);
      parked[url] = { at: Date.now(), response };
    };
    if (!start) {
      if (!lookUp) ask("/api/dates/here");
    } else {
      const r = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places + 0;
      const c = { lat: r(start.lat, 3), lng: r(start.lng, 3) };
      const wide = { lat: r(c.lat, 2), lng: r(c.lng, 2) };
      ask(`/api/dates/search?lat=${c.lat}&lng=${c.lng}&radius=${o.radius}&locale=${o.locale}`);
      ask(`/api/dates/photos?lat=${c.lat}&lng=${c.lng}&radius=${o.radius}&locale=${o.locale}`);
      ask(`/api/dates/rare?lat=${wide.lat}&lng=${wide.lng}&locale=${o.locale}`);
      ask(`/api/dates/weather?lat=${wide.lat}&lng=${wide.lng}`);
    }
  } catch {
    // Anything odd here and the explorer simply asks for itself, as it always did.
  }
  try {
    if (o.warm && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches) {
      // Read to the end: a body nobody reads can stall half-way into the cache.
      for (const url of o.warm)
        fetch(url)
          .then((res) => res.arrayBuffer())
          .catch(() => undefined);
    }
  } catch {
    // Only ever a head start.
  }
}

/** The inline script: `earlyStart` as source, called with its options. `<` is escaped so no value can close the tag. */
export const earlyScript = (options: EarlyOptions): string => `(${earlyStart.toString()})(${JSON.stringify(options).replace(/</g, "\\u003c")})`;
