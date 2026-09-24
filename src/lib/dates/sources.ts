import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLatLng, round, snapSearch, type LatLng } from "./geo";
import { GROUP_IDS, KINDS, type PlaceGroup } from "./kinds";
import { isPlaceId, nominatimIdOf, parseNominatim, parseOverpassOne, type PlaceDetails } from "./details";
import { askOverpass } from "./overpass-fetch";
import { buildIdQuery, buildRareQuery, RARE_RADIUS_M } from "./overpass";
import {
  commonsFileUrl,
  commonsSearchUrl,
  geosearchUrl,
  imageInfoUrl,
  isDateWorthy,
  isQid,
  parseCommonsFile,
  parseGeosearch,
  parseImageInfo,
  parseWikidataImage,
  pickCommonsPhoto,
  PHOTO_NAME_MIN,
  wikidataImageUrl,
  type PlacePhoto,
  type Sight,
} from "./photos";
import { balance, parseOverpass, SEARCH_PER_GROUP, type Place } from "./places";
import { MAX_RATED_PLACES, type Ratings } from "./rank";
import { poisOfTile } from "./tile-source";
import { mergePlaces, placesFromPois, tilesCovering } from "./tiles";
import { UNUSUAL_EXTRA, unusualOf } from "./unusual";

/**
 * Where the Dates pages' places, photographs, ratings and details come from, asked of the outside
 * world (OpenFreeMap's tiles, Overpass, Wikipedia, Wikimedia Commons, Nominatim) and of our own
 * reviews. The /api/dates routes answer the website's browser with these one at a time; /api/app
 * asks several at once for the iPhone app. Neither fetches the other over HTTP.
 */

const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";
const DAY = 60 * 60 * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;

