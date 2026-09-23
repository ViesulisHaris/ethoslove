/**
 * Turns a Photon (OpenStreetMap) search response into the places the editor offers. Only
 * settlements are kept, because a province or a road is not somewhere two people live; the
 * same town listed twice a few hundred metres apart collapses into one; anything malformed is
 * dropped rather than trusted.
 */
export type PlaceResult = { name: string; region?: string; country?: string; countryCode?: string; kind: string; lat: number; lng: number };

const SETTLEMENTS = new Set(["city", "town", "village", "hamlet", "municipality", "suburb", "borough", "quarter", "neighbourhood", "locality", "island", "isolated_dwelling"]);

/** False for a city that OpenStreetMap maps only as the region it governs (Tokyo's "province"). */
export const isSettlement = (kind: string): boolean => SETTLEMENTS.has(kind);

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);
const round = (value: number) => Math.round(value * 1e4) / 1e4;

/**
 * How big a kind of place is, smallest number first. Photon ranks a name typed without its accent
 * below every place spelled exactly that way, so "Valparaiso" listed a city in Indiana, three
 * villages and two Brazilian towns ahead of Valparaíso in Chile, and cut it off the list. Within a
 * kind Photon's own order stands: it knows Cambridge in England from Cambridge in Ontario, which
 * nothing in its answer (no population; big cities are often a point with no extent) could.
 */
const KIND_RANK: Record<string, number> = { city: 0, town: 1, municipality: 1, borough: 1, village: 2, suburb: 2, quarter: 2, locality: 2, island: 2, hamlet: 3, neighbourhood: 3, isolated_dwelling: 3 };

const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export function parsePhoton(json: unknown, limit = 8, query = ""): PlaceResult[] {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const wanted = fold(query);
  // The name typed (accents aside), then the kind of place, then Photon's own order.
  const scored = features
    .map((feature, index) => {
      const props = ((feature as { properties?: unknown } | null)?.properties ?? {}) as Record<string, unknown>;
      const name = typeof props.name === "string" ? fold(props.name) : "";
      const match = !wanted ? 0 : name === wanted ? 0 : name.startsWith(wanted) ? 1 : 2;
      // A city mapped only as its region (Tokyo's "province") is still a city.
      const kind = typeof props.osm_value === "string" ? (KIND_RANK[props.osm_value] ?? (props.type === "city" ? 0 : 3)) : 3;
      return { feature, index, match, kind };
    })
    .sort((a, b) => a.match - b.match || a.kind - b.kind || a.index - b.index);
  const out: PlaceResult[] = [];
  for (const { feature } of scored) {
    const props = ((feature as { properties?: unknown })?.properties ?? {}) as Record<string, unknown>;
    const coords = (feature as { geometry?: { coordinates?: unknown } })?.geometry?.coordinates;
    const name = text(props.name, 60);
    const kind = text(props.osm_value, 30);
    // Some cities are mapped only as the region they govern: Tokyo is a "province", Kuala Lumpur a
    // "state". Photon still calls them a city, and without them "Tokyo" finds its airport first.
    const cityLike = SETTLEMENTS.has(kind ?? "") || props.type === "city";
    if (!name || !kind || !cityLike || !Array.isArray(coords)) continue;
    const [lng, lat] = coords;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const place: PlaceResult = { name, kind, lat: round(lat), lng: round(lng) };
    const region = text(props.state, 60);
    const country = text(props.country, 60);
    const countryCode = text(props.countrycode, 3)?.toUpperCase();
    if (region) place.region = region;
    if (country) place.country = country;
    // The name of the country in the searcher's own language can be worked out from this; Photon
    // otherwise gives it in the country's ("日本" to somebody typing "Tokio").
    if (countryCode && /^[A-Z]{2}$/.test(countryCode)) place.countryCode = countryCode;
    const duplicate = out.some((p) => p.name === place.name && p.country === place.country && Math.abs(p.lat - place.lat) < 0.05 && Math.abs(p.lng - place.lng) < 0.05);
    if (duplicate) continue;
    out.push(place);
    if (out.length >= limit) break;
  }
  return out;
}
