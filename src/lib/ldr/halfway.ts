import { halfwayPlace } from "@/lib/dates/apart";
import { ES_CITY_NAMES } from "@/lib/dates/cities";
import { distanceKm, midpoint, type LatLng } from "@/lib/dates/geo";
import { CITIES, type City } from "@/templates/_shared/places";

/**
 * Halfway between two towns, worked out once for both pages that ask (the long-distance room's
 * "Meet in the middle" and the halfway finder): along the great circle, then the nearest city we
 * know to that point, and how far that city is from each of them.
 */

/** Further than this from any city we know, the halfway point is somewhere nobody can meet: open sea, or a lot of forest. */
export const NOWHERE_KM = 400;
/** Countries never named as the place to meet: neither their cities nor their airports (the owner's rule). */
export const NEVER_SUGGESTED: ReadonlySet<string> = new Set(["ES"]);
/** Nearer than this to one of the two towns, the "halfway city" is that town: nothing we know lies between them. */
export const OWN_TOWN_KM = 30;

export type Halfway = {
  /** Between the two towns, along the great circle. */
  km: number;
  middle: LatLng;
  /** The nearest city we know to the middle, how far off the middle it is, and how far it is from each of them. */
  near: { city: City; km: number; kmFromA: number; kmFromB: number } | null;
  /** The nearest city is in a country the site never names: say how far each travels instead. */
  unnamed: boolean;
};

export function halfwayBetween(a: LatLng, b: LatLng, cities: readonly City[] = CITIES): Halfway {
  const km = distanceKm(a, b);
  const middle = midpoint(a, b);
  const place = halfwayPlace(middle, cities, { maxKm: NOWHERE_KM, neverNamed: NEVER_SUGGESTED });
  const near = typeof place === "string" ? null : { ...place, kmFromA: distanceKm(a, place.city), kmFromB: distanceKm(b, place.city) };
  return { km, middle, near, unnamed: place === "unnamed" };
}

/** The halfway city as the page's language says it ("Múnich"). The city table is in English. */
export const halfwayCityName = (city: Pick<City, "name">, locale: "en" | "es"): string => (locale === "es" ? ES_CITY_NAMES[city.name] : undefined) ?? city.name;

/** The halfway city is one of their own towns (Prague and Vienna: the nearest city to the middle is Vienna). */
export const isOwnTown = (h: Halfway): boolean => Boolean(h.near && h.km > 2 * OWN_TOWN_KM && (h.near.kmFromA < OWN_TOWN_KM || h.near.kmFromB < OWN_TOWN_KM));
