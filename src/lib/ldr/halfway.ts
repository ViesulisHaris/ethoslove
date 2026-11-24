import { halfwayPlace, nearestCity } from "@/lib/dates/apart";
import { ES_CITY_NAMES } from "@/lib/dates/cities";
import { distanceKm, midpoint, type LatLng } from "@/lib/dates/geo";
import { fairKm, type Spot } from "@/lib/places/photon-reverse";
import { CITIES, type City } from "@/templates/_shared/places";

/**
 * Halfway between two towns, worked out once for both pages that ask (the long-distance room's
 * "Meet in the middle" and the halfway finder): along the great circle, then the nearest city we
 * know to that point, and how far that city is from each of them.
 */

/** Further than this from any city in the table, the table has nothing to say about the halfway point. */
export const NOWHERE_KM = 400;
/**
 * Further than this from the middle, a city in the table is never the answer (and nearer, only when
 * it is fair to both: tableFair); the map is asked for the town nearest the middle instead. The table
 * has only sixteen cities in the United States, and Toronto is no answer for New York and Chicago.
 * Within it, a city in a country never named still makes the answer unnamed.
 */
export const TABLE_NAME_KM = 150;
/** Countries never named as the place to meet: neither their cities nor their airports (the owner's rule). */
export const NEVER_SUGGESTED: ReadonlySet<string> = new Set(["ES"]);
/**
 * Nearer than this to one of the two towns, the "halfway city" is that town. That says nothing
 * about what lies between them (the city table is short: Brno is not in it), only that the table
 * has no better answer, so the page names no city then.
 */
export const OWN_TOWN_KM = 30;

export type Halfway = {
  /** Between the two towns, along the great circle. */
  km: number;
  middle: LatLng;
  /** The nearest city we know to the middle, how far off the middle it is, and how far it is from each of them. */
  near: { city: City; km: number; kmFromA: number; kmFromB: number } | null;
  /** The nearest city is in a country the site never names: say how far each travels instead. */
  unnamed: boolean;
  /** How far the nearest city in the table is from the middle, whether it is named or not. */
  nearestKm: number | null;
};

export function halfwayBetween(a: LatLng, b: LatLng, cities: readonly City[] = CITIES): Halfway {
  const km = distanceKm(a, b);
  const middle = midpoint(a, b);
  const place = halfwayPlace(middle, cities, { maxKm: NOWHERE_KM, neverNamed: NEVER_SUGGESTED });
  const near = typeof place === "string" ? null : { ...place, kmFromA: distanceKm(a, place.city), kmFromB: distanceKm(b, place.city) };
  return { km, middle, near, unnamed: place === "unnamed", nearestKm: nearestCity(middle, cities)?.km ?? null };
}

/** The halfway city as the page's language says it ("Múnich"). The city table is in English. */
export const halfwayCityName = (city: Pick<City, "name">, locale: "en" | "es"): string => (locale === "es" ? ES_CITY_NAMES[city.name] : undefined) ?? city.name;

/**
 * The nearest city the table knows to the middle is one of their own towns (Prague and Vienna: by
 * the table's coordinates it is Vienna; a geocoded Prague can tip it to Prague). Neither is an
 * answer to "where is halfway", so the pages say how far each travels and name no city.
 */
export const isOwnTown = (h: Halfway): boolean => Boolean(h.near && h.km > 2 * OWN_TOWN_KM && (h.near.kmFromA < OWN_TOWN_KM || h.near.kmFromB < OWN_TOWN_KM));

/**
 * The answer a page shows for halfway, once the table and (when it was asked) the map have spoken:
 * - `city`: a place to name, from the table or the map, how far off the middle and from each of them;
 * - `unnamed`: the middle is in a country never named (the owner's rule);
 * - `between`: no town lies nearer the middle than their own two;
 * - `pending`: the map is being asked; `failed`: it could not be;
 * - `none`: land, with no town near the middle; `sea`: nothing mapped near it at all.
 * Every kind but `same` and `city` says how far each travels to meet exactly halfway.
 */
export type HalfwayAnswer =
  | { kind: "same" }
  | { kind: "city"; name: string; region?: string; lat: number; lng: number; offKm: number; kmFromA: number; kmFromB: number; fromMap: boolean }
  | { kind: "unnamed" | "between" | "pending" | "failed" | "none" | "sea"; eachKm: number; middle: LatLng };

/** The map's answer for a middle: being asked (`undefined`), could not be asked (`null`), or what it found. */
export type SpotState = Spot | null | undefined;

