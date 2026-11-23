import { FINDER_FOOT_ART, type PlacedArt } from "@/components/templates/page/placements";

/**
 * Where the loose flowers lie on a dates page (a page by kind, a city-by-kind page), in the gift
 * page's own rules (components/templates/page/placements.ts): never mirrored, never turned more than
 * 25 degrees, never under words or on a card (tests/e2e/dates-kind-design.spec.ts looks).
 */

/** Over the hero: a petal let fall by the header, as a gift's page and the finder have it. Never on the picture. */
export const DATE_HERO_ART: PlacedArt[] = [
  { art: "petal-3", x: 93.5, y: 15, top: "2.75rem", size: 5.4, rot: 14, phone: false, eager: true, from: 1280 },
  // By the label, above the heading: lower, a long heading on a 320px phone runs under it.
  { art: "petal-1", x: 90, y: 0, top: "1.4rem", size: 12, rot: 12, phone: "only", eager: true },
];
/** Beside the planner and the first row of cards: the tall stem in the page's right margin, only where there is a margin. */
export const DATE_CARDS_ART: PlacedArt[] = [
  { art: "lily-stem-tall", x: 100.5, y: 0, top: "22rem", size: 33, rot: 8, phone: false, from: 1440 },
  { art: "lily-stem-tall", x: 104, y: 0, top: "19rem", size: 27, rot: 10, phone: false, from: 1280, until: 1440 },
];
/** Across the edge into the last band: the finder's own lily, petal and phone lily. */
export const DATE_FOOT_ART: PlacedArt[] = FINDER_FOOT_ART;
export const DATE_PLACEMENTS: readonly PlacedArt[] = [...DATE_HERO_ART, ...DATE_CARDS_ART, ...DATE_FOOT_ART];
