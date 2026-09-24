import { kindOf } from "./kinds";
import { quirkOfTags, type Quirk } from "./unusual";

/**
 * What is worth knowing about one place before going: where exactly, when it is open, how to book.
 * Looked up when somebody opens a place, from OpenStreetMap through Nominatim, and shown as it is
 * found. Where the map knows nothing, the page says nothing; it never fills a gap with a guess.
 */
export type PlaceDetails = {
  id: string;
  address?: string;
  /** The raw `opening_hours`, read per day by hours.ts. */
  hours?: string;
  website?: string;
  phone?: string;
  cuisine: string[];
  outdoorSeating: boolean;
  vegetarian: boolean;
  stepFree: boolean;
  notable: boolean;
  /** A sentence from the map itself, when a mapper wrote one. */
  description?: string;
  /** Its Wikidata item ("Q42"), which is how its photograph is found. */
  wikidata?: string;
  /** A cellar, a roof, a lighthouse: what the full tags say that the list's name didn't. */
  quirk?: Quirk;
};

export const isPlaceId = (id: string): boolean => /^(node|way|relation)\/\d{1,15}$/.test(id);

/** "node/123" as Nominatim's lookup wants it: "N123". */
export const nominatimIdOf = (id: string): string | null => {
  const m = /^(node|way|relation)\/(\d{1,15})$/.exec(id);
  return m ? `${m[1][0].toUpperCase()}${m[2]}` : null;
};

export const safeUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const text = value.trim();
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname.includes(".") ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

const yes = (v: string | undefined) => v === "yes" || v === "only";

/** Details from a bag of OpenStreetMap tags, whichever server they came from. */
export function detailsFromTags(id: string, tags: Record<string, string | undefined>, address?: string): PlaceDetails {
  const street = tags["addr:street"];
  const line = street ? [tags["addr:housenumber"] ? `${street} ${tags["addr:housenumber"]}` : street, tags["addr:city"]].filter(Boolean).join(", ") : undefined;
  const description = (tags.description ?? "").trim();
  const kind = kindOf(tags);
  const quirk = kind ? quirkOfTags(tags, kind) : null;
  return {
    id,
    address: address || line,
    hours: tags.opening_hours || undefined,
    website: safeUrl(tags.website ?? tags["contact:website"] ?? tags.url),
    phone: (tags.phone ?? tags["contact:phone"])?.slice(0, 40),
    cuisine: (tags.cuisine ?? "").split(";").map((c) => c.trim().replace(/_/g, " ")).filter(Boolean).slice(0, 3),
    outdoorSeating: tags.outdoor_seating === "yes",
    vegetarian: yes(tags["diet:vegetarian"]) || yes(tags["diet:vegan"]),
    stepFree: tags.wheelchair === "yes",
    notable: Boolean(tags.wikidata || tags.wikipedia),
    wikidata: /^Q[1-9]\d{0,11}$/.test(tags.wikidata ?? "") ? tags.wikidata : undefined,
    description: description ? (description.length > 220 ? `${description.slice(0, 217).trimEnd()}…` : description) : undefined,
    ...(quirk ? { quirk } : {}),
  };
}

type NominatimResult = { osm_type?: string; osm_id?: number; category?: string; type?: string; name?: string; address?: Record<string, string>; extratags?: Record<string, string> | null };

/** A street address the way it is written locally enough to find the door: "Rua X 12, Bairro Alto, Lisbon". */
export function addressLine(address: Record<string, string> | undefined): string | undefined {
  if (!address) return undefined;
  const road = address.road ?? address.pedestrian ?? address.footway ?? address.square ?? address.path;
  const street = road ? (address.house_number ? `${road} ${address.house_number}` : road) : undefined;
  const area = address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district;
  const town = address.city ?? address.town ?? address.village ?? address.municipality;
  const parts = [street, area !== town ? area : undefined, town].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function parseNominatim(json: unknown, id: string): PlaceDetails | null {
  if (!Array.isArray(json)) return null;
  const wanted = nominatimIdOf(id);
  const hit = (json as NominatimResult[]).find((r) => r && typeof r.osm_id === "number" && `${(r.osm_type ?? "")[0]?.toUpperCase()}${r.osm_id}` === wanted);
  if (!hit) return null;
  // Nominatim keeps what the place is (amenity=bar) apart from its other tags; put it back to read them.
  const main = hit.category && hit.type ? { [hit.category]: hit.type } : {};
  return detailsFromTags(id, { ...(hit.extratags ?? {}), ...main, ...(hit.name ? { name: hit.name } : {}) }, addressLine(hit.address));
}

export function parseOverpassOne(json: unknown, id: string): PlaceDetails | null {
  const el = (json as { elements?: { type?: string; id?: number; tags?: Record<string, string> }[] } | null)?.elements?.[0];
  if (!el?.tags || `${el.type}/${el.id}` !== id) return null;
  return detailsFromTags(id, el.tags);
}