/** The table's nearest city is in a country never named, and near enough to be the answer. */
const tableUnnamed = (h: Halfway): boolean => h.unnamed && h.nearestKm !== null && h.nearestKm <= TABLE_NAME_KM;

/**
 * Whether the table's city is fair to both of them: no further off the middle than a city the map
 * finds may be (fairKm, a quarter of each one's journey, 40 to 100 km), and the two journeys to it
 * no further apart than that either (a city off to one side of the middle can still be even; one
 * along the way is not). New York is 88 km off the middle of Boston and Philadelphia (306 km for
 * one, 130 for the other), Luxembourg 139 km off the middle of Riga and Lisbon (1,440 against
 * 1,712), Paris 99 km off Bristol and Milan's (455 against 640): none is halfway, so the map is asked.
 */
export const tableFair = (h: Halfway): boolean => {
  if (!h.near) return false;
  const fair = fairKm(h.km / 2);
  return h.near.km <= fair && Math.abs(h.near.kmFromA - h.near.kmFromB) <= fair;
};

/** Whether the table's answer needs the map: no table city fair to both, or only one of their own towns. */
export const needsMap = (h: Halfway): boolean => h.km >= 1 && !tableUnnamed(h) && (!h.near || h.near.km > TABLE_NAME_KM || !tableFair(h) || isOwnTown(h));

/**
 * Whether a named place is as good as exactly halfway: the two journeys within a twentieth of the
 * whole (or 8 km) of each other. Being near the middle is not enough: Madisonville is 33 km off the
 * middle of Dallas and Houston, and 136 miles from one against 88 from the other.
 */
export const isEven = (kmFromA: number, kmFromB: number): boolean => Math.abs(kmFromA - kmFromB) <= Math.max(8, 0.05 * (kmFromA + kmFromB));

export function halfwayAnswer(h: Halfway, a: LatLng, b: LatLng, spot: SpotState, locale: "en" | "es"): HalfwayAnswer {
  if (h.km < 1) return { kind: "same" };
  const each = { eachKm: h.km / 2, middle: h.middle };
  if (tableUnnamed(h)) return { kind: "unnamed", ...each };
  if (!needsMap(h) && h.near) {
    const { city, km, kmFromA, kmFromB } = h.near;
    return { kind: "city", name: halfwayCityName(city, locale), lat: city.lat, lng: city.lng, offKm: km, kmFromA, kmFromB, fromMap: false };
  }
  if (spot === undefined) return { kind: "pending", ...each };
  if (spot === null) return { kind: "failed", ...each };
  if (spot.kind === "town") {
    if (spot.countryCode && NEVER_SUGGESTED.has(spot.countryCode)) return { kind: "unnamed", ...each };
    const kmFromA = distanceKm(a, spot);
    const kmFromB = distanceKm(b, spot);
    // The nearest town to the middle is one of their own: there is nothing between them to name.
    if (kmFromA < OWN_TOWN_KM || kmFromB < OWN_TOWN_KM) return { kind: "between", ...each };
    return { kind: "city", name: spot.name, ...(spot.region ? { region: spot.region } : {}), lat: spot.lat, lng: spot.lng, offKm: distanceKm(h.middle, spot), kmFromA, kmFromB, fromMap: true };
  }
  if (spot.kind === "sea") return { kind: "sea", ...each };
  return { kind: isOwnTown(h) ? "between" : "none", ...each };
}

/** The place a halfway answer names, as the ways on need it, or null. */
export const answerPlace = (answer: HalfwayAnswer | null): { name: string; lat: number; lng: number } | null =>
  answer?.kind === "city" ? { name: answer.name, lat: answer.lat, lng: answer.lng } : null;

/** Countries whose people measure a trip in miles: the United States (and its territories), the United Kingdom, Liberia, Myanmar. */
const MILES = new Set(["US", "PR", "GU", "VI", "AS", "MP", "UM", "GB", "IM", "JE", "GG", "LR", "MM"]);

/** Whether a visitor from this country ("US", or a language tag's region, "en-US") reads distances in miles. */
export function readsMiles(countryOrLocale: string | null | undefined): boolean {
  const v = (countryOrLocale ?? "").toUpperCase();
  const region = v.includes("-") ? v.slice(v.lastIndexOf("-") + 1) : v;
  return MILES.has(region);
}

/** An OpenStreetMap link to a point, for a halfway with no town to name. */
export const mapLink = (point: LatLng): string => {
  const lat = Math.round(point.lat * 1e4) / 1e4;
  const lng = Math.round(point.lng * 1e4) / 1e4;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=8/${lat}/${lng}`;
};
