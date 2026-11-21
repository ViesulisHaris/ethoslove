import type { Placement } from "@/components/marketing/home/cutouts";
import type { ArtId } from "@/content/page-art";

/**
 * Where the loose pieces of the page art lie on a gift's page, section by section, composed after
 * the owner's mock-up and not scattered: a tall stem leaning in from the right edge beside the
 * hero's lower half and the steps, one lily at the left edge by the questions, and two or three
 * petals and a leaf in the gaps between sections. The two phones lying on flowers are pictures of
 * their own (hero-flatlay, experience-flatlay) and are not placed here.
 *
 * A piece is placed by its middle, in per cent of its section; `size` is its width in per cent of
 * the screen (homepage's rule: never under 4.4 times that in pixels, never over 15 times). Off a
 * phone unless `phone` says otherwise; `from` keeps a piece for screens at least that wide, where
 * the page has a margin for it to lie in, and `until` for the screens narrower than that.
 *
 * The art's own rules, held by tests/unit/page-art.test.ts: no piece is mirrored, none is turned
 * more than 25 degrees either way (they are all lit from the top left), and none of these goes on
 * a dark ground. And no piece may lie under words at any width: the e2e design spec looks.
 */
export type PlacedArt = Placement & { art: ArtId; from?: 1280 | 1440; until?: 1440 };

/** Over the hero, beside the words: one petal let fall in the top corner. The phone has its own flowers. */
// From 1280, where the words have the right-hand column and its top corner is empty; narrower, they run the page's width.
export const HERO_ART: PlacedArt[] = [{ art: "petal-3", x: 93.5, y: 15, size: 5.4, rot: 14, phone: false, eager: true, from: 1280 }];

/** The stem that leans in from the right edge, beside the hero's lower half and the three steps. */
export const HOW_ART: PlacedArt[] = [
  // On a wide desk it stands in the page's margin; on a laptop there is less margin, so less of it shows.
  { art: "lily-stem-tall", x: 100.5, y: 24, size: 33, rot: 8, phone: false, from: 1440 },
  { art: "lily-stem-tall", x: 104, y: 10, size: 27, rot: 10, phone: false, until: 1440 },
  { art: "petal-1", x: 30, y: 100, size: 5.2, rot: -16, phone: false },
  { art: "petal-1", x: 91, y: 1, size: 17, rot: 12, phone: "only" },
];

export const WRITE_ART: PlacedArt[] = [{ art: "leaf-2", x: 79, y: 101, size: 9.5, rot: 16, phone: false }];

/** The lily at the left edge by the questions, lying across the edge into "More like this". */
export const MORE_ART: PlacedArt[] = [
  { art: "lily-three-quarter", x: 16.5, y: -25, size: 31, rot: -8, phone: false },
  { art: "petal-2", x: 96, y: 80, size: 5, rot: 20, phone: false },
  { art: "lily-three-quarter", x: 88, y: -1, size: 36, rot: -6, phone: "only" },
];

/** Every placement, for the test that holds them to the art's rules. */
export const ALL_PLACEMENTS: readonly PlacedArt[] = [...HERO_ART, ...HOW_ART, ...WRITE_ART, ...MORE_ART];
