import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { TOWN_NAME_MAX, type Town } from "./halfway-link";

/**
 * The ways on from a halfway city: the Halfway gift made of the two towns, a date there, a trip for
 * the next visit. Pure and safe for the browser: the server hands it the cities and the trips it
 * needs (ways-data.ts), so neither the trips' texts nor the cities' table come down with it.
 */

/** A city with a dates page, as the ways on need it: its name in the page's language and one of its idea pictures. */
export type WayCity = { slug: string; name: string; lat: number; lng: number; image: string };
/** A preset trip, as the ways on need it: where its route starts. */
export type WayTrip = { id: string; title: string; lat: number; lng: number; image: string | null; art: { from: string; to: string } };
export type WaysData = { cities: WayCity[]; trips: WayTrip[]; giftPoster: string; datesImage: string };

/** The halfway city "is one of ours" when a dates page's centre is this near. */
export const CITY_PAGE_KM = 25;
/** A trip "starts near" a town within this: a short flight or a few hours by train. */
export const TRIP_START_KM = 400;
/** The Halfway gift (src/templates/halfway). Written out, not imported: the template's module is not for this bundle. */
export const HALFWAY_GIFT_SLUG = "halfway";
export const HALFWAY_NOTE_MAX = 120;

export function cityPageNear(point: LatLng | null | undefined, cities: readonly WayCity[], maxKm = CITY_PAGE_KM): WayCity | null {
  if (!point) return null;
  let best: { city: WayCity; km: number } | null = null;
  for (const city of cities) {
    const km = distanceKm(point, city);
    if (km <= maxKm && (!best || km < best.km)) best = { city, km };
  }
  return best?.city ?? null;
}

/** The trip whose route starts nearest any of the points, if one starts within reach; ties keep the list's order. */
export function tripNear(points: readonly (LatLng | null | undefined)[], trips: readonly WayTrip[], maxKm = TRIP_START_KM): WayTrip | null {
  let best: { trip: WayTrip; km: number } | null = null;
  for (const trip of trips)
    for (const point of points) {
      if (!point) continue;
      const km = distanceKm(point, trip);
      if (km <= maxKm && (!best || km < best.km)) best = { trip, km };
    }
  return best?.trip ?? null;
}

const place = (town: Town) => ({ name: town.name.trim().slice(0, TOWN_NAME_MAX), lat: town.lat, lng: town.lng });

/**
 * What the Halfway gift starts with: the two towns, no stops (a draft's were for other towns, and a
 * stop says they have met there), and a line for the middle when there is a city to name. The
 * distance is left to the gift to work out from the places.
 */
export function halfwayGiftFields(a: Town, b: Town, note?: string): Record<string, unknown> {
  return { from: place(a), to: place(b), stops: [], ...(note ? { halfwayNote: note.slice(0, HALFWAY_NOTE_MAX) } : {}) };
}
