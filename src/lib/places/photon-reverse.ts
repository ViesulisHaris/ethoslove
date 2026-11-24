import { distanceKm, type LatLng } from "@/lib/dates/geo";

/**
 * What lies at a halfway point, from OpenStreetMap through Photon's reverse lookup. A city is the
 * better answer (somewhere to meet), but not one so far off the middle that the meeting is no
 * longer halfway: a city is taken when it is within a quarter of each one's journey (at least
 * FAIR_KM); else the nearest town within TOWN_KM; else any city within CITY_KM. Seattle and
 * Portland meet in Centralia, not in Olympia (61 km off a 117 km journey); Austin and Denver in
 * Amarillo (64 km off 621).
 *
 * With nothing named, whether anything at all is mapped within LAND_KM: on land Photon always has
 * a road, a lake or a hill that near (the Texas panhandle, Siberia and the Sahara all do), and in
 * the open sea it has nothing. A point a little off a coast reads as land with no town, never as
 * sea: the page only says "open water" when it is sure.
 */

export const CITY_KM = 100;
export const TOWN_KM = 50;
export const LAND_KM = 40;
export const FAIR_KM = 40;

export type Spot =
  | { kind: "town"; name: string; region?: string; countryCode?: string; lat: number; lng: number }
  | { kind: "none" }
  | { kind: "sea" };

type Found = { name: string; region?: string; countryCode?: string; lat: number; lng: number };

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** The places in a Photon answer, malformed ones dropped. */
export function photonPlaces(json: unknown): Found[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: Found[] = [];
  for (const feature of features) {
    const props = ((feature as { properties?: unknown } | null)?.properties ?? {}) as Record<string, unknown>;
    const coords = (feature as { geometry?: { coordinates?: unknown } } | null)?.geometry?.coordinates;
    const name = text(props.name, 60);
    if (!name || !Array.isArray(coords)) continue;
    const [lng, lat] = coords;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const place: Found = { name, lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 };
    const region = text(props.state, 60);
    const code = text(props.countrycode, 3)?.toUpperCase();
    if (region && region !== name) place.region = region;
    if (code && /^[A-Z]{2}$/.test(code)) place.countryCode = code;
    out.push(place);
  }
  return out;
}

const nearest = (point: LatLng, places: Found[], maxKm: number): Found | null => {
  let best: { place: Found; km: number } | null = null;
  for (const place of places) {
    const km = distanceKm(point, place);
    if (km <= maxKm && (!best || km < best.km)) best = { place, km };
  }
  return best?.place ?? null;
};

/** How far off the middle a city may be and still be "halfway", for a journey of `eachKm` each. */
export const fairKm = (eachKm: number): number => Math.min(CITY_KM, Math.max(FAIR_KM, eachKm / 4));

/**
 * The spot from Photon's three answers: cities within CITY_KM, towns within TOWN_KM, and anything
 * mapped within LAND_KM (asked only when nothing is named; `null` when it was not asked).
 */
export function pickSpot(point: LatLng, eachKm: number, cities: unknown, towns: unknown, anything: unknown | null): Spot | null {
  const cityList = photonPlaces(cities);
  const found = nearest(point, cityList, fairKm(eachKm)) ?? nearest(point, photonPlaces(towns), TOWN_KM) ?? nearest(point, cityList, CITY_KM);
  if (found) return { kind: "town", ...found };
  if (anything === null) return null;
  return photonPlaces(anything).some((p) => distanceKm(point, p) <= LAND_KM) ? { kind: "none" } : { kind: "sea" };
}

const PHOTON = "https://photon.komoot.io/reverse";
const TIMEOUT_MS = 8000;

async function ask(point: LatLng, radius: number, tags: string[], limit: number, lang: "en" | null): Promise<unknown> {
  const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), radius: String(radius), limit: String(limit) });
  for (const tag of tags) params.append("osm_tag", tag);
  if (lang) params.set("lang", lang);
  const res = await fetch(`${PHOTON}?${params}`, {
    next: { revalidate: 60 * 60 * 24 * 30 },
    headers: { "user-agent": "Ethos/1.0 (+https://tryethos.io)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  return res.json();
}

/** What lies at a point, asked of Photon. Throws when Photon could not be asked: "couldn't ask" is not "nothing there". */
export async function spotAt(point: LatLng, eachKm: number, lang: "en" | null): Promise<Spot> {
  const [cities, towns] = await Promise.all([ask(point, CITY_KM, ["place:city"], 5, lang), ask(point, TOWN_KM, ["place:town"], 5, lang)]);
  const named = pickSpot(point, eachKm, cities, towns, null);
  if (named) return named;
  return pickSpot(point, eachKm, cities, towns, await ask(point, LAND_KM, [], 3, lang)) ?? { kind: "none" };
}
