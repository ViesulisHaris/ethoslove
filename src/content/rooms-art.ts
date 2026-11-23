import type { PlacedArt } from "@/components/templates/page/placements";
import { DEFAULT_PAGE_THEME, type PageTheme } from "@/content/template-page-themes";

/** The site's own paper, ink and rose, with the ivory lilies the site's frame draws (cutouts.tsx). */
export const ROOMS_THEME: PageTheme = { ...DEFAULT_PAGE_THEME, flowers: "ivory" };

/** "Where should we go together?" on /trips: far below the first screen, so nothing here is eager. */
export const MATCH_ART: PlacedArt[] = [
  { art: "lily-side", x: 101.5, y: 0, top: "9rem", size: 13, rot: -12, phone: false, from: 1440 },
  { art: "petal-1", x: 12, y: 92, size: 5.2, rot: -16, phone: false },
  { art: "petal-1", x: 90, y: 0, top: "3.75rem", size: 12, rot: 12, phone: "only" },
];

/** The halfway finder: the gift finder's own composition (placements.ts, FINDER_ART), which was looked at at sixteen sizes. */
export const HALFWAY_ART: PlacedArt[] = [
  { art: "lily-side", x: 101.5, y: 0, top: "11rem", size: 13, rot: -12, phone: false, eager: true, from: 1440 },
  { art: "petal-3", x: 95, y: 0, top: "2.75rem", size: 5.4, rot: 14, phone: false, eager: true, from: 1280, until: 1440 },
  { art: "petal-1", x: 88, y: 0, top: "1.25rem", size: 12, rot: 12, phone: "only", eager: true },
];

/** Held at a fixed height over the questions band's top, as the finder's foot is. */
export const HALFWAY_FOOT_ART: PlacedArt[] = [
  { art: "lily-three-quarter", x: 15, y: 0, top: "-6.75rem", size: 30, rot: -8, phone: false },
  { art: "petal-2", x: 96, y: 78, size: 5, rot: 20, phone: false },
  { art: "lily-three-quarter", x: 90, y: 0, top: "-0.5rem", size: 34, rot: -6, phone: "only" },
];

/** Every placement of the rooms' pages, for the test that holds them to the art's rules. */
export const ROOMS_PLACEMENTS: readonly PlacedArt[] = [...MATCH_ART, ...HALFWAY_ART, ...HALFWAY_FOOT_ART];
