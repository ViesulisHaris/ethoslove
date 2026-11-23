import { CITY_PAGES, type City } from "@/lib/cities/cities";
import { distanceKm } from "@/lib/dates/geo";
import { TRIPS, type Trip } from "./presets";

/**
 * A trip's stops and the cities that have a dates page (/dates/<city>), each way round: a stop in
 * Riga links to Riga's date ideas, and Riga's page says which trip passes through. Server only: it
 * reads the whole of presets.ts.
 */

/** A stop is in a city when it lies this near the city's centre: its neighbourhoods and the far bank, not the next town. */
export const STOP_IN_CITY_KM = 12;

/** For each stop, in route order, the city with a dates page it lies in: once per city, at the first such stop. */
export function tripStopCities(trip: Pick<Trip, "stops">): (City | undefined)[] {
  const named = new Set<string>();
  return trip.stops.map((stop) => {
    let best: { city: City; km: number } | null = null;
    for (const city of CITY_PAGES) {
      if (named.has(city.slug)) continue;
      const km = distanceKm(stop, city);
      if (km <= STOP_IN_CITY_KM && (!best || km < best.km)) best = { city, km };
    }
    if (!best) return undefined;
    named.add(best.city.slug);
    return best.city;
  });
}

/** The preset trips with a stop in this city, in the trips' own order. */
export function tripsThrough(citySlug: string): Trip[] {
  return TRIPS.filter((trip) => tripStopCities(trip).some((c) => c?.slug === citySlug));
}
