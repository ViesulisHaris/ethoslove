import { isYmd } from "@/lib/dates/calendar";
import { isPlaceId } from "@/lib/dates/details";
import { round } from "@/lib/dates/geo";
import { isWikimedia } from "@/lib/dates/photos";

/**
 * The links a plan or a place is shared by, and what their previews are drawn from. The website
 * and the iPhone app build them the same way (docs/SHARING.md):
 *
 *   /plan?c=<cover>&t=<title>&d=<YYYY-MM-DD>#p=<plan>
 *   /dates?lat=<lat>&lng=<lng>&q=<town>&place=<place id>&c=<cover>&t=<place name>
 *
 * A plan still travels after the `#`, which never reaches a server; `c`, `t` and `d` are only
 * what a link preview needs (a photograph, a line, a day) and are read for nothing else. Every
 * value is percent-encoded as encodeURIComponent does it: a space is %20 and a plus is %2B.
 */

/** The longest title a preview carries; longer ones are cut, with an ellipsis. */
export const SHARE_TITLE_MAX = 80;
/** Longer than any thumbnail Wikimedia serves; past it, it is not one. */
export const SHARE_COVER_MAX = 800;
/** Bumped when the card is drawn differently, so crawlers and the CDN fetch it again. */
export const SHARE_CARD_VERSION = "1";

const WIKIMEDIA_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);
/** Control characters, zero-width marks and the bidi overrides that can make a line read backwards. */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
/** An address written into a title: nobody's plan or place is called that, and our card is not a place to advertise one. */
const LINKISH = /\b(?:https?:\/\/|www\.)\S*/gi;

/**
 * A cover the preview may draw: an https address on one of Wikimedia's two image hosts, with no
 * port, no credentials and no query, and nothing else at all. Everything the site shows as a
 * photograph of a place comes from there (photos.ts), so nothing real is lost.
 */
export function shareCover(value: unknown): string | null {
  if (!isWikimedia(value) || value.length > SHARE_COVER_MAX) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !WIKIMEDIA_HOSTS.has(url.hostname) || url.port || url.username || url.password) return null;
  // Commons hangs tracking-style queries on its thumbnails; the picture is the same without them.
  url.search = "";
  url.hash = "";
  return url.href;
}

/** A line fit for a preview: one line, nothing invisible, no web address, at most SHARE_TITLE_MAX characters. */
export function shareTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(INVISIBLE, " ").replace(LINKISH, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const chars = Array.from(clean);
  return chars.length <= SHARE_TITLE_MAX ? clean : `${chars.slice(0, SHARE_TITLE_MAX - 1).join("").trimEnd()}…`;
}

export const shareDate = (value: unknown): string | null => (isYmd(value) ? value : null);

export type SharePreview = { cover: string | null; title: string | null; date: string | null };

/** Pairs as a query string, in the order given, empty ones left out. */
function query(pairs: [string, string | null | undefined][]): string {
  const parts = pairs.flatMap(([key, value]) => (value ? [`${key}=${encodeURIComponent(value)}`] : []));
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** A shared plan: its page, the preview's cover, title and day in the query, and the plan itself after the `#`. */
export function planShareHref(planPath: string, encodedPlan: string, preview: Partial<SharePreview>): string {
  return `${planPath}${query([
    ["c", shareCover(preview.cover)],
    ["t", shareTitle(preview.title)],
    ["d", shareDate(preview.date)],
  ])}#p=${encodedPlan}`;
}

export type SharedPlace = { id: string; name: string; lat: number; lng: number };

/**
 * A shared place: the Dates page around it (its own coordinates, and the town it is in when
 * there is one to name), which place to open, and the preview's cover and title.
 */
export function placeShareHref(datesPath: string, place: SharedPlace, town: string | null | undefined, cover: string | null | undefined): string {
  return `${datesPath}${query([
    ["lat", String(round(place.lat, 5))],
    ["lng", String(round(place.lng, 5))],
    ["q", town?.trim().slice(0, 80) || null],
    ["place", isPlaceId(place.id) ? place.id : null],
    ["c", shareCover(cover)],
    ["t", shareTitle(place.name)],
  ])}`;
}

type Query = URLSearchParams | Record<string, string | string[] | undefined>;
const param = (q: Query, key: string): string | undefined => {
  const value = q instanceof URLSearchParams ? (q.get(key) ?? undefined) : q[key];
  return Array.isArray(value) ? value[0] : value;
};

/** A page's searchParams as URLSearchParams, the first of any repeated key. */
export function firstParams(q: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) {
    const one = Array.isArray(value) ? value[0] : value;
    if (one !== undefined) out.set(key, one);
  }
  return out;
}

/** What a link's preview may be drawn from; whatever else is in its query is none of the preview's business. */
export function readSharePreview(q: Query): SharePreview {
  return { cover: shareCover(param(q, "c")), title: shareTitle(param(q, "t")), date: shareDate(param(q, "d")) };
}

export const hasSharePreview = (preview: SharePreview): boolean => Boolean(preview.cover || preview.title);

/** The place a /dates link asks to open, if it names one the way the map does ("node/123"). */
export function readSharedPlace(q: Query): string | null {
  const id = param(q, "place");
  return id && isPlaceId(id) ? id : null;
}

/** The query that says what a preview shows, kept to the parameters the preview reads, for the page's og:url. */
export function previewQuery(preview: SharePreview, extra: [string, string | null | undefined][] = []): string {
  return query([...extra, ["c", preview.cover], ["t", preview.title], ["d", preview.date]]);
}

export type ShareCard =
  | { kind: "plan" | "place"; locale: "en" | "es"; cover: string | null; title: string | null; date?: string | null }
  | { kind: "trip"; locale: "en" | "es"; trip: string };

/**
 * Where a preview's picture is drawn (app/og/share.jpg): everything it shows is in the query, so
 * the query is the cache key, and `v` changes when the drawing does. A dot in the path keeps the
 * locale proxy away from it (see app/og.png).
 */
export function shareCardPath(card: ShareCard): string {
  if (card.kind === "trip") return `/og/share.jpg${query([["k", "trip"], ["l", card.locale], ["trip", card.trip], ["v", SHARE_CARD_VERSION]])}`;
  return `/og/share.jpg${query([
    ["k", card.kind],
    ["l", card.locale],
    ["c", shareCover(card.cover)],
    ["t", shareTitle(card.title)],
    ["d", card.kind === "plan" ? shareDate(card.date) : null],
    ["v", SHARE_CARD_VERSION],
  ])}`;
}

/** A card's query read back, every part checked again: the route is public, and anyone can write a query. */
export function readShareCard(q: URLSearchParams): ShareCard {
  const locale = q.get("l") === "es" ? "es" : "en";
  const kind = q.get("k");
  if (kind === "trip") return { kind, locale, trip: (q.get("trip") ?? "").slice(0, 60) };
  const preview = readSharePreview(q);
  return { kind: kind === "plan" ? "plan" : "place", locale, cover: preview.cover, title: preview.title, date: kind === "plan" ? preview.date : null };
}
