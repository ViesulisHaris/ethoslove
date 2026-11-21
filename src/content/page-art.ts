import type { Flowers } from "@/content/template-page-themes";

/**
 * The art of the redesigned pages, in one table: the lilies, petals and leaves that lie round a
 * page, the two phones lying on flowers, the three pictures of "How to send" and the footer's
 * flower. The ids are fixed (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "3D art"), so the
 * pages and the renders could be made at the same time; a page asks for an id and a colourway and
 * never names a file.
 *
 * Until a render exists its row is a stand-in from what the site already had: a flower cut-out
 * from public/scraps, the template's own poster, a sample photo. A stand-in is marked `standIn`,
 * and the page then dresses it itself (the phone frame drawn in CSS, the polaroid's paper border).
 *
 * To drop a render in:
 * 1. Put the file under public/art/pages/<colourway>/ (the 2× file, and a 1× one for phones).
 * 2. Replace that id's row in the colourway below: `src`, the 1× `width` and `height` in pixels,
 *    `src1x` if there is one. Delete `standIn` and `tint`.
 * 3. For `hero-flatlay` and `experience-flatlay`, add `slot` (where the live screen or the photo
 *    goes) and, if the render has one, `bezel` (a layer drawn over what was laid in).
 * Nothing else changes: tests/unit/page-art.test.ts checks every row has a file and a size.
 */
export const ART_IDS = [
  "lily-open",
  "lily-three-quarter",
  "lily-side",
  "lily-stem-tall",
  "petal-1",
  "petal-2",
  "petal-3",
  "petal-4",
  "leaf-1",
  "leaf-2",
  "hero-flatlay",
  "experience-flatlay",
  "step-photo",
  "step-note",
  "step-send",
  "lily-footer",
] as const;

export type ArtId = (typeof ART_IDS)[number];

export type PageArtEntry = {
  /** A path under public/. `{slug}` is the template whose page it is on. */
  src: string;
  /** The size it is laid out at, in CSS pixels: the 1× size of a render, a stand-in's own size. */
  width: number;
  height: number;
  /** A render's 1× file; `src` is then its 2×. */
  src1x?: string;
  /** Not the render yet: the page frames it itself. */
  standIn?: true;
  /** A stand-in's CSS filter, to bring a pink cut-out nearer the colourway it stands in for. */
  tint?: string;
  /**
   * A flat-lay's empty area, where the page lays the live screen (hero) or a photo (experience).
   * `box` is the size of a flat rectangle in CSS pixels, and `matrix` the six numbers of the CSS
   * `matrix(a, b, c, d, e, f)` that carries that rectangle, from its top-left corner, onto the
   * area in the picture, measured in the same pixels as `width` and `height`. An orthographic
   * camera makes that exact. The page scales all of it with the picture.
   */
  slot?: { box: readonly [number, number]; matrix: readonly [number, number, number, number, number, number] };
  /** A flat-lay's top layer (the phone's rim, a petal lying over the glass), the same size as `src`. */
  bezel?: string;
};

const scrap = (name: string, width: number, height: number, tint?: string): PageArtEntry => ({ src: `/scraps/${name}.webp`, width, height, standIn: true, ...(tint ? { tint } : {}) });

/** A sample photo every demo uses (templates/_shared/demo-photos.ts, p2): what a polaroid on these pages shows. */
export const SAMPLE_PHOTO = { src: "/demo/photos/p2.webp", width: 896, height: 1200 } as const;

/** The same for every colourway until the renders arrive: the template's poster and a sample photo. */
const SCENES = {
  // Drawn as the CSS phone with the live demo in it; the render brings its own phone and a `slot`.
  "hero-flatlay": { src: "/templates/{slug}/poster.jpg", width: 1170, height: 1800, standIn: true },
  "experience-flatlay": { src: "/templates/{slug}/poster.jpg", width: 1170, height: 1800, standIn: true },
  // The sample photo, framed as a polaroid.
  "step-photo": { ...SAMPLE_PHOTO, standIn: true },
  // Old letters, a wax-sealed envelope and a quill: the collage templates' own cut-out.
  "step-note": { src: "/scraps/letters-quill.webp", width: 502, height: 476, standIn: true },
  // The template's cover in a small phone.
  "step-send": { src: "/templates/{slug}/poster.jpg", width: 1170, height: 1800, standIn: true },
} satisfies Partial<Record<ArtId, PageArtEntry>>;

/** Takes the pink out of a lily and leaves it the warm white of the renders to come. */
const IVORY = "grayscale(0.85) sepia(0.5) saturate(1.1) brightness(1.14) contrast(0.95)";
/** A flower on the footer: a dim shape, not a picture. */
const DIM = "saturate(0.55) brightness(0.5)";