async function askJson(url: string, revalidate: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export type PlacesSearch = { center: LatLng; radiusM: number; total: number; complete: boolean; places: Place[] };

/**
 * Places for a date near a point, read out of the same OpenStreetMap vector tiles the map is drawn
 * from. The point is snapped to a grid first, so everybody looking at one neighbourhood shares an
 * answer. `unavailable` when every tile failed; `complete` is false when only some did.
 */
export async function searchPlaces(at: LatLng, radius: number, locale: "en" | "es", groups: readonly PlaceGroup[] = GROUP_IDS): Promise<PlacesSearch | { unavailable: true; center: LatLng; radiusM: number }> {
  const { center, radiusM } = snapSearch(at, radius);
  const tiles = tilesCovering(center, radiusM);
  const results = await Promise.all(tiles.map(async (tile) => ({ tile, ...(await poisOfTile(tile)) })));
  if (results.every((r) => !r.ok)) return { unavailable: true, center, radiusM };
  const all = mergePlaces(...results.map((r) => placesFromPois(r.features, r.tile, center, radiusM, locale)));
  const wanted = all.filter((p) => groups.includes(p.group));
  const kept = balance(wanted, SEARCH_PER_GROUP);
  // The places with a story are kept past the cap: a cellar bar is not the two-hundredth best bar
  // in a city centre for any reason a couple would care about.
  const keptIds = new Set(kept.map((p) => p.id));
  const extra = wanted.filter((p) => !keptIds.has(p.id) && (unusualOf(p)?.strength ?? 0) > 1).slice(0, UNUSUAL_EXTRA);
  return { center, radiusM, total: all.length, complete: results.every((r) => r.ok), places: [...kept, ...extra] };
}

/** The wider cell the rare finds are asked for: about a kilometre, rounded from wherever the search is. */
export const rareCenter = (at: LatLng): LatLng => ({ lat: round(at.lat, 2) + 0, lng: round(at.lng, 2) + 0 });

/**
 * The rare finds within a short ride (bowling, arcades, climbing, karaoke, boats, spas, wineries,
 * the beach), asked of the public Overpass servers. Null when none of them answered in time.
 */
export async function rareFinds(center: LatLng, locale: "en" | "es"): Promise<Place[] | null> {
  const json = await askOverpass(buildRareQuery(center), { deadlineMs: 24_000, hedgeMs: 6000, revalidate: WEEK });
  if (!json) return null;
  return parseOverpass(json, center, RARE_RADIUS_M, (kind) => KINDS[kind].label[locale]);
}

/** A little wider than the places search: a landmark just over the line is still in the photograph. */
const SIGHTS_EXTRA_M = 400;

/**
 * Freely licensed photographs of what is near a search, from Wikipedia, each with its author and
 * licence: English first for an English page, Spanish for a Spanish one, and the other language
 * too when the first knows little about the neighbourhood.
 */
export async function findSights(center: LatLng, radiusM: number, locale: "en" | "es"): Promise<Sight[]> {
  const langs: ("en" | "es")[] = locale === "es" ? ["es", "en"] : ["en", "es"];
  const sights: Sight[] = [];
  const seen = new Set<string>();
  for (const lang of langs) {
    const found = parseGeosearch(await askJson(geosearchUrl(lang, center, radiusM + SIGHTS_EXTRA_M), WEEK)).filter(isDateWorthy);
    const files = found.flatMap((s) => (s.file ? [s.file] : []));
    const credits = files.length > 0 ? parseImageInfo(await askJson(imageInfoUrl(lang, files), WEEK)) : new Map();
    for (const sight of found) {
      // The same building has an article in both languages, with the same picture.
      const key = sight.file ?? `${sight.lat.toFixed(4)},${sight.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const credit = sight.file ? credits.get(sight.file.replace(/_/g, " ")) : undefined;
      sights.push({ ...sight, photo: { ...sight.photo, ...credit } });
    }
    if (sights.length >= 12) break;
  }
  return sights;
}

const RATED_ID = /^(node|way|relation)\/\d{1,15}$/;

/**
 * Stars, review count and typical cost for the places one search can show, from couples' reviews.
 * `queried` is false when there was nothing to ask (no valid ids, or no database); null when the
 * database failed.
 */
export async function placeRatings(ids: readonly unknown[]): Promise<{ ratings: Ratings; queried: boolean } | null> {
  const clean = [...new Set(ids.filter((id): id is string => typeof id === "string" && RATED_ID.test(id)))].slice(0, MAX_RATED_PLACES);
  const db = getSupabaseAdminClient();
  if (!db || clean.length === 0) return { ratings: {}, queried: false };
  const { data, error } = await db.rpc("place_rating_summary", { ids: clean });
  if (error) return null;
  const ratings: Ratings = {};
  for (const row of data ?? []) ratings[row.place_id] = { stars: Number(row.stars), reviews: row.reviews, cost: row.cost };
  return { ratings, queried: true };
}

/**
 * One place's address, opening hours, website and phone: from Nominatim (OpenStreetMap's own
 * lookup), and from Overpass when that has nothing. Kept for a month by the data cache. Null when
 * neither answered.
 */
export async function lookupPlaceDetails(id: string, locale: "en" | "es"): Promise<PlaceDetails | null> {
  if (!isPlaceId(id)) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${nominatimIdOf(id)}&format=jsonv2&extratags=1&addressdetails=1&accept-language=${locale}`, {
      next: { revalidate: MONTH },
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const details = parseNominatim(await res.json(), id);
      if (details) return details;
    }
  } catch {
    // Fall through to Overpass.
  }
  const query = buildIdQuery(id);
  const json = query ? await askOverpass(query, { deadlineMs: 9000, hedgeMs: 3000, revalidate: MONTH }) : null;
  return json ? parseOverpassOne(json, id) : null;
}

/**
 * A real photograph of one place, if anybody has given one away: the picture its Wikidata item
 * names when it has one, otherwise a geotagged photograph on Wikimedia Commons taken close by and
 * named after it. "No photo" (null) is an answer too.
 */
export async function findPlacePhoto({ name, lat, lng, qid }: { name: string; lat: number; lng: number; qid?: string | null }): Promise<PlacePhoto | null> {
  const clean = name.trim().slice(0, 120);
  if (!isLatLng(lat, lng)) return null;
  let photo: PlacePhoto | null = null;
  if (qid && isQid(qid)) {
    const file = parseWikidataImage(await askJson(wikidataImageUrl(qid), MONTH));
    if (file) photo = parseCommonsFile(await askJson(commonsFileUrl(file), MONTH));
  }
  if (!photo && clean.length >= PHOTO_NAME_MIN) photo = pickCommonsPhoto(await askJson(commonsSearchUrl(clean, { lat: round(lat, 4), lng: round(lng, 4) }), MONTH), clean);
  return photo;
}
