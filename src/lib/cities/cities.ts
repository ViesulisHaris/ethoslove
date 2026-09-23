import { STARTER_CITIES } from "@/lib/dates/cities";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { AIRPORTS } from "@/lib/trips/airports";
import { CITIES } from "@/templates/_shared/places";

/**
 * What a city is like for a date, in the few ways that change which ideas come first. A trait is
 * a claim about the whole city and is printed on its page as a sentence, so each one here has to
 * be true of it for most of the year.
 */
export type CityTrait =
  /** Beaches or water to hire a boat on, within reach of the centre. */
  | "coastal"
  /** Rain on a good share of days, in every season. */
  | "rainy"
  /** Dry and bright for most of the year. */
  | "sunny"
  /** Too hot at midday for much of the year: evenings and air-conditioning win. */
  | "hot"
  /** Properly cold winters: rinks, hot chocolate, somewhere warm. */
  | "winter"
  /** Big museums and galleries. */
  | "museums"
  /** A city that stays up late. */
  | "nightlife"
  /** Big parks or gardens near the centre. */
  | "parks"
  /** Hills and lookouts. */
  | "views";

export const CITY_TRAITS: CityTrait[] = ["coastal", "rainy", "sunny", "hot", "winter", "museums", "nightlife", "parks", "views"];

type CityEntry = {
  slug: string;
  /** As written in the offline city tables, which is where the coordinates come from. */
  name: string;
  /** The Spanish name, only where the airports' table doesn't already know it. */
  es?: string;
  traits: CityTrait[];
  /** Ideas this city is known for (ids from dates/ideas.ts). Its note on the page says why. */
  picks: string[];
  /** Where the dates are, where the tables' point is somewhere else. */
  centre?: LatLng;
};

export type City = Omit<CityEntry, "centre" | "es"> & { es: string; country: string; lat: number; lng: number };

/**
 * The cities with a page of their own: where the people who buy are, and never anywhere in the
 * one country the site does not mention. The slug is the English name, lower-case and hyphenated,
 * and is the same in both languages so the two pages are one another's translation.
 */
const ENTRIES: CityEntry[] = [
  { slug: "london", name: "London", traits: ["rainy", "museums", "nightlife", "parks"], picks: ["theatre-night", "museum-then-wine"] },
  { slug: "manchester", name: "Manchester", es: "Mánchester", traits: ["rainy", "nightlife"], picks: ["cinema-and-late-dessert", "pasta-and-a-slow-walk"] },
  { slug: "edinburgh", name: "Edinburgh", traits: ["rainy", "museums", "views"], picks: ["sunrise-and-breakfast"] },
  { slug: "dublin", name: "Dublin", traits: ["rainy", "nightlife", "coastal"], picks: ["gallery-hop", "museum-then-wine"] },
  { slug: "new-york", name: "New York", traits: ["museums", "nightlife", "parks", "winter"], picks: ["pasta-and-a-slow-walk", "ice-cream-walk"] },
  { slug: "los-angeles", name: "Los Angeles", es: "Los Ángeles", traits: ["coastal", "sunny", "nightlife", "views"], picks: ["beach-until-sunset"] },
  { slug: "chicago", name: "Chicago", traits: ["museums", "nightlife", "parks", "winter", "coastal"], picks: ["beach-until-sunset"] },
  { slug: "san-francisco", name: "San Francisco", traits: ["coastal", "parks", "museums", "views"], picks: ["golden-hour-picnic"] },
  { slug: "miami", name: "Miami", traits: ["coastal", "sunny", "hot", "nightlife"], picks: ["sunrise-and-breakfast", "beach-until-sunset"] },
  { slug: "boston", name: "Boston", traits: ["museums", "parks", "winter", "coastal"], picks: ["garden-afternoon", "boats-on-the-water"] },
  { slug: "toronto", name: "Toronto", traits: ["winter", "parks", "coastal"], picks: ["beach-until-sunset", "boats-on-the-water"] },
  { slug: "vancouver", name: "Vancouver", traits: ["rainy", "coastal", "parks", "views"], picks: ["golden-hour-picnic", "ice-cream-walk"] },
  { slug: "montreal", name: "Montreal", traits: ["winter", "nightlife", "parks", "views"], picks: ["skating-and-hot-chocolate"] },
  { slug: "sydney", name: "Sydney", es: "Sídney", traits: ["coastal", "sunny", "parks"], picks: ["beach-until-sunset", "boats-on-the-water"] },
  { slug: "melbourne", name: "Melbourne", traits: ["museums", "nightlife", "coastal"], picks: ["gallery-hop", "pasta-and-a-slow-walk"] },
  { slug: "auckland", name: "Auckland", traits: ["coastal", "rainy", "views"], picks: ["bookshop-and-coffee", "beach-until-sunset"] },
  { slug: "paris", name: "Paris", traits: ["museums", "parks", "nightlife", "views"], picks: ["golden-hour-picnic", "museum-then-wine"] },
  { slug: "amsterdam", name: "Amsterdam", traits: ["rainy", "museums", "nightlife"], picks: ["gallery-hop", "museum-then-wine"] },
  { slug: "berlin", name: "Berlin", traits: ["nightlife", "museums", "winter", "parks"], picks: ["karaoke-duet"] },
  { slug: "munich", name: "Munich", traits: ["museums", "parks", "winter"], picks: ["garden-afternoon"] },
  { slug: "vienna", name: "Vienna", traits: ["museums", "winter", "parks"], picks: ["bookshop-and-coffee", "theatre-night"] },
  { slug: "prague", name: "Prague", traits: ["winter", "views", "nightlife"], picks: ["sunrise-and-breakfast"] },
  { slug: "copenhagen", name: "Copenhagen", traits: ["coastal", "rainy", "parks"], picks: ["boats-on-the-water"] },
  { slug: "stockholm", name: "Stockholm", traits: ["coastal", "winter", "museums"], picks: ["boats-on-the-water"] },
  { slug: "oslo", name: "Oslo", traits: ["coastal", "winter", "views"], picks: ["golden-hour-picnic"] },
  { slug: "lisbon", name: "Lisbon", traits: ["coastal", "sunny", "nightlife", "views"], picks: ["golden-hour-picnic"] },
  { slug: "rome", name: "Rome", traits: ["museums", "sunny", "views"], picks: ["ice-cream-walk", "pasta-and-a-slow-walk"] },
  { slug: "riga", name: "Riga", traits: ["winter", "parks"], picks: ["ice-cream-walk"] },
  { slug: "tallinn", name: "Tallinn", traits: ["winter", "coastal", "views"], picks: ["sunrise-and-breakfast"] },
  // The offline table puts Singapore in the middle of the island, among reservoirs and housing estates.
  { slug: "singapore", name: "Singapore", traits: ["hot", "rainy", "parks"], picks: ["pasta-and-a-slow-walk"], centre: { lat: 1.2903, lng: 103.8519 } },
  { slug: "dubai", name: "Dubai", es: "Dubái", traits: ["hot", "sunny", "coastal"], picks: ["skating-and-hot-chocolate", "stars-and-planets"] },
];

