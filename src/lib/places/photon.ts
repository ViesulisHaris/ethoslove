/**
 * Turns a Photon (OpenStreetMap) search response into the places the editor offers. Only
 * settlements are kept, because a province or a road is not somewhere two people live; the
 * same town listed twice a few hundred metres apart collapses into one; anything malformed is
 * dropped rather than trusted.
 */
export type PlaceResult = { name: string; region?: string; country?: string; kind: string; lat: number; lng: number };

const SETTLEMENTS = new Set(["city", "town", "village", "hamlet", "municipality", "suburb", "borough", "quarter", "neighbourhood", "locality", "island", "isolated_dwelling"]);

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);
const round = (value: number) => Math.round(value * 1e4) / 1e4;

export function parsePhoton(json: unknown, limit = 8): PlaceResult[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: PlaceResult[] = [];
  for (const feature of features) {
    const props = ((feature as { properties?: unknown })?.properties ?? {}) as Record<string, unknown>;
    const coords = (feature as { geometry?: { coordinates?: unknown } })?.geometry?.coordinates;
    const name = text(props.name, 60);
    const kind = text(props.osm_value, 30);
    if (!name || !kind || !SETTLEMENTS.has(kind) || !Array.isArray(coords)) continue;
    const [lng, lat] = coords;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const place: PlaceResult = { name, kind, lat: round(lat), lng: round(lng) };
    const region = text(props.state, 60);
    const country = text(props.country, 60);
    if (region) place.region = region;
    if (country) place.country = country;
    const duplicate = out.some((p) => p.name === place.name && p.country === place.country && Math.abs(p.lat - place.lat) < 0.05 && Math.abs(p.lng - place.lng) < 0.05);
    if (duplicate) continue;
    out.push(place);
    if (out.length >= limit) break;
  }
  return out;
}
