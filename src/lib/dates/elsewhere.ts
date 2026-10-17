import type { Place } from "./places";

/**
 * What the rest of the web says about a place.
 *
 * Nobody gives their ratings away. TripAdvisor, Google and Foursquare each want their own key,
 * and their terms are explicit: the score has to be shown with their name and a link back, it
 * cannot be kept for long, and it cannot be scraped out of their pages. So this does two things.
 *
 * With a key, a provider is asked for the place and returns its score (`lookup`). With no key —
 * which is every install until somebody signs up — every place still gets a set of links out,
 * built from its name and its coordinates, so a couple is one tap from the reviews we do not have.
 * The links need no permission from anybody and cost nothing.
 */
export type SourceId = "tripadvisor" | "google" | "yelp";

export type Elsewhere = {
  source: SourceId;
  /** Out of five, as every one of these sites counts. */
  stars: number;
  reviews: number;
  /** Their page for the place: showing a score without it breaks every one of their terms. */
  url: string;
};

export const SOURCE_NAMES: Record<SourceId, string> = { tripadvisor: "Tripadvisor", google: "Google", yelp: "Yelp" };

const query = (place: Pick<Place, "name" | "address">) => encodeURIComponent(`${place.name} ${place.address ?? ""}`.trim());

/**
 * A search on each site for this exact place. No key, no permission, no data kept. The sheet passes
 * the address it shows (or the town, before that arrives): a list place carries none, and "Waterstones"
 * alone could be any of three branches. Google's search takes no place id here: an empty one was
 * only noise in the link.
 */
export function linksFor(place: Pick<Place, "name" | "address" | "lat" | "lng">): { source: SourceId; url: string }[] {
  return [
    { source: "tripadvisor", url: `https://www.tripadvisor.com/Search?q=${query(place)}` },
    { source: "google", url: `https://www.google.com/maps/search/?api=1&query=${query(place)}` },
    { source: "yelp", url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(place.name)}&find_loc=${place.lat},${place.lng}` },
  ];
}

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, metres: number) => Math.abs(a.lat - b.lat) * 111_320 < metres && Math.abs(a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180) < metres;

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The same place, or a different one with a similar name two streets away? Name and position both have to agree. */
export function samePlace(place: Place, candidate: { name: string; lat: number; lng: number }): boolean {
  if (!near(place, candidate, 220)) return false;
  const a = plain(place.name);
  const b = plain(candidate.name);
  return a === b || a.includes(b) || b.includes(a);
}

type Fetcher = typeof fetch;

/**
 * Tripadvisor's Content API: find the place by name and position, then read its rating. Two calls,
 * which is why the answer is worth caching for the day their terms allow.
 * https://tripadvisor-content-api.readme.io — the key is theirs to issue, and the site has to be
 * on the key's allowed list.
 */
export async function tripadvisorRating(place: Place, key: string, doFetch: Fetcher = fetch): Promise<Elsewhere | null> {
  const search = new URL("https://api.content.tripadvisor.com/api/v1/location/search");
  search.searchParams.set("key", key);
  search.searchParams.set("searchQuery", place.name);
  search.searchParams.set("latLong", `${place.lat},${place.lng}`);
  search.searchParams.set("radius", "1");
  search.searchParams.set("radiusUnit", "km");
  const found = await doFetch(search, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!found.ok) return null;
  const list = ((await found.json()) as { data?: { location_id?: string; name?: string }[] }).data ?? [];
  const first = list.find((l) => l.location_id && l.name && plain(l.name).includes(plain(place.name).slice(0, 12)));
  if (!first?.location_id) return null;

  const detail = new URL(`https://api.content.tripadvisor.com/api/v1/location/${first.location_id}/details`);
  detail.searchParams.set("key", key);
  const res = await doFetch(detail, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { rating?: string | number; num_reviews?: string | number; web_url?: string; latitude?: string; longitude?: string; name?: string };
  const stars = Number(data.rating);
  const reviews = Number(data.num_reviews ?? 0);
  if (!Number.isFinite(stars) || stars <= 0 || !data.web_url) return null;
  if (data.name && data.latitude && data.longitude && !samePlace(place, { name: data.name, lat: Number(data.latitude), lng: Number(data.longitude) })) return null;
  return { source: "tripadvisor", stars, reviews: Number.isFinite(reviews) ? reviews : 0, url: data.web_url };
}

/**
 * Google Places (the new Places API): one Text Search, asking only for the fields we show, because
 * every field is billed. https://developers.google.com/maps/documentation/places/web-service
 */
export async function googleRating(place: Place, key: string, doFetch: Fetcher = fetch): Promise<Elsewhere | null> {
  const res = await doFetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.location",
    },
    body: JSON.stringify({ textQuery: place.name, locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 300 } }, maxResultCount: 3 }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { places?: { displayName?: { text?: string }; rating?: number; userRatingCount?: number; googleMapsUri?: string; location?: { latitude?: number; longitude?: number } }[] };
  for (const found of data.places ?? []) {
    const name = found.displayName?.text;
    const lat = found.location?.latitude;
    const lng = found.location?.longitude;
    if (!name || !found.googleMapsUri || typeof found.rating !== "number") continue;
    if (typeof lat === "number" && typeof lng === "number" && !samePlace(place, { name, lat, lng })) continue;
    return { source: "google", stars: found.rating, reviews: found.userRatingCount ?? 0, url: found.googleMapsUri };
  }
  return null;
}
