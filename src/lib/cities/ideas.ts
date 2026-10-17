import { IDEAS, suggestStops, type DateIdea } from "@/lib/dates/ideas";
import type { PlaceKind } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import type { City, CityTrait } from "./cities";

/** How many ideas a city's page lists: enough to be worth the visit, few enough to be a choice. */
export const IDEAS_PER_CITY = 16;
/** An idea the city is known for goes near the top whatever its weather says. */
const PICK_BONUS = 6;

const EVENING = new Set<DateIdea["moment"]>(["evening", "night"]);
const OFF_PEAK = new Set<DateIdea["moment"]>(["morning", "sunset", "evening", "night"]);

/** The kind an idea is written for at some stop, before its stand-ins. */
const leadsWith = (idea: DateIdea, kinds: PlaceKind[]) => idea.stops.some((stop) => kinds.includes(stop[0]));
/** Any stop the kind would do for, stand-ins included. */
const uses = (idea: DateIdea, kinds: PlaceKind[]) => idea.stops.some((stop) => stop.some((k) => kinds.includes(k)));

/**
 * What each trait does to an idea's standing. Small whole numbers on purpose: the order has to be
 * explainable in a sentence on the page ("it rains here, so the indoor ones come first").
 */
const TRAIT_SCORE: Record<CityTrait, (idea: DateIdea) => number> = {
  coastal: (idea) => (leadsWith(idea, ["beach", "boats"]) ? 4 : uses(idea, ["beach"]) ? 1 : 0),
  rainy: (idea) => (idea.goodInRain ? 3 : 0) - (idea.needsDry ? 2 : 0),
  sunny: (idea) => (idea.needsDry ? 2 : 0) + (idea.moment === "sunset" ? 1 : 0),
  hot: (idea) => (OFF_PEAK.has(idea.moment) ? 2 : 0) + (idea.goodInRain ? 1 : 0) - (idea.needsDry && idea.moment === "day" ? 3 : 0),
  winter: (idea) => (leadsWith(idea, ["skating"]) ? 4 : 0) + (idea.vibes.includes("cozy") ? 1 : 0),
  museums: (idea) => (leadsWith(idea, ["museum", "gallery"]) ? 3 : 0) + (leadsWith(idea, ["theatre"]) ? 1 : 0),
  nightlife: (idea) => (EVENING.has(idea.moment) ? 2 : 0) + (leadsWith(idea, ["bar", "karaoke"]) ? 1 : 0),
  parks: (idea) => (uses(idea, ["park", "garden"]) ? 2 : 0) + (leadsWith(idea, ["park", "garden"]) ? 1 : 0),
  views: (idea) => (leadsWith(idea, ["viewpoint"]) ? 2 : 0) + (uses(idea, ["viewpoint"]) ? 1 : 0),
};

/**
 * Whether a trait is part of why an idea stands where it does. The one-point nudges (a walk that
 * passes a lookout, a cosy café) don't count: the page's sentence about the trait has to be true
 * of the ideas it points at.
 */
export const isLiftedBy = (idea: DateIdea, trait: CityTrait): boolean => TRAIT_SCORE[trait](idea) >= 2;

/** A beach date is nonsense a long way from one; everything else can be found or reached anywhere. */
const fitsCity = (idea: DateIdea, traits: CityTrait[]) => !leadsWith(idea, ["beach"]) || traits.includes("coastal");

export function cityIdeaScore(idea: DateIdea, city: Pick<City, "traits" | "picks">): number {
  const traits = city.traits.reduce((sum, trait) => sum + TRAIT_SCORE[trait](idea), 0);
  return traits + (city.picks.includes(idea.id) ? PICK_BONUS : 0);
}

/**
 * The ideas for one city, best first: scored by what the city is like and what it is known for,
 * with ties left in the order the ideas were written in, which is itself a considered order. The
 * same city always gets the same list, so a page does not reshuffle every time it is rebuilt.
 */
export function ideasForCity(city: Pick<City, "traits" | "picks">, count = IDEAS_PER_CITY, ideas: DateIdea[] = IDEAS): DateIdea[] {
  return ideas
    .filter((idea) => fitsCity(idea, city.traits))
    .map((idea, index) => ({ idea, index, score: cityIdeaScore(idea, city) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((x) => x.idea);
}

/**
 * Real places for each idea on a city's page, or null for an idea the map can't fill every stop
 * of. The ideas are filled top to bottom from one neighbourhood, and a place an idea above already
 * named goes to the back of its kind, so the page doesn't send every evening to the same bar.
 */
export function cityIdeaStops(ideas: DateIdea[], places: Place[]): (Place[] | null)[] {
  const used = new Set<string>();
  return ideas.map((idea) => {
    const stops = suggestStops(idea, places, [], used);
    if (stops.length !== idea.stops.length) return null;
    for (const place of stops) used.add(place.id);
    return stops;
  });
}
