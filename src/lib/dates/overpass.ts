import type { LatLng } from "./geo";

/**
 * The kinds of place the map tiles leave out and a date is often built round: bowling, arcades,
 * climbing walls, karaoke, boats, spas, wineries, a planetarium, the beach. They are rare, so they
 * are looked for over a wide area, and asked of Overpass (OpenStreetMap's query servers) in one
 * small request. Those servers are shared and often busy; this is only ever a bonus on top of
 * what the tiles already gave, and the page never waits for it.
 */
const RARE_FILTERS = [
  "nw[leisure=bowling_alley]",
  "nw[leisure=amusement_arcade]",
  "nw[leisure=miniature_golf]",
  "nw[leisure=escape_game]",
  "nw[leisure=ice_rink]",
  'nw[sport=climbing][leisure~"^sports_(centre|hall)$"]',
  "nw[amenity=karaoke_box]",
  "nw[amenity=boat_rental]",
  "nw[amenity=planetarium]",
  "nw[leisure=spa][name]",
  "nw[leisure=sauna][name]",
  "nw[amenity=public_bath][name]",
  "nw[craft=winery][name]",
  "nwr[natural=beach][name]",
] as const;

export const RARE_RADIUS_M = 8000;
const RARE_CAP = 160;

/** South, west, north, east of a square round a point: a box is far cheaper for Overpass than a circle. */
export function boxAround(center: LatLng, radiusM: number): [number, number, number, number] {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.1, Math.cos((center.lat * Math.PI) / 180)));
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [r(center.lat - dLat), r(center.lng - dLng), r(center.lat + dLat), r(center.lng + dLng)];
}

export function buildRareQuery(center: LatLng, radiusM = RARE_RADIUS_M): string {
  return `[out:json][timeout:15][bbox:${boxAround(center, radiusM).join(",")}];(${RARE_FILTERS.map((f) => `${f};`).join("")});out center tags ${RARE_CAP};`;
}

/** One element by its id ("node/123"): the fallback for a place's details. */
export function buildIdQuery(id: string): string | null {
  const m = /^(node|way|relation)\/(\d{1,15})$/.exec(id);
  return m ? `[out:json][timeout:8];${m[1]}(${m[2]});out center tags 1;` : null;
}

/** Public Overpass servers, tried in order. All of them refuse requests without a real user agent. */
export const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"] as const;
