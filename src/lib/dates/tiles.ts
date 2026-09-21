import { distanceKm, type LatLng } from "./geo";
import { KINDS, kindOfPoi, type PlaceKind } from "./kinds";
import type { Place } from "./places";

/**
 * Places read out of the map's own vector tiles. The tiles that draw the streets also carry every
 * café, viewpoint and museum OpenStreetMap knows, with a name and what it is, and they come off a
 * CDN in a tenth of a second with no quota. They do not carry opening hours or a website; those
 * are looked up for one place at a time, when somebody opens it (details.ts).
 */
export const POI_ZOOM = 14;
export type TileXY = { x: number; y: number };

/** One point of interest as it sits in a tile: integer coordinates inside the tile's own square. */
export type PoiFeature = { id: number | undefined; px: number; py: number; extent: number; properties: Record<string, unknown> };

const rad = (deg: number) => (deg * Math.PI) / 180;

export function tileAt(point: LatLng, zoom = POI_ZOOM): TileXY {
  const n = 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, point.lat));
  const x = Math.floor(((point.lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2) * n);
  return { x: ((x % n) + n) % n, y: Math.max(0, Math.min(n - 1, y)) };
}

/** Where a position inside a tile is on the earth. */
export function tilePointToLatLng(tile: TileXY, px: number, py: number, extent: number, zoom = POI_ZOOM): LatLng {
  const n = 2 ** zoom;
  const lng = ((tile.x + px / extent) / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (tile.y + py / extent)) / n))) * 180) / Math.PI;
  return { lat, lng };
}

/**
 * The tiles a search circle touches, nearest first and never more than `max`: tiles get narrower
 * towards the poles, and a wide circle over Helsinki would otherwise ask for thirty.
 */
export function tilesCovering(center: LatLng, radiusM: number, max = 9, zoom = POI_ZOOM): TileXY[] {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.1, Math.cos(rad(center.lat))));
  const a = tileAt({ lat: center.lat + dLat, lng: center.lng - dLng }, zoom);
  const b = tileAt({ lat: center.lat - dLat, lng: center.lng + dLng }, zoom);
  const n = 2 ** zoom;
  const home = tileAt(center, zoom);
  const tiles: (TileXY & { d: number })[] = [];
  // Across the date line `a.x` is greater than `b.x`; walk east from one to the other, wrapping.
  const width = ((b.x - a.x + n) % n) + 1;
  for (let i = 0; i < Math.min(width, 8); i++) {
    const x = (a.x + i) % n;
    for (let y = a.y; y <= Math.min(b.y, a.y + 7); y++) {
      const dx = Math.min(Math.abs(x - home.x), n - Math.abs(x - home.x));
      tiles.push({ x, y, d: dx * dx + (y - home.y) ** 2 });
    }
  }
  return tiles.sort((p, q) => p.d - q.d || p.y - q.y || p.x - q.x).slice(0, max).map(({ x, y }) => ({ x, y }));
}

/**
 * OpenMapTiles folds the OpenStreetMap id and its type into one number: the last digit is the
 * type, the rest is the id. It is what lets a place in a tile be looked up again later.
 */
export function osmIdOf(featureId: number | undefined): string | null {
  if (typeof featureId !== "number" || !Number.isSafeInteger(featureId) || featureId < 10) return null;
  const type = ["", "node", "way", "relation"][featureId % 10];
  return type ? `${type}/${Math.floor(featureId / 10)}` : null;
}

/** Rarer kinds are the reason to go out at all, so they are not buried under two hundred restaurants. */
const KIND_BONUS: Partial<Record<PlaceKind, number>> = { viewpoint: 14, museum: 10, gallery: 8, theatre: 8, cinema: 8, bookshop: 8, garden: 8, park: 6, landmark: 6, minigolf: 16, escape: 16, skating: 16, zoo: 12, themepark: 12, picnic: 4, dessert: 4 };

/** Tiles give no sign of how good a place is, so this only orders by how near and how unusual. Never shown as a rating. */
export function scorePoi(kind: PlaceKind, km: number, radiusKm: number, rank: number): number {
  const nearness = 1 - Math.min(1, km / Math.max(0.3, radiusKm));
  // `rank` orders the labels inside one small square of the tile: a tie-break, nothing more.
  return Math.round(40 + nearness * 40 + (KIND_BONUS[kind] ?? 0) - Math.min(10, rank / 8));
}

const localName = (p: Record<string, unknown>, locale: "en" | "es"): string => {
  const pick = (key: string) => (typeof p[key] === "string" ? (p[key] as string).trim() : "");
  // The name on the door first: a couple will be looking for that sign, not a translation of it.
  return pick("name") || pick(`name:${locale}`) || pick("name_en") || pick("name:latin");
};

/** The date-worthy places in one tile's points of interest that fall inside the search circle. */
export function placesFromPois(features: PoiFeature[], tile: TileXY, center: LatLng, radiusM: number, locale: "en" | "es"): Place[] {
  const places: Place[] = [];
  for (const f of features) {
    // A tile repeats what lies just over its edge, for drawing labels; the neighbour owns those.
    if (f.px < 0 || f.py < 0 || f.px >= f.extent || f.py >= f.extent) continue;
    const kind = kindOfPoi(f.properties.subclass);
    if (!kind) continue;
    const id = osmIdOf(f.id);
    if (!id) continue;
    const info = KINDS[kind];
    const name = localName(f.properties, locale);
    if (!name && !info.nameless) continue;
    const { lat, lng } = tilePointToLatLng(tile, f.px, f.py, f.extent);
    const km = distanceKm(center, { lat, lng });
    if (km * 1000 > radiusM) continue;
    const rank = typeof f.properties.rank === "number" ? f.properties.rank : 99;
    places.push({
      id,
      name: name || info.label[locale],
      named: Boolean(name),
      kind,
      group: info.group,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      distanceKm: Math.round(km * 100) / 100,
      cuisine: [],
      outdoorSeating: false,
      vegetarian: false,
      stepFree: false,
      notable: false,
      score: scorePoi(kind, km, radiusM / 1000, rank),
    });
  }
  return places;
}

/** One list from many tiles and sources: no place twice (the richer record wins), best first. */
export function mergePlaces(...lists: Place[][]): Place[] {
  const byId = new Map<string, Place>();
  const byName = new Set<string>();
  for (const place of lists.flat()) {
    const existing = byId.get(place.id);
    if (existing) {
      if (!existing.hours && place.hours) byId.set(place.id, { ...place, score: Math.max(place.score, existing.score) });
      continue;
    }
    // A museum mapped as a building and again as a point has two ids and one name, a few metres apart.
    const key = `${place.kind}|${place.name.toLowerCase()}|${place.lat.toFixed(3)},${place.lng.toFixed(3)}`;
    if (place.named && byName.has(key)) continue;
    byName.add(key);
    byId.set(place.id, place);
  }
  return [...byId.values()].sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
}
