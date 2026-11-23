import type { Flowers } from "@/content/template-page-themes";
import type { PlacedArt } from "@/components/templates/page/placements";

/** The ivory lilies on green stems the landing page carries since 22 Nov 2026. One place decides it. */
export const TODAY_FLOWERS: Flowers = "ivory";

/**
 * Round the question (/games/today): the top right corner only, where no card and no word ever is.
 * The finder's own three, which its design spec holds clear of words at sixteen sizes; this page's
 * spec (tests/e2e/games-today-design.spec.ts) looks under every word again.
 */
export const TODAY_ART: PlacedArt[] = [
  { art: "lily-side", x: 101.5, y: 0, top: "11rem", size: 13, rot: -12, phone: false, eager: true, from: 1440 },
  { art: "petal-3", x: 95, y: 0, top: "2.75rem", size: 5.4, rot: 14, phone: false, eager: true, from: 1280, until: 1440 },
  { art: "petal-1", x: 90, y: 0, top: "5.9rem", size: 12, rot: 12, phone: "only", eager: true },
];

/** Across the top edge of the band below: a lily under the short column of words, a petal at the far side. */
export const TODAY_FOOT_ART: PlacedArt[] = [
  { art: "lily-three-quarter", x: 15, y: 0, top: "-6.75rem", size: 30, rot: -8, phone: false },
  { art: "petal-2", x: 96, y: 78, size: 5, rot: 20, phone: false },
  { art: "lily-three-quarter", x: 90, y: 0, top: "-0.5rem", size: 34, rot: -6, phone: "only" },
];

export const TODAY_PLACEMENTS: readonly PlacedArt[] = [...TODAY_ART, ...TODAY_FOOT_ART];