export const PAGE_ART: Record<Flowers, Record<ArtId, PageArtEntry>> = {
  ivory: {
    ...SCENES,
    "lily-open": scrap("lily-pink", 478, 492, IVORY),
    "lily-three-quarter": scrap("lily-blush", 446, 496, IVORY),
    "lily-side": scrap("lily-pink", 478, 492, IVORY),
    "lily-stem-tall": scrap("lily-blush", 446, 496, IVORY),
    "petal-1": scrap("sakura", 438, 434, IVORY),
    "petal-2": scrap("blossom-pale", 438, 438, IVORY),
    "petal-3": scrap("sakura", 438, 434, IVORY),
    "petal-4": scrap("blossom-pale", 438, 438, IVORY),
    "leaf-1": scrap("leaf-skeleton", 388, 288),
    "leaf-2": scrap("leaf-skeleton", 388, 288),
    "lily-footer": scrap("lily-pink", 478, 492, DIM),
  },
  blush: {
    ...SCENES,
    "lily-open": scrap("lily-stargazer", 488, 488),
    "lily-three-quarter": scrap("lily-pink", 478, 492),
    "lily-side": scrap("lily-blush", 446, 496),
    "lily-stem-tall": scrap("lily-blush", 446, 496),
    "petal-1": scrap("sakura", 438, 434),
    "petal-2": scrap("blossom-pale", 438, 438),
    "petal-3": scrap("plumeria-pink", 506, 506),
    "petal-4": scrap("sakura", 438, 434),
    "leaf-1": scrap("leaf-skeleton", 388, 288),
    "leaf-2": scrap("leaf-skeleton", 388, 288),
    "lily-footer": scrap("lily-stargazer", 488, 488, DIM),
  },
  wine: {
    ...SCENES,
    "lily-open": scrap("lily-wine", 424, 378),
    "lily-three-quarter": scrap("dahlia-wine", 428, 402),
    "lily-side": scrap("magnolia-wine", 508, 474),
    "lily-stem-tall": scrap("lily-wine", 424, 378),
    "petal-1": scrap("cosmos-chocolate", 452, 406),
    "petal-2": scrap("rose-oxblood", 334, 338),
    "petal-3": scrap("poppy-wine", 388, 408),
    "petal-4": scrap("cosmos-chocolate", 452, 406),
    "leaf-1": scrap("leaf-skeleton", 388, 288),
    "leaf-2": scrap("leaf-skeleton", 388, 288),
    "lily-footer": scrap("lily-wine", 424, 378, DIM),
  },
  moonlight: {
    ...SCENES,
    "lily-open": scrap("blue-lily", 414, 372),
    "lily-three-quarter": scrap("blue-clematis", 458, 494),
    "lily-side": scrap("blue-hibiscus", 514, 548),
    "lily-stem-tall": scrap("blue-lily", 414, 372),
    "petal-1": scrap("blue-pansy", 432, 424),
    "petal-2": scrap("blue-poppy", 504, 472),
    "petal-3": scrap("blue-pansy", 432, 424),
    "petal-4": scrap("blue-clematis", 458, 494),
    "leaf-1": scrap("leaf-skeleton", 388, 288),
    "leaf-2": scrap("leaf-skeleton", 388, 288),
    "lily-footer": scrap("blue-lily", 414, 372, DIM),
  },
};

/** One piece of art in a colourway, with `{slug}` filled in. */
export function pageArt(id: ArtId, flowers: Flowers, slug = ""): PageArtEntry {
  const entry = PAGE_ART[flowers][id];
  return entry.src.includes("{slug}") ? { ...entry, src: entry.src.replace("{slug}", slug) } : entry;
}

/**
 * Where a flat-lay's slot goes, as CSS for a box inside the picture's own box (position: relative,
 * the picture's aspect ratio). Everything is a share of the picture, so it holds at any width.
 */
export function slotStyle(entry: PageArtEntry): { left: string; top: string; width: string; aspectRatio: string; transformOrigin: string; transform: string } | null {
  if (!entry.slot) return null;
  const [boxW, boxH] = entry.slot.box;
  const [a, b, c, d, e, f] = entry.slot.matrix;
  const pct = (n: number) => `${+(n * 100).toFixed(4)}%`;
  return {
    left: pct(e / entry.width),
    top: pct(f / entry.height),
    width: pct(boxW / entry.width),
    aspectRatio: `${boxW} / ${boxH}`,
    transformOrigin: "0 0",
    transform: `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`,
  };
}