/**
 * A city's centre: the dates map's own starting points first (placed where the evenings are, not
 * on the town hall), then the offline table the globe and the trips use.
 */
function resolve(entry: CityEntry): City {
  const table = CITIES.find((c) => c.name === entry.name);
  if (!table) throw new Error(`cities: ${entry.name} is not in the offline city table`);
  const starter = STARTER_CITIES.find((c) => c.name === entry.name);
  const centre = entry.centre ?? starter ?? table;
  const es = entry.es ?? AIRPORTS.find((a) => a.city === entry.name)?.es ?? entry.name;
  return { slug: entry.slug, name: entry.name, es, country: table.country, traits: entry.traits, picks: entry.picks, lat: centre.lat, lng: centre.lng };
}

export const CITY_PAGES: City[] = ENTRIES.map(resolve);
export const CITY_SLUGS: string[] = CITY_PAGES.map((c) => c.slug);

export const getCity = (slug: string): City | undefined => CITY_PAGES.find((c) => c.slug === slug);

/** The city as the page's language says it. */
export const cityName = (city: City, locale: "en" | "es"): string => (locale === "es" ? city.es : city.name);

/** The other cities nearest this one, for the links at the foot of its page. */
export function nearbyCities(city: City, count = 6): City[] {
  return CITY_PAGES.filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, km: distanceKm(city, c) }))
    .sort((a, b) => a.km - b.km || a.c.slug.localeCompare(b.c.slug))
    .slice(0, count)
    .map((x) => x.c);
}

/** The dates map opened on a point under a name, and on one idea if asked. The map reads these on load. */
export function mapHref(point: LatLng, name: string, ideaId?: string): string {
  const params = new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), q: name });
  if (ideaId) params.set("idea", ideaId);
  return `/dates?${params}`;
}

export const cityMapHref = (city: City, locale: "en" | "es", ideaId?: string): string => mapHref(city, cityName(city, locale), ideaId);

/**
 * The country the site never names, in the languages the cities' own maps are written in, and its
 * best-known cities and islands. Matched without accents, so "Málaga" and "Malaga" are one word.
 */
const SPAIN = /\b(spain|spanish|spanisch|spanien|spanje|spania|spagna|spagnolo|espana|espanol|espanola|espagne|espagnol|espagnole|espanha|madrid|barcelona|sevilla|seville|valencia|malaga|bilbao|zaragoza|granada|cordoba|alicante|marbella|cadiz|pamplona|donostia|catalunya|cataluna|catalonia|andalucia|andalusia|mallorca|majorca|ibiza|tenerife|canarias|canary)\b/;

/**
 * True when a piece of text names Spain or one of its cities. The copy is written not to; the map's
 * places are other people's names ("Bar Madrid", Rome's "Spanish Steps"), so a city's page asks.
 */
export const mentionsSpain = (text: string): boolean => SPAIN.test(text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase());
