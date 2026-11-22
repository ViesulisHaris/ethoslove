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
 * the page has a margin for it to lie in, and `until` for the screens narrower than that. `top`
 * holds a piece at a fixed height from its section's top in place of `y`: a section grows with its
 * words, and a share of its height would carry the piece down into them.
 *
 * The art's own rules, held by tests/unit/page-art.test.ts: no piece is mirrored, none is turned
 * more than 25 degrees either way (they are all lit from the top left), and none of these goes on
 * a dark ground. And no piece may lie under words at any width: the e2e design spec looks.
 */
export type PlacedArt = Placement & { art: ArtId; from?: 1280 | 1440; until?: 1280 | 1440; top?: string };

/** Over the hero, beside the words: one petal let fall in the top corner. The phone has its own flowers. */
// From 1280, where the words' column leaves its top corner empty. Held level with the tags, between
// the header and the gift's name: at 15% of the hero's height it lay on the last letters of a long
// name wherever the hero was tall ("String the Lights", "A medio camino", "Calabaza tallada").
export const HERO_ART: PlacedArt[] = [{ art: "petal-3", x: 93.5, y: 15, top: "2.75rem", size: 5.4, rot: 14, phone: false, eager: true, from: 1280 }];

/** The stem that leans in from the right edge, beside the hero's lower half and the three steps. */
export const HOW_ART: PlacedArt[] = [
  // On a wide desk it stands in the page's margin; on a laptop there is less margin, so less of it shows.
  { art: "lily-stem-tall", x: 100.5, y: 24, size: 33, rot: 8, phone: false, from: 1440 },
  { art: "lily-stem-tall", x: 104, y: 10, size: 27, rot: 10, phone: false, from: 1280, until: 1440 },
  // Narrower still, the hero's checklist ends near the page's edge just above: the stem stands lower and further out, clear of it.
  { art: "lily-stem-tall", x: 107, y: 24, size: 27, rot: 10, phone: false, until: 1280 },
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

/**
 * The gift finder (/gifts/finder), in the site's own palette and blush flowers. Its first section
 * is the tool: words on the left, cards on the right, and no flower may lie on a card. So the
 * flowers keep to the two places a card never is: the top right corner, in the page's margin on a
 * wide desk (a petal by the header where there is less margin, and by the label on a phone), and
 * the lower left, under the short column of words, where the lily of FINDER_FOOT_ART lies across
 * the edge into the band below, as a gift's page has it between its questions and "More like this".
 */
export const FINDER_ART: PlacedArt[] = [
  { art: "lily-side", x: 101.5, y: 0, top: "11rem", size: 13, rot: -12, phone: false, eager: true, from: 1440 },
  { art: "petal-3", x: 95, y: 0, top: "2.75rem", size: 5.4, rot: 14, phone: false, eager: true, from: 1280, until: 1440 },
  { art: "petal-1", x: 90, y: 0, top: "5.9rem", size: 12, rot: 12, phone: "only", eager: true },
];

/** Held at a fixed height over the band's top: the band is as tall as its words, and a share of that would carry the lily down onto them. */
export const FINDER_FOOT_ART: PlacedArt[] = [
  { art: "lily-three-quarter", x: 15, y: 0, top: "-6.75rem", size: 30, rot: -8, phone: false },
  { art: "petal-2", x: 96, y: 78, size: 5, rot: 20, phone: false },
  { art: "lily-three-quarter", x: 90, y: 0, top: "-0.5rem", size: 34, rot: -6, phone: "only" },
];

/** Every placement on a gift's page, for the test that holds them to the art's rules and to being composed, not scattered. */
export const ALL_PLACEMENTS: readonly PlacedArt[] = [...HERO_ART, ...HOW_ART, ...WRITE_ART, ...MORE_ART];

/** And the finder's, held to the same rules by the same test. */
export const FINDER_PLACEMENTS: readonly PlacedArt[] = [...FINDER_ART, ...FINDER_FOOT_ART];
