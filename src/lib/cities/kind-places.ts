import { guessCost } from "@/lib/dates/cost";
import type { DateKind } from "@/lib/dates/date-kinds";
import type { PlaceKind } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { rankPlaces, type Ranked } from "@/lib/dates/rank";

/** How many places a city-by-kind page names, and how many of one kind at most. */
export const KIND_PLACES = 8;
const PER_KIND = 3;
const MEETING: readonly PlaceKind[] = ["cafe", "bookshop", "gallery", "dessert"];

/**
 * The places of a city that belong to a kind of date, best first by the dates map's own ranking,
 * only places with a name on the door, one of any name, a few of each kind of place at most (the
 * shape of topCityPlaces in ./places.ts). `cheap`: the ones that usually cost nothing to walk into
 * (cost.ts). `first-date`: where to meet. Any other kind has no list.
 */
export function kindPlaces(kind: DateKind, places: Place[], count = KIND_PLACES): Ranked[] {
  // A "landmark" is whatever the map calls an attraction, a sewer lamp and a private house among them:
  // only one with an encyclopedia entry is worth naming on a page.
  const free = (p: Place) => guessCost(p) === 0 && (p.kind !== "landmark" || p.notable);
  const fits = kind === "cheap" ? free : kind === "first-date" ? (p: Place) => MEETING.includes(p.kind) : null;
  if (!fits) return [];
  const names = new Set<string>();
  const taken = new Map<PlaceKind, number>();
  const picked: Ranked[] = [];
  for (const place of rankPlaces(places, {})) {
    if (picked.length === count) break;
    const name = place.name.trim().toLowerCase();
    if (!place.named || !fits(place) || names.has(name) || (taken.get(place.kind) ?? 0) >= PER_KIND) continue;
    names.add(name);
    taken.set(place.kind, (taken.get(place.kind) ?? 0) + 1);
    picked.push(place);
  }
  return picked;
}
