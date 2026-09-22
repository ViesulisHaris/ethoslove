import type { PlaceKind } from "./kinds";
import type { Place } from "./places";

/**
 * What a place costs for two, on the same four-step scale the ideas use: 0 free, 1 pocket
 * change, 2 dinner money, 3 a treat. The map does not know prices, so this is a guess from what
 * a kind of place usually is, corrected by what couples who went there say it cost (the typical
 * answer in their reviews wins over the guess as soon as there is one).
 */
export type Cost = 0 | 1 | 2 | 3;

const BY_KIND: Record<PlaceKind, Cost> = {
  restaurant: 2,
  bar: 2,
  cafe: 1,
  dessert: 1,
  viewpoint: 0,
  park: 0,
  garden: 0,
  beach: 0,
  picnic: 0,
  museum: 1,
  gallery: 0,
  cinema: 2,
  theatre: 3,
  planetarium: 1,
  bookshop: 0,
  landmark: 0,
  bowling: 2,
  minigolf: 1,
  arcade: 1,
  escape: 3,
  climbing: 2,
  skating: 1,
  karaoke: 2,
  boats: 1,
  zoo: 2,
  themepark: 3,
  spa: 3,
  winery: 2,
};

/** Cuisines that mean a bill, not a snack. */
const DEAR = new Set(["fine dining", "french", "steak house", "sushi", "japanese", "seafood", "fondue", "wine"]);
/** And the ones that mean the opposite. */
const CHEAP = new Set(["pizza", "kebab", "burger", "sandwich", "noodle", "tapas", "street food", "taco", "mexican"]);

export function guessCost(place: Pick<Place, "kind" | "cuisine" | "notable">): Cost {
  let cost = BY_KIND[place.kind];
  if (place.kind === "restaurant" || place.kind === "bar") {
    if (place.cuisine.some((c) => DEAR.has(c))) cost = 3;
    else if (place.cuisine.some((c) => CHEAP.has(c))) cost = 1;
  }
  // A famous museum charges; a famous park does not.
  if (place.kind === "museum" && place.notable) cost = 2;
  return cost;
}

/** The cost to show: what couples reported when there are reports, the guess otherwise. */
export const costOf = (place: Pick<Place, "kind" | "cuisine" | "notable">, reported: number | null | undefined): Cost => (reported === 0 || reported === 1 || reported === 2 || reported === 3 ? reported : guessCost(place));

export const COST_IDS: Cost[] = [0, 1, 2, 3];
export const COST_LABELS: Record<Cost, { en: string; es: string }> = {
  0: { en: "Free", es: "Gratis" },
  1: { en: "Pocket change", es: "Calderilla" },
  2: { en: "Dinner money", es: "Lo de una cena" },
  3: { en: "A treat", es: "Un capricho" },
};
/** The short form on a chip: a wallet's worth of symbols. */
export const COST_MARKS: Record<Cost, string> = { 0: "free", 1: "€", 2: "€€", 3: "€€€" };
