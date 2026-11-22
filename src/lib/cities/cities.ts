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
  /** Its country (ISO 3166-1 alpha-2), only where the offline table has no row for it. */
  country?: string;
};

export type City = Omit<CityEntry, "centre" | "es" | "country"> & { es: string; country: string; lat: number; lng: number };

/**
 * The cities with a page of their own: where the people who buy are, and, since Nov 2026, the US and
 * UK cities people search date ideas for (docs/marketing/growth-build/SEO-PICTURE.md), and never anywhere in the
 * one country the site does not mention. The slug is the English name, lower-case and hyphenated,
 * and is the same in both languages so the two pages are one another's translation.
 */
const ENTRIES: CityEntry[] = [
  { slug: "london", name: "London", traits: ["rainy", "museums", "nightlife", "parks"], picks: ["theatre-night", "museum-then-wine"] },
  { slug: "manchester", name: "Manchester", es: "Mánchester", traits: ["rainy", "nightlife"], picks: ["cinema-and-late-dessert", "pasta-and-a-slow-walk"] },
  { slug: "edinburgh", name: "Edinburgh", traits: ["rainy", "museums", "views"], picks: ["sunrise-and-breakfast"] },
  { slug: "dublin", name: "Dublin", traits: ["rainy", "nightlife", "coastal"], picks: ["gallery-hop", "museum-then-wine"] },
  // Brindleyplace, by the canals.
  { slug: "birmingham", name: "Birmingham", traits: ["rainy", "museums", "nightlife"], picks: ["pasta-and-a-slow-walk"], centre: { lat: 52.4775, lng: -1.911 } },
  // George Square (the table's point).
  { slug: "glasgow", name: "Glasgow", traits: ["rainy", "museums", "nightlife", "parks"], picks: ["gallery-hop"] },
  // The old city (the table's point).
  { slug: "bristol", name: "Bristol", traits: ["rainy", "views", "parks"], picks: ["golden-hour-picnic"] },
  // Briggate and the arcades.
  { slug: "leeds", name: "Leeds", country: "GB", traits: ["rainy", "nightlife"], picks: ["cinema-and-late-dessert"], centre: { lat: 53.7997, lng: -1.5437 } },
  // Bold Street and the Ropewalks.
  { slug: "liverpool", name: "Liverpool", country: "GB", traits: ["rainy", "museums", "nightlife"], picks: ["karaoke-duet"], centre: { lat: 53.405, lng: -2.985 } },
  { slug: "new-york", name: "New York", traits: ["museums", "nightlife", "parks", "winter"], picks: ["pasta-and-a-slow-walk", "ice-cream-walk"] },
  { slug: "los-angeles", name: "Los Angeles", es: "Los Ángeles", traits: ["coastal", "sunny", "nightlife", "views"], picks: ["beach-until-sunset"] },
  { slug: "chicago", name: "Chicago", traits: ["museums", "nightlife", "parks", "winter", "coastal"], picks: ["beach-until-sunset"] },
  { slug: "san-francisco", name: "San Francisco", traits: ["coastal", "parks", "museums", "views"], picks: ["golden-hour-picnic"] },
  { slug: "miami", name: "Miami", traits: ["coastal", "sunny", "hot", "nightlife"], picks: ["sunrise-and-breakfast", "beach-until-sunset"] },
  { slug: "boston", name: "Boston", traits: ["museums", "parks", "winter", "coastal"], picks: ["garden-afternoon", "boats-on-the-water"] },
  // Klyde Warren Park, between the Arts District and Uptown.
  { slug: "dallas", name: "Dallas", traits: ["sunny", "museums", "nightlife"], picks: ["museum-then-wine"], centre: { lat: 32.7894, lng: -96.8016 } },
  // Between the Power & Light District and the Crossroads.
  { slug: "kansas-city", name: "Kansas City", country: "US", traits: ["winter", "museums", "nightlife"], picks: ["pasta-and-a-slow-walk"], centre: { lat: 39.093, lng: -94.583 } },
  // Downtown (the table's point).
  { slug: "houston", name: "Houston", traits: ["hot", "museums", "parks"], picks: ["museum-then-wine"] },
  // Old Fourth Ward, on the BeltLine's Eastside Trail.
  { slug: "atlanta", name: "Atlanta", traits: ["parks", "nightlife"], picks: ["ice-cream-walk"], centre: { lat: 33.761, lng: -84.359 } },
  // Downtown (the table's point).
  { slug: "austin", name: "Austin", traits: ["hot", "sunny", "nightlife", "parks"], picks: ["golden-hour-picnic"] },
  // Union Station and LoDo.
  { slug: "denver", name: "Denver", traits: ["sunny", "winter", "museums", "parks"], picks: ["golden-hour-picnic"], centre: { lat: 39.7527, lng: -104.9995 } },
  // Downtown, between the river and the lake.
  { slug: "milwaukee", name: "Milwaukee", country: "US", traits: ["winter", "coastal", "museums"], picks: ["museum-then-wine"], centre: { lat: 43.0389, lng: -87.9065 } },
  // Downtown.
  { slug: "salt-lake-city", name: "Salt Lake City", country: "US", traits: ["sunny", "winter", "views"], picks: ["golden-hour-picnic"], centre: { lat: 40.7608, lng: -111.891 } },
  // The River Walk, north of downtown.
  { slug: "san-antonio", name: "San Antonio", country: "US", traits: ["hot", "sunny"], picks: ["pasta-and-a-slow-walk"], centre: { lat: 29.432, lng: -98.488 } },
  // The Short North, on High Street.
  { slug: "columbus", name: "Columbus", country: "US", traits: ["winter", "parks"], picks: ["gallery-hop"], centre: { lat: 39.97, lng: -83.002 } },
  // Lake Eola.
  { slug: "orlando", name: "Orlando", country: "US", traits: ["hot", "sunny", "parks"], picks: ["golden-hour-picnic"], centre: { lat: 28.5436, lng: -81.3728 } },
  // City Hall (the table's point).
  { slug: "philadelphia", name: "Philadelphia", es: "Filadelfia", traits: ["museums", "winter", "parks"], picks: ["pasta-and-a-slow-walk"] },
  // Roosevelt Row.
  { slug: "phoenix", name: "Phoenix", country: "US", traits: ["hot", "sunny", "views"], picks: ["sunrise-and-breakfast"], centre: { lat: 33.458, lng: -112.071 } },
  // Downtown.
  { slug: "pittsburgh", name: "Pittsburgh", country: "US", traits: ["rainy", "winter", "museums", "views"], picks: ["golden-hour-picnic"], centre: { lat: 40.4406, lng: -79.9959 } },
  // Downtown and the Pearl District.
  { slug: "portland", name: "Portland", country: "US", traits: ["rainy", "parks"], picks: ["bookshop-and-coffee"], centre: { lat: 45.5231, lng: -122.6765 } },
  // Pike Place Market.
  { slug: "seattle", name: "Seattle", traits: ["rainy", "coastal", "museums", "views"], picks: ["bookshop-and-coffee"], centre: { lat: 47.6097, lng: -122.3422 } },
  // Downtown.
  { slug: "st-louis", name: "St Louis", es: "San Luis", country: "US", traits: ["museums", "parks", "winter"], picks: ["museum-then-wine"], centre: { lat: 38.627, lng: -90.1994 } },
  // The Gulch, a walk from Lower Broadway.
  { slug: "nashville", name: "Nashville", country: "US", traits: ["nightlife", "parks"], picks: ["karaoke-duet"], centre: { lat: 36.152, lng: -86.784 } },
  // Between Little Italy, downtown and Balboa Park.
  { slug: "san-diego", name: "San Diego", country: "US", traits: ["coastal", "sunny", "parks", "museums"], picks: ["beach-until-sunset"], centre: { lat: 32.72, lng: -117.162 } },
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
  if (!table && !(entry.centre && entry.country)) throw new Error(`cities: ${entry.name} is not in the offline city table and carries no centre and country of its own`);
  const starter = STARTER_CITIES.find((c) => c.name === entry.name);
  const centre = entry.centre ?? starter ?? table!;
  const es = entry.es ?? AIRPORTS.find((a) => a.city === entry.name)?.es ?? entry.name;
  return { slug: entry.slug, name: entry.name, es, country: table?.country ?? entry.country!, traits: entry.traits, picks: entry.picks, lat: centre.lat, lng: centre.lng };
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
