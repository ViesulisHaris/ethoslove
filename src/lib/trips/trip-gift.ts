import { resolvePlace } from "@/templates/_shared/places";
import { distanceKm } from "@/lib/dates/geo";
import { cityName, findAirport, type Airport } from "./airports";
import { fromFields } from "./last-from";
import { stopName, type Trip, type TripStop } from "./presets";

/** The gift a preset trip turns into: a ticket, a date, and a packing list. */
export const TRIP_GIFT_SLUG = "pack-your-bags";

const MAX_STOPS = 5;
const MAX_NIGHTS = 30;
const NAME_MAX = 40;
/** Further than this from the real town, the name has matched somewhere else (Lagos is also in Nigeria). */
const MISMATCH_KM = 50;

const clip = (s: string) => s.slice(0, NAME_MAX);

const tripNights = (trip: Trip): number => Math.min(MAX_NIGHTS, Math.max(1, trip.days - 1));

/** A stop's name for the ticket, with its coordinates when the ticket's map would place that name somewhere else. */
function roadEnd(stop: TripStop, locale: "en" | "es"): { city: string; coords: string } {
  const city = clip(stopName(stop, locale));
  const known = resolvePlace(city) ?? findAirport(city);
  return { city, coords: !known || distanceKm(known, stop) > MISMATCH_KM ? `${stop.lat}, ${stop.lng}` : "" };
}

/**
 * The fields "Pack your bags" starts with when a preset trip becomes a surprise. A road trip is a
 * ticket from where the road starts to where it ends, with the towns on the way as stops; the
 * others fly from where they last flew from to where the trip lands. A road trip ignores that
 * airport: they fly to Naples and drive from there, and a ticket from home (or the template's own
 * default, Riga) promised "32 h of driving" to Ravello. Names are in the gift's language. A town
 * the ticket's map can't place by name (Jökulsárlón, Sagres) goes with its coordinates, and every
 * coordinate field this sets is set, so an old draft's override can't point the new ticket
 * somewhere else. The packing list is emptied for the same reason: a draft's clues were for
 * another trip, and an empty list is the template's own list for this kind of trip.
 */
export function tripGiftFields(trip: Trip, locale: "en" | "es", from?: Airport | null): Record<string, unknown> {
  if (trip.kind === "road") {
    const start = roadEnd(trip.stops[0], locale);
    const end = roadEnd(trip.stops[trip.stops.length - 1], locale);
    return {
      trip: "road",
      fromCity: start.city,
      fromCoords: start.coords,
      toCity: end.city,
      toCoords: end.coords,
      stops: trip.stops.slice(1, -1).slice(0, MAX_STOPS).map((s) => clip(stopName(s, locale))),
      nights: tripNights(trip),
      clues: [],
    };
  }
  const airport = findAirport(trip.flyTo);
  return {
    trip: trip.kind === "train" ? "train" : "flight",
    toCity: clip(airport ? cityName(airport, locale) : stopName(trip.stops[0], locale)),
    toCoords: "",
    stops: [],
    nights: tripNights(trip),
    clues: [],
    ...(from ? fromFields(from, locale) : {}),
  };
}
