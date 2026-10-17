import type { DateIdea } from "@/lib/dates/ideas";
import type { Place } from "@/lib/dates/places";
import type { City, CityTrait } from "./cities";
import { isLiftedBy } from "./ideas";

/** How many of a city's traits its page spells out: past three, it reads like a brochure. */
export const TOLD_TRAITS = 3;
/** What "near the top" means in those sentences: the first two rows of cards on a wide screen. */
export const TOP_OF_LIST = 6;
/** The order traits are told in: the ones that move the list the most come first. */
const TELLING_ORDER: CityTrait[] = ["coastal", "rainy", "hot", "winter", "sunny", "museums", "parks", "views", "nightlife"];

/**
 * The traits a city's page explains its order with. Each sentence says what the trait put near
 * the top ("on the water, so the beach and boat ideas are near the top"), so a trait is told only
 * when one of the ideas it lifts is really there: Dublin is on the water, but its rain and its
 * galleries push the boats far down, and the page must not claim otherwise.
 */
export const toldTraits = (city: Pick<City, "traits">, ideas: DateIdea[]): CityTrait[] =>
  TELLING_ORDER.filter((t) => city.traits.includes(t) && ideas.slice(0, TOP_OF_LIST).some((idea) => isLiftedBy(idea, t))).slice(0, TOLD_TRAITS);

/** An idea's length in hours as the page's language writes it: "2.5" in English, "2,5" in Spanish. */
export const hoursOf = (minutes: number, locale: "en" | "es"): string => (minutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 });

type Node = Record<string, unknown>;

/** The ideas as a list for search engines, each pointing at its own card on the page. */
export function ideaListNode({ name, url, ideas, locale }: { name: string; url: string; ideas: DateIdea[]; locale: "en" | "es" }): Node {
  return {
    "@type": "ItemList",
    "@id": `${url}#ideas`,
    name,
    numberOfItems: ideas.length,
    itemListElement: ideas.map((idea, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: idea.title[locale],
      description: idea.blurb[locale],
      url: `${url}#idea-${idea.id}`,
    })),
  };
}

/** The real places as a list: a name and a point, which is all the map vouches for. */
export function placeListNode({ name, url, places }: { name: string; url: string; places: Pick<Place, "name" | "lat" | "lng">[] }): Node {
  return {
    "@type": "ItemList",
    "@id": `${url}#places`,
    name,
    numberOfItems: places.length,
    itemListElement: places.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Place", name: p.name, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } },
    })),
  };
}
