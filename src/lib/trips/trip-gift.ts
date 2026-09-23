import { resolvePlace } from "@/templates/_shared/places";
import { distanceKm } from "@/lib/dates/geo";
import type { GiftUnwrap, GiftUnwrapStop } from "@/lib/gift/schema";
import { clipText, isUnwrapImage, UNWRAP_LIMITS } from "@/lib/gift/unwrap-rules";
import { cityName, findAirport, type Airport } from "./airports";
import { fromFields } from "./last-from";
import { stopName, tripImageSm, type Trip, type TripStop } from "./presets";

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

export type TripUnwrapOptions = {
  /** Where they last flew from (./last-from), which only their browser knows. */
  from?: Airport | null;
  /** Photographs found for the stops, by the stop's own (English) name, already sized for a chip. */
  photos?: Record<string, string | null | undefined>;
};

/**
 * A preset trip as "a surprise inside" any gift (GiftData.unwrap): its title and photograph, from
 * where to where and how, the nights, and the towns on the way. A road trip runs from where its
 * road starts, as the ticket does; the others fly from the airport they last searched from, when
 * there is one. The link is the trip's own page, in the gift's language.
 */
export function tripUnwrap(trip: Trip, locale: "en" | "es", options: TripUnwrapOptions = {}): GiftUnwrap {
  const { from, photos = {} } = options;
  const road = trip.kind === "road";
  const airport = findAirport(trip.flyTo);
  const to = road ? stopName(trip.stops[trip.stops.length - 1], locale) : airport ? cityName(airport, locale) : stopName(trip.stops[0], locale);
  const start = road ? stopName(trip.stops[0], locale) : from ? cityName(from, locale) : undefined;
  const stops: GiftUnwrapStop[] = trip.stops.slice(0, UNWRAP_LIMITS.stops).map((s) => {
    const photo = photos[s.name];
    return {
      name: clipText(stopName(s, locale), UNWRAP_LIMITS.stopName),
      lat: s.lat,
      lng: s.lng,
      ...(isUnwrapImage(photo) ? { image: photo } : {}),
      note: clipText(s.note[locale], UNWRAP_LIMITS.stopNote),
    };
  });
  // The small copy: the card is a phone's width, and the full photograph is four times the bytes.
  const cover = trip.image ? tripImageSm(trip.image) : undefined;
  return {
    kind: "trip",
    title: clipText(trip.title[locale], UNWRAP_LIMITS.title),
    city: clipText(to, UNWRAP_LIMITS.city),
    stops,
    ...(isUnwrapImage(cover) ? { image: cover } : {}),
    link: `${locale === "es" ? "/es" : ""}/trips/${trip.id}`,
    trip: {
      ...(start && start !== to ? { from: clipText(start, UNWRAP_LIMITS.place) } : {}),
      to: clipText(to, UNWRAP_LIMITS.place),
      nights: Math.min(UNWRAP_LIMITS.nights, tripNights(trip)),
      mode: road ? "road" : trip.kind === "train" ? "train" : "flight",
    },
  };
}
