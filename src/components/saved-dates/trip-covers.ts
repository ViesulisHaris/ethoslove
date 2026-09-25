import { cityName, findAirport } from "@/lib/trips/airports";
import { TRIPS, tripImageSm, tripSrcSet } from "@/lib/trips/presets";
import type { TripCover } from "./saved-date-card";

/**
 * What a trip's card shows, in the reader's language. Every trip, not only the saved ones: a list
 * reloaded in the browser may hold one saved since.
 */
export function tripCovers(locale: "en" | "es"): Record<string, TripCover> {
  return Object.fromEntries(
    TRIPS.map((trip) => {
      const airport = findAirport(trip.flyTo);
      const image = trip.image ?? "";
      return [trip.id, { title: trip.title[locale], where: airport ? cityName(airport, locale) : null, days: trip.days, src: image ? tripImageSm(image) : "", srcSet: image ? tripSrcSet(image) : "", from: trip.art.from, to: trip.art.to }];
    }),
  );
}
