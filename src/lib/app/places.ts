import { kindImage } from "@/lib/dates/art";
import type { Cost } from "@/lib/dates/cost";
import type { PlaceDetails } from "@/lib/dates/details";
import { linksFor, type SourceId } from "@/lib/dates/elsewhere";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { formatHours, hoursOn } from "@/lib/dates/hours";
import { KIND_IDS, type PlaceKind } from "@/lib/dates/kinds";
import { matchPhotos, type Sight } from "@/lib/dates/photos";
import type { Place } from "@/lib/dates/places";
import { rankPlaces, type Rating, type Ratings } from "@/lib/dates/rank";
import { sellsTickets, ticketQuery } from "@/lib/dates/ticketed";
import { mergePlaces } from "@/lib/dates/tiles";
import { tiqetsSearch } from "@/lib/trips/partners";

/**
 * The Explore list as the /dates page works it out in the browser (components/dates/dates-explorer.tsx),
 * done once on the server for the iPhone app: the neighbourhood's places and the rare finds merged,
 * photographs matched to them (a pictured place goes up a little), distances from the search's
 * centre, couples' ratings, then ranked "best". Pure, so the tests can hold it to the page's order.
 * Contract: Ethos app docs/ARCHITECTURE.md §2.6.2–§2.6.3.
 */
export type RankedPlace = Place & {
  cost: Cost;
  /** True when couples' typical answer replaced the guess. */
  costReported: boolean;
  rating: Rating | null;
  rank: number;
  groupRank: number;
  groupSize: number;
  /** The kind's illustration, for when there is no photograph: never passed off as the place. */
  image: string;
};

const isCost = (value: unknown): value is Cost => value === 0 || value === 1 || value === 2 || value === 3;

export function rankForApp(input: { center: LatLng; places: Place[]; rare?: Place[] | null; sights?: Sight[]; ratings?: Ratings }): RankedPlace[] {
  const merged = mergePlaces(input.places, input.rare ?? []);
  const { byPlace } = matchPhotos(merged, input.sights ?? []);
  // A place with a real photograph of it goes up a little: the first screen should be worth looking at.
  const pictured = merged.map((p) => {
    const sight = byPlace.get(p.id);
    return sight ? { ...p, photo: sight.photo, about: sight.description, articleUrl: sight.articleUrl, notable: true, score: p.score + 6 } : p;
  });
  if (byPlace.size > 0) pictured.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
  const measured = pictured.map((p) => ({ ...p, distanceKm: Math.round(distanceKm(input.center, p) * 100) / 100 }));
  return rankPlaces(measured, input.ratings ?? {}, "best").map((p) => ({
    ...p,
    rating: p.rating ?? null,
    costReported: isCost(p.rating?.cost),
    image: kindImage(p.kind, p.id),
  }));
}

export type DayOpening = { weekday: number; known: boolean; ranges: [number, number][]; text: string | null };

/** The week's opening hours, Sunday (0) first, read from OpenStreetMap's `opening_hours`; null when there are none. */
export function placeWeek(hours: string | undefined): DayOpening[] | null {
  if (!hours) return null;
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const day = hoursOn(hours, weekday);
    return day.known ? { weekday, known: true, ranges: day.ranges, text: formatHours(day) } : { weekday, known: false, ranges: [], text: null };
  });
}

export const isPlaceKind = (value: unknown): value is PlaceKind => typeof value === "string" && (KIND_IDS as string[]).includes(value);

/**
 * "Photos & reviews elsewhere" and "Tickets", as the place sheet builds them: searches on the sites
 * we don't have ratings from (a place the map has no name for has nothing to search), and Tiqets
 * where a kind of place usually sells a door (lib/dates/ticketed.ts). `where` is the town searched
 * in, which narrows both when the address hasn't said it.
 */
export function placeExtras(input: {
  name: string;
  lat: number;
  lng: number;
  locale: "en" | "es";
  details: PlaceDetails | null;
  kind?: PlaceKind | null;
  named?: boolean;
  notable?: boolean;
  where?: string;
}): { links: { source: SourceId; url: string }[]; tickets: string | null } {
  const named = input.named !== false && input.name.trim().length > 0;
  const where = input.where?.trim() || undefined;
  const address = input.details?.address || where;
  const links = named ? linksFor({ name: input.name.trim(), address, lat: input.lat, lng: input.lng }) : [];
  const ticketed = Boolean(input.kind) && sellsTickets({ kind: input.kind!, named, notable: Boolean(input.notable || input.details?.notable) });
  return { links, tickets: ticketed ? tiqetsSearch(ticketQuery(input.name, where), input.locale) : null };
}
