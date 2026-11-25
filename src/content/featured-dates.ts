/*
 * Featured dates (BRIEF-dates2.md 5): places a venue pays to have marked "Featured", in words,
 * wherever they are listed. The label is all it buys: never a rank, never a way past a filter
 * (src/content/legal.ts: "No one pays for a place's position.").
 */

export type FeaturedDate = {
  /** The place's OpenStreetMap id, "node/123". */
  place: string;
  /** The city page it was sold for, by slug (src/lib/cities/cities.ts). */
  city: string;
  /** The first day it is marked, YYYY-MM-DD. */
  from: string;
  /** The last day it is marked, YYYY-MM-DD; open-ended without one. */
  until?: string;
};

/** Places a venue pays to have marked. EMPTY in this build. Each entry needs its line in docs/marketing/FEATURED-DATES.md naming who paid (tests/unit/featured-dates.test.ts). */
export const FEATURED_DATES: readonly FeaturedDate[] = [];
