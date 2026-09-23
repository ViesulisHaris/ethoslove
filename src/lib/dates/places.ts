import { distanceKm, type LatLng } from "./geo";
import { KINDS, kindOf, type PlaceGroup, type PlaceKind } from "./kinds";
import type { PlacePhoto } from "./photos";

/** One place worth going to, as the pages use it. Everything here came off the map; nothing is invented. */
export type Place = {
  /** "node/123": stable, and what a saved plan remembers it by. */
  id: string;
  name: string;
  /** False when the map has no name for it and the kind's label stands in. */
  named: boolean;
  kind: PlaceKind;
  group: PlaceGroup;
  lat: number;
  lng: number;
  distanceKm: number;
  address?: string;
  cuisine: string[];
  website?: string;
  phone?: string;
  /** The raw `opening_hours`, read per day by hours.ts. */
  hours?: string;
  outdoorSeating: boolean;
  vegetarian: boolean;
  stepFree: boolean;
  /** Has an encyclopedia entry: a landmark rather than a corner café. */
  notable: boolean;
  score: number;
  /** A real photograph of this very place, with its credit. Never a stand-in. */
  photo?: PlacePhoto;
  /** A line about it, and where that line came from. */
  about?: string;
  articleUrl?: string;
};

type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Cuisines a dinner for two tends to be booked at. A nudge in the ranking, nothing more. */
const DATE_NIGHT = new Set(["italian", "french", "japanese", "sushi", "tapas", "mediterranean", "seafood", "steak_house", "thai", "indian", "spanish", "portuguese", "greek", "regional", "fine_dining", "wine", "fondue", "pizza", "peruvian", "korean", "vietnamese", "mexican", "lebanese", "georgian"]);

const http = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const url = value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

function addressOf(tags: Record<string, string>): string | undefined {
  const street = tags["addr:street"];
  if (!street) return undefined;
  const number = tags["addr:housenumber"];
  const line = number ? `${street} ${number}` : street;
  const city = tags["addr:city"];
  return city ? `${line}, ${city}` : line;
}

/**
 * How good a bet a place is for a date, from what the map knows. Places somebody has looked after
 * (hours, a website) come first, a terrace and a landmark help, a chain counts against, and
 * distance from where they searched takes off up to a third. It ranks; it is never shown as a rating.
 */
export function scorePlace(tags: Record<string, string>, kind: PlaceKind, km: number, radiusKm: number): number {
  let score = 50;
  if (tags.website || tags["contact:website"]) score += 10;
  if (tags.opening_hours) score += 8;
  if (tags.outdoor_seating === "yes") score += 6;
  if (tags.wikidata || tags.wikipedia) score += 12;
  if ((tags.cuisine ?? "").split(";").some((c) => DATE_NIGHT.has(c.trim()))) score += 5;
  if (tags.brand || tags["brand:wikidata"]) score -= 25;
  if (tags.takeaway === "only") score -= 20;
  if (KINDS[kind].group !== "eat" && KINDS[kind].group !== "sweet") score += 8; // rarer, and the reason to go out at all
  score -= Math.min(1, km / Math.max(0.5, radiusKm)) * 30;
  return Math.round(score);
}

/** Turns an Overpass answer into places: named, deduplicated, ranked, nearest-and-best first. */
export function parseOverpass(json: unknown, center: LatLng, radiusM: number, kindLabel: (kind: PlaceKind) => string): Place[] {
  const elements = (json as { elements?: Element[] } | null)?.elements;
  if (!Array.isArray(elements)) return [];
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const el of elements) {
    const tags = el.tags;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!tags || typeof lat !== "number" || typeof lng !== "number") continue;
    const kind = kindOf(tags);
    if (!kind) continue;
    const info = KINDS[kind];
    const ownName = (tags.name ?? "").trim();
    if (!ownName && !info.nameless) continue;
    // The same café is often mapped twice, as a point and as the building round it.
    const key = `${kind}|${ownName.toLowerCase() || `${lat.toFixed(4)},${lng.toFixed(4)}`}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const km = distanceKm(center, { lat, lng });
    places.push({
      id: `${el.type}/${el.id}`,
      name: ownName || kindLabel(kind),
      named: Boolean(ownName),
      kind,
      group: info.group,
      lat,
      lng,
      distanceKm: Math.round(km * 100) / 100,
      address: addressOf(tags),
      cuisine: (tags.cuisine ?? "").split(";").map((c) => c.trim().replace(/_/g, " ")).filter(Boolean).slice(0, 3),
      website: http(tags.website ?? tags["contact:website"]),
      phone: tags.phone ?? tags["contact:phone"],
      hours: tags.opening_hours,
      outdoorSeating: tags.outdoor_seating === "yes",
      vegetarian: tags["diet:vegetarian"] === "yes" || tags["diet:vegetarian"] === "only" || tags["diet:vegan"] === "yes" || tags["diet:vegan"] === "only",
      stepFree: tags.wheelchair === "yes",
      notable: Boolean(tags.wikidata || tags.wikipedia),
      score: scorePlace(tags, kind, km, radiusM / 1000),
    });
  }
  return places.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}

/** Enough of each group to fill the map without sending a city's every restaurant to a phone. */
export const SEARCH_PER_GROUP = 60;
/** Held for every kind before a group's other places are counted: enough for an idea's stop and a "show me another". */
const PER_KIND = 5;

/**
 * The best of each group, so a city's two hundred restaurants never crowd out its one planetarium;
 * and inside a group, the best few of every kind first, so twenty-five bookshops and nineteen
 * theatres never crowd out the cinema that "a film and a late dessert" needs. Order is kept, and
 * no group ever gets more than `perGroup`.
 */
export function balance(places: Place[], perGroup: number, perKind = PER_KIND): Place[] {
  const byGroup: Partial<Record<PlaceGroup, number>> = {};
  const byKind: Partial<Record<PlaceKind, number>> = {};
  const held = new Set<string>();
  for (const p of places) {
    if ((byKind[p.kind] ?? 0) >= perKind || (byGroup[p.group] ?? 0) >= perGroup) continue;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byGroup[p.group] = (byGroup[p.group] ?? 0) + 1;
    held.add(p.id);
  }
  return places.filter((p) => {
    if (held.has(p.id)) return true;
    const n = byGroup[p.group] ?? 0;
    if (n >= perGroup) return false;
    byGroup[p.group] = n + 1;
    return true;
  });
}
