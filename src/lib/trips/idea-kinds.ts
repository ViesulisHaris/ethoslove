import { TRIPS, type Trip } from "./presets";

/**
 * The pages by kind of trip (`/trips/ideas/<kind>`), read from the trips' own data. Four kinds are
 * searched; a kind is a page only with four trips or more, and only where its list is not the same
 * as a kind searched more (BRIEF-trips2.md §2). With the twelve trips as they are, two are pages:
 * weekend getaways and road trips. "Romantic city breaks" is the weekend list again, and "cheap
 * trips in Europe" is one trip. tests/unit/trip-ideas.test.ts works it out from the data.
 */
export const TRIP_IDEA_CANDIDATES = ["weekend-getaways", "cheap-trips-in-europe", "romantic-city-breaks", "road-trips"] as const;
export type TripIdeaCandidate = (typeof TRIP_IDEA_CANDIDATES)[number];
export const IDEA_MIN_TRIPS = 4;
/** A Friday to a Monday, as the flight search's weekend is (flights.ts, WEEKEND_NIGHTS). */
export const WEEKEND_MAX_DAYS = 4;

const RULES: Record<TripIdeaCandidate, (trip: Trip) => boolean> = {
  "weekend-getaways": (trip) => trip.days <= WEEKEND_MAX_DAYS,
  "cheap-trips-in-europe": (trip) => trip.budget === 1,
  "romantic-city-breaks": (trip) => trip.kind === "city",
  "road-trips": (trip) => trip.kind === "road",
};

/** The trips a kind truly holds, read from their own data, in the trips' own order. */
export function ideaTrips(kind: TripIdeaCandidate, trips: readonly Trip[] = TRIPS): Trip[] {
  return trips.filter(RULES[kind]);
}

/** The kinds that are pages: four trips or more, and not the same list as a kind before it. */
export function builtIdeaKinds(trips: readonly Trip[] = TRIPS): TripIdeaCandidate[] {
  const lists: string[] = [];
  const built: TripIdeaCandidate[] = [];
  for (const kind of TRIP_IDEA_CANDIDATES) {
    const list = ideaTrips(kind, trips).map((t) => t.id).join(",");
    if (ideaTrips(kind, trips).length >= IDEA_MIN_TRIPS && !lists.includes(list)) built.push(kind);
    lists.push(list);
  }
  return built;
}

export const TRIP_IDEA_KINDS = ["weekend-getaways", "road-trips"] as const;
export type TripIdeaKind = (typeof TRIP_IDEA_KINDS)[number];
export const getTripIdeaKind = (slug: string): TripIdeaKind | null => (TRIP_IDEA_KINDS as readonly string[]).includes(slug) ? (slug as TripIdeaKind) : null;
export const ideaPath = (kind: TripIdeaKind): string => `/trips/ideas/${kind}`;
