import { HERO_ART, HOW_ART, MORE_ART, WRITE_ART, type PlacedArt } from "@/components/templates/page/placements";

/**
 * Where the loose pieces of the page art lie on the pages built from a gift's page: /digital-cards,
 * the gift pages by kind and the idea lists of the occasion pages. The same few pieces in the same
 * places as on a gift's page (components/templates/page/placements.ts), so the pages read as one
 * site: a petal in the hero's top corner, the tall stem leaning in from the right edge under the
 * hero, a leaf in a gap, the lily at the left edge by the questions. Only what a section's own
 * shape makes necessary is placed here.
 *
 * The cards of an idea list are a far taller section than a gift's three steps, so its stem is
 * held at a fixed height from the section's top (`top`), beside the hero's lower half and the
 * first row of cards, where a share of the section's height would carry it down the page. It
 * stands in the page's margin, outside the cards' column, and only on screens wide enough to have
 * that margin.
 *
 * The art's rules hold here too (tests/unit/page-art.test.ts): no piece mirrored, none turned more
 * than 25 degrees, none on a dark ground, and none under words at any width (the e2e design spec
 * looks).
 */
export const CARDS_ART: PlacedArt[] = [
  { art: "lily-stem-tall", x: 100.5, y: 0, top: "6rem", size: 33, rot: 8, phone: false, from: 1440 },
  { art: "lily-stem-tall", x: 104, y: 0, top: "3rem", size: 27, rot: 10, phone: false, from: 1280, until: 1440 },
  { art: "petal-1", x: 91, y: 0, top: "0.5rem", size: 17, rot: 12, phone: "only" },
];

/** Under the idea list of an occasion page, which follows a gallery and has no hero above it: one leaf in the gap, one petal on a phone. */
export const LIST_ART: PlacedArt[] = [
  { art: "leaf-2", x: 6, y: 0, top: "1.5rem", size: 8.5, rot: -14, phone: false, from: 1280 },
  { art: "petal-1", x: 91, y: 0, top: "0.75rem", size: 17, rot: 12, phone: "only" },
];

/**
 * Round the three steps of /digital-cards. On a gift's page the tall stem stands here, beside the
 * hero's lower half; on /digital-cards the row of five cards lies between the hero and the steps and
 * runs to the page's edge, so the stem stands beside the hero (CARDS_ART) and the steps keep the
 * two petals.
 */
export const STEPS_ART: PlacedArt[] = [
  { art: "petal-1", x: 30, y: 100, size: 5.2, rot: -16, phone: false },
  { art: "petal-1", x: 91, y: 1, size: 17, rot: 12, phone: "only" },
];

/** By an occasion page's questions, the last thing on the page: one petal let fall in the right margin. */
export const GUIDE_ART: PlacedArt[] = [{ art: "petal-2", x: 96, y: 0, top: "calc(100% - 7rem)", size: 5, rot: 20, phone: false }];

/** The prices: a petal let fall beside the heading's column. */
export const PRICES_ART: PlacedArt[] = [{ art: "petal-4", x: 4.5, y: 0, top: "1.5rem", size: 5, rot: -18, phone: false, from: 1280 }];

/**
 * The last section: the lily at the left edge by the questions, as on a gift's page. That page's
 * loose petal at the right is left out: here a row of links runs under the posters to the page's
 * edge, and at 1024px the petal lay under the last of them.
 */
export const NEXT_ART: PlacedArt[] = MORE_ART.filter((piece) => piece.art !== "petal-2");

export { HERO_ART, HOW_ART, MORE_ART, WRITE_ART };

/** Every placement of these pages, for the test that holds them to the art's rules. */
export const SPREAD_PLACEMENTS: readonly PlacedArt[] = [...CARDS_ART, ...LIST_ART, ...STEPS_ART, ...GUIDE_ART, ...PRICES_ART, ...NEXT_ART];
