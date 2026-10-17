import type { LatLng } from "@/lib/dates/geo";
import { GROUP_IDS, type PlaceGroup } from "@/lib/dates/kinds";
import { balance, type Place } from "@/lib/dates/places";
import { rankPlaces, type Ranked } from "@/lib/dates/rank";
import { mergePlaces, placesFromPois, type PoiFeature, type TileXY } from "@/lib/dates/tiles";
import { mentionsSpain } from "./cities";

/** How far from the centre a city's page looks: the same circle the dates map searches by default. */
export const CITY_RADIUS_M = 1500;
/** How many real places a city's page names. */
export const PLACES_PER_CITY = 20;
/** No one kind of outing fills the list: twenty restaurants is a directory, not a date. */
const PER_GROUP = 5;
/** Enough of each group to fill every idea's stops, without keeping all of a city's cafés in the cache. */
const KEPT_PER_GROUP = 40;

export type GroupCounts = Partial<Record<PlaceGroup, number>>;
export type CityPlaces = { places: Place[]; counts: GroupCounts };
export type TileRead = { tile: TileXY; features: PoiFeature[]; ok: boolean };

/**
 * What the tiles round a city's centre add up to: the places worth keeping, how many of each group
 * there were, and whether every tile could be read. Null when none could. A place whose name
 * mentions Spain is left out before anything is counted: this page is the site's own words, in
 * a way the live map is not.
 */
export function assembleCityPlaces(reads: TileRead[], center: LatLng, radiusM: number, locale: "en" | "es"): { found: CityPlaces | null; complete: boolean } {
  const complete = reads.every((r) => r.ok);
  if (!reads.some((r) => r.ok)) return { found: null, complete };
  const all = mergePlaces(...reads.map((r) => placesFromPois(r.features, r.tile, center, radiusM, locale))).filter((p) => !mentionsSpain(p.name));
  return { found: { places: balance(all, KEPT_PER_GROUP), counts: countByGroup(all) }, complete };
}

/** How many places of each group the map knows near the centre: the page's "what's here" line. */
export function countByGroup(places: Place[]): GroupCounts {
  const counts: GroupCounts = {};
  for (const p of places) counts[p.group] = (counts[p.group] ?? 0) + 1;
  return counts;
}

/**
 * The places a city's page names, best first by the dates map's own ranking: only places with a
 * name on the door, a few of each group at most, and one of any name, since two branches of a
 * chain are not two recommendations.
 */
export function topCityPlaces(places: Place[], count = PLACES_PER_CITY, perGroup = PER_GROUP): Ranked[] {
  const taken: GroupCounts = {};
  const names = new Set<string>();
  const picked: Ranked[] = [];
  for (const place of rankPlaces(places, {})) {
    if (picked.length === count) break;
    const name = place.name.trim().toLowerCase();
    if (!place.named || names.has(name) || (taken[place.group] ?? 0) >= perGroup) continue;
    names.add(name);
    taken[place.group] = (taken[place.group] ?? 0) + 1;
    picked.push(place);
  }
  return picked;
}

/** A list of places in the map's own group order, leaving out the groups with nothing in them. */
export function byGroup<T extends Pick<Place, "group">>(places: T[]): { group: PlaceGroup; places: T[] }[] {
  return GROUP_IDS.map((group) => ({ group, places: places.filter((p) => p.group === group) })).filter((g) => g.places.length > 0);
}
