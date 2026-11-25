import { findAirport } from "./airports";
import { matchTrips, type MatchTrip } from "./match";
import { TRIPS } from "./presets";

/**
 * The pages by where you leave from (`/trips/from-<city>`): the twelve trips ranked for a couple
 * leaving from one city, with what the matcher already knows (hours in the air, the trip that
 * starts there). Hours, never a fare. A page exists only where at least six of the twelve are
 * within five hours in the air, start there, or work by a direct train; every trip is in Europe,
 * so no American city has one (tests/unit/trip-origins.test.ts computes it).
 */
export type TripOrigin = {
  /** "london": the address is /trips/from-london. */
  slug: string;
  /** IATA, in AIRPORTS. */
  airport: string;
  name: { en: string; es: string };
  /** The slug of its /dates/<city> page. */
  city: string;
  /** How this city is searched: the title's first words ("Weekend trips from…", "City breaks from…"). */
  phrase: "weekend" | "city-breaks";
  /**
   * The trips a direct train of about five hours or less reaches, checked by hand on the operators'
   * own timetables (Eurostar, LNER, ScotRail, TransPennine Express, Avanti and CrossCountry,
   * EuroCity). Not `trainHint`'s 600 km, which says yes across a sea. Do not add one unchecked.
   */
  trains: readonly string[];
};

export const ORIGIN_PREFIX = "from-";
export const ORIGIN_MAX = 10;
export const ORIGIN_MIN_TRIPS = 6;
export const ORIGIN_MAX_AIR_MINUTES = 300;

/**
 * In this order: it is the order of the links on /trips. Seven, because a page is kept only where
 * its six cards are its own: Glasgow, Manchester and Birmingham were searched too, but from each
 * the six nearest trips are Edinburgh's or Dublin's in the same order (or one swap), so their pages
 * would be another city's with the name changed. tests/unit/trip-origins.test.ts (O12) fails on
 * two origins whose six cards match.
 */
export const TRIP_ORIGINS: readonly TripOrigin[] = [
  { slug: "london", airport: "LHR", name: { en: "London", es: "Londres" }, city: "london", phrase: "weekend", trains: ["paris-without-cliches", "amsterdam-by-bike", "scottish-highlands"] },
  { slug: "edinburgh", airport: "EDI", name: { en: "Edinburgh", es: "Edimburgo" }, city: "edinburgh", phrase: "city-breaks", trains: [] },
  { slug: "dublin", airport: "DUB", name: { en: "Dublin", es: "Dublín" }, city: "dublin", phrase: "city-breaks", trains: [] },
  { slug: "paris", airport: "CDG", name: { en: "Paris", es: "París" }, city: "paris", phrase: "weekend", trains: ["amsterdam-by-bike"] },
  { slug: "amsterdam", airport: "AMS", name: { en: "Amsterdam", es: "Ámsterdam" }, city: "amsterdam", phrase: "weekend", trains: ["paris-without-cliches"] },
  { slug: "berlin", airport: "BER", name: { en: "Berlin", es: "Berlín" }, city: "berlin", phrase: "weekend", trains: ["prague-krumlov-vienna"] },
  { slug: "riga", airport: "RIX", name: { en: "Riga", es: "Riga" }, city: "riga", phrase: "weekend", trains: [] },
];

export type OriginTrip = { id: string; home: boolean; train: boolean; airMinutes?: number; km?: number };

/**
 * All the trips once, nearest first: the one that starts at this airport, then by the distance to
 * the trip's airport (the minutes in the air are that distance rounded to five, so they never fall
 * down the list; two trips the same minutes away keep the order the map gives them, not the
 * trips' own order).
 */
export function tripsFrom(origin: Pick<TripOrigin, "airport" | "trains">, trips: readonly MatchTrip[] = TRIPS): OriginTrip[] {
  const from = findAirport(origin.airport);
  if (!from) return [];
  const order = new Map(trips.map((t, i) => [t.id, i]));
  // The month only moves "in season", which is not read here.
  return matchTrips({ from }, trips, 1)
    .map((p): OriginTrip => ({ id: p.id, home: p.home, train: origin.trains.includes(p.id), ...(p.airMinutes !== undefined ? { airMinutes: p.airMinutes } : {}), ...(p.km !== undefined ? { km: p.km } : {}) }))
    .sort((a, b) => Number(b.home) - Number(a.home) || (a.airMinutes ?? 0) - (b.airMinutes ?? 0) || (a.km ?? 0) - (b.km ?? 0) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** How many of the trips are within five hours in the air, start here, or work by train. */
export function reachable(origin: Pick<TripOrigin, "airport" | "trains">, trips: readonly MatchTrip[] = TRIPS): number {
  return tripsFrom(origin, trips).filter((t) => t.home || t.train || (t.airMinutes !== undefined && t.airMinutes <= ORIGIN_MAX_AIR_MINUTES)).length;
}

/** The six cards of an origin's page: nearest first, without the trip that starts there (that one is the page's hero). */
export const ORIGIN_CARDS = 6;
export function originCards(origin: Pick<TripOrigin, "airport" | "trains">, trips: readonly MatchTrip[] = TRIPS): OriginTrip[] {
  return tripsFrom(origin, trips)
    .filter((t) => !t.home)
    .slice(0, ORIGIN_CARDS);
}

export const originPath = (origin: Pick<TripOrigin, "slug">): string => `/trips/${ORIGIN_PREFIX}${origin.slug}`;

/** "from-london" → London's origin; anything else null. */
export function originOfParam(id: string): TripOrigin | null {
  if (!id.startsWith(ORIGIN_PREFIX)) return null;
  const slug = id.slice(ORIGIN_PREFIX.length);
  return TRIP_ORIGINS.find((o) => o.slug === slug) ?? null;
}
