import { fill, TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { TRIP_IDEA_COPY } from "@/content/trip-ideas";
import { getTripIdeaKind } from "./idea-kinds";
import { originOfParam } from "./origins";
import { getTrip, TRIPS, type Trip } from "./presets";

/** The page key of a page by kind on its share card: "ideas-road-trips" for /trips/ideas/road-trips. */
export const IDEAS_CARD_PREFIX = "ideas-";

/**
 * What the share card of a page by where you leave from ("from-london") or by kind of trip
 * ("ideas-road-trips") shows: the page's own heading over its hero's photograph, so a link to
 * "Weekend trips from London" shared in a chat is not the site's general card (app/og/share.jpg).
 * Only these pages' keys are read; anything else is null and the route draws the plain card.
 */
export function roomCard(page: string, locale: "en" | "es"): { title: string; trip: Trip } | null {
  const origin = originOfParam(page);
  if (origin) {
    const trip = getTrip(TRIP_ORIGIN_COPY[origin.slug].hero);
    return trip ? { title: fill(TRIP_ORIGIN_UI[locale].heading, { count: TRIPS.length, city: origin.name[locale] }), trip } : null;
  }
  const kind = page.startsWith(IDEAS_CARD_PREFIX) ? getTripIdeaKind(page.slice(IDEAS_CARD_PREFIX.length)) : null;
  if (!kind) return null;
  const trip = getTrip(TRIP_IDEA_COPY[kind].hero);
  return trip ? { title: TRIP_IDEA_COPY[kind].heading[locale], trip } : null;
}
