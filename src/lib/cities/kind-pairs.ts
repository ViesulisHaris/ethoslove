import { DATE_KINDS, kindIdeas, type DateKind } from "@/lib/dates/date-kinds";
import type { DateIdea } from "@/lib/dates/ideas";
import { SKYLINE_IDEAS } from "@/lib/dates/art";
import { CITY_PAGES, getCity, type City, type CityTrait } from "./cities";
import { cityIdeaScore, fitsCity, ideasForCity } from "./ideas";

/*
 * Which kinds of date have a page inside which city (/dates/<city>/<kind>). Server and tests only:
 * never import this from a "use client" file or from src/lib/dates/tonight.ts, it would carry every
 * city into the planner's bundle.
 */

/** A pair of a city and a kind is a page only when the city's own list holds this many of the kind's ideas (BRIEF-dates2.md 1). */
export const MIN_CITY_KIND_IDEAS = 6;

/** A kind that is a claim about the weather is a page only where the city's data makes that claim. */
export const KIND_NEEDS_TRAIT: Partial<Record<DateKind, CityTrait>> = { winter: "winter", "rainy-day": "rainy" };

/**
 * Real places of a kind counted on the city's own page, where the ideas alone fall short: "city/kind"
 * to how many. London's cheap page: its own list holds five of the eight cheap ideas (its rain sends
 * the outdoor ones down), and its list "Usually free to walk into" named six real places when counted
 * on 25 Nov 2026 (PLAN-dates2.md, open question 1).
 */
export const CITY_KIND_PLACES: Readonly<Record<string, number>> = { "london/cheap": 6 };

/** The kind's ideas that are in the city's own sixteen, in the city's order. */
export const cityKindOwn = (city: City, kind: DateKind): DateIdea[] => {
  const ids = new Set(kindIdeas(kind).map((idea) => idea.id));
  return ideasForCity(city).filter((idea) => ids.has(idea.id));
};

/**
 * What a pair's page shows: every idea of the kind that can be done in the city (no beach inland),
 * the city's own first, then by how well the city suits it, ties in the kind's order.
 */
export const pairIdeas = (city: City, kind: DateKind): DateIdea[] => {
  const own = cityKindOwn(city, kind);
  const ownIds = new Set(own.map((idea) => idea.id));
  const rest = kindIdeas(kind)
    .filter((idea) => fitsCity(idea, city.traits) && !ownIds.has(idea.id))
    .map((idea, index) => ({ idea, index, score: cityIdeaScore(idea, city) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.idea);
  return [...own, ...rest];
};

function holds(city: City, kind: DateKind): boolean {
  if (!DATE_KINDS.includes(kind)) return false;
  const trait = KIND_NEEDS_TRAIT[kind];
  if (trait && !city.traits.includes(trait)) return false;
  return cityKindOwn(city, kind).length >= MIN_CITY_KIND_IDEAS || (CITY_KIND_PLACES[`${city.slug}/${kind}`] ?? 0) >= MIN_CITY_KIND_IDEAS;
}

/** Every pair, cities in CITY_PAGES order, kinds in DATE_KINDS order. */
export const CITY_KIND_PAIRS: readonly { city: string; kind: DateKind }[] = CITY_PAGES.flatMap((city) => DATE_KINDS.filter((kind) => holds(city, kind)).map((kind) => ({ city: city.slug, kind })));

const PAIR_KEYS = new Set(CITY_KIND_PAIRS.map((p) => `${p.city}/${p.kind}`));

export const isCityKindPair = (citySlug: string, kind: string): boolean => PAIR_KEYS.has(`${citySlug}/${kind}`);

/** The kinds a city has a page for, in DATE_KINDS order. */
export const kindsOfCity = (citySlug: string): DateKind[] => CITY_KIND_PAIRS.filter((p) => p.city === citySlug).map((p) => p.kind);

/** The cities a kind has a page in, in CITY_PAGES order. */
export const citiesOfKind = (kind: DateKind): City[] => CITY_KIND_PAIRS.filter((p) => p.kind === kind).flatMap((p) => getCity(p.city) ?? []);

/**
 * The idea whose picture a pair's hero shows: the first wanted one that is on the page, is not its
 * first card and is not a skyline of somewhere else; failing those, the page's own ideas in order.
 */
export function pairHero(city: City, kind: DateKind, wanted: readonly string[]): string {
  const ideas = pairIdeas(city, kind).map((idea) => idea.id);
  const ok = (id: string) => ideas.includes(id) && id !== ideas[0] && !(id in SKYLINE_IDEAS);
  return [...wanted, ...ideas].find(ok) ?? ideas[1];
}

/**
 * The city's own pick that a pair without hand-written words names under its heading and shows in
 * its hero, so the line and the picture are one idea (dates2-T6): the first of `city.picks` that is
 * on the page, is not its first card, is not a skyline, and that no kind before it in DATE_KINDS has
 * already named in this city (one idea never heads two pages of a city, dates2-C12). Null when none is left.
 */
export function pairPick(city: City, kind: DateKind): DateIdea | null {
  const named = new Set<string>();
  for (const k of DATE_KINDS) {
    if (!holds(city, k)) continue;
    const ideas = pairIdeas(city, k);
    const id = city.picks.find((pick) => ideas.some((idea) => idea.id === pick) && pick !== ideas[0].id && !(pick in SKYLINE_IDEAS) && !named.has(pick));
    if (k === kind) return id ? ideas.find((idea) => idea.id === id)! : null;
    if (id) named.add(id);
  }
  return null;
}
