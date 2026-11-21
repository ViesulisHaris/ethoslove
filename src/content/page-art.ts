import manifest from "../../public/art/pages/manifest.json";
import type { Flowers } from "@/content/template-page-themes";

/**
 * The art of the redesigned pages: the lilies, petals and leaves that lie round a page, the two
 * phones lying on flowers, the three pictures of "How to send" and the footer's flower. All of it
 * is rendered (scripts/art/pages, Blender) into public/art/pages, and that folder's manifest.json
 * says what each piece is: its file, its pixel size, a half-size file for small screens and, where
 * a piece has an empty place in it (a phone's screen, a polaroid's photo, a note card), the CSS
 * matrix that lays something into that place.
 *
 * Nothing here is typed in by hand. This module reads the manifest, so a new render is a new file
 * and a new manifest and no change to any page: `git merge` the art and the sizes and matrices
 * follow. A page asks for an id and a colourway and never names a file.
 *
 * What comes with the art (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "3D art"): every piece
 * is lit from the top left, so none is ever mirrored and none is turned more than about 25 degrees
 * either way; their shadows are made for pale grounds, so only `lily-footer` lies on the dark
 * footer; and nothing overlaps the hero's phone except its own bezel layer.
 * tests/unit/page-art.test.ts holds the table to its files.
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
  "step-phone",
  "lily-footer",
] as const;

export type ArtId = (typeof ART_IDS)[number];

/** The empty places a piece can have. */
export type SlotName = "screen" | "photo" | "card";

/**
 * An empty place in a picture. `box` is the size, in CSS pixels, of the flat rectangle a page lays
 * into it; `matrix` the six numbers of the CSS `matrix()` that carries that rectangle, from its
 * top-left corner (transform-origin 0 0), onto the place, in the 2× file's own pixels; `radius`
 * the place's corner radius in box pixels.
 */
export type ArtSlot = { box: readonly [number, number]; matrix: readonly [number, number, number, number, number, number]; radius: number };

export type PageArtEntry = {
  /** The 2× file, and its size in its own pixels. */
  src: string;
  width: number;
  height: number;
  /** The same picture at half the size, for a screen that needs no more. */
  src1x: string;
  width1x: number;
  slots: Partial<Record<SlotName, ArtSlot>>;
  /** A flat-lay's top layer (the phone's rim), the same size as the picture, laid over what was put in its screen. */
  bezel?: { src: string; src1x: string };
};

type ManifestPlace = { box: number[]; radius: number; matrix: string };
type ManifestVariant = { file: string; w: number; h: number; x1: { file: string; w: number; h: number }; screen?: ManifestPlace; photo?: ManifestPlace; card?: ManifestPlace; bezel?: unknown };
type Manifest = { base: string; pieces: Record<string, Record<string, ManifestVariant>> };

const ART = manifest as unknown as Manifest;

/** "matrix(a, b, c, d, e, f)" as its six numbers. */
function parseMatrix(text: string): ArtSlot["matrix"] {
  const numbers = text.replace(/^matrix\(|\)$/g, "").split(",").map(Number);
  if (numbers.length !== 6 || numbers.some((n) => !Number.isFinite(n))) throw new Error(`page art: not a CSS matrix: ${text}`);
  return numbers as unknown as ArtSlot["matrix"];
}

function slotOf(place: ManifestPlace | undefined): ArtSlot | undefined {
  return place ? { box: [place.box[0], place.box[1]], matrix: parseMatrix(place.matrix), radius: place.radius } : undefined;
}

/** One piece of art in a colourway. A piece with no flowers in it (a leaf, a step's picture) is the same in every one. */
export function pageArt(id: ArtId, flowers: Flowers): PageArtEntry {
  const piece = ART.pieces[id];
  const variant = piece?.[flowers] ?? piece?.plain;
  if (!variant) throw new Error(`page art: no “${id}” in “${flowers}”`);
  const slots: PageArtEntry["slots"] = {};
  for (const name of ["screen", "photo", "card"] as const) {
    const slot = slotOf(variant[name]);
    if (slot) slots[name] = slot;
  }
  const at = (file: string) => ART.base + file;
  // The bezel's files are named after the picture's: <picture>-bezel.webp and <picture>-bezel-1x.webp.
  const bezel = variant.bezel ? { src: at(variant.file.replace(/\.webp$/, "-bezel.webp")), src1x: at(variant.file.replace(/\.webp$/, "-bezel-1x.webp")) } : undefined;
  return { src: at(variant.file), width: variant.w, height: variant.h, src1x: at(variant.x1.file), width1x: variant.x1.w, slots, ...(bezel ? { bezel } : {}) };
}

/** Every colourway a piece comes in ("plain" for one that has no flowers in it). */
export function artVariants(id: ArtId): string[] {
  return Object.keys(ART.pieces[id] ?? {});
}

/**
 * `srcset` for a piece shown `shown` CSS pixels wide at most: the browser takes the half-size file
 * where that is enough for the screen it is on, and the full one where it is not.
 */
export function artSrcSet(entry: Pick<PageArtEntry, "src" | "src1x" | "width" | "width1x">): string {
  return `${entry.src1x} ${entry.width1x}w, ${entry.src} ${entry.width}w`;
}

/**
 * Where a slot goes, as CSS for a box inside the picture's own box (position: relative, the
 * picture's aspect ratio). Everything is a share of the picture, so it holds at any shown width:
 * the box is laid out at its share of the picture's width and then carried by the matrix's own
 * turn and stretch, which need no scaling.
 */
export function slotStyle(entry: Pick<PageArtEntry, "width" | "height">, slot: ArtSlot): { left: string; top: string; width: string; aspectRatio: string; transformOrigin: string; transform: string; borderRadius: string } {
  const [boxW, boxH] = slot.box;
  const [a, b, c, d, e, f] = slot.matrix;
  const pct = (n: number) => `${+(n * 100).toFixed(4)}%`;
  return {
    left: pct(e / entry.width),
    top: pct(f / entry.height),
    width: pct(boxW / entry.width),
    aspectRatio: `${boxW} / ${boxH}`,
    transformOrigin: "0 0",
    transform: `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`,
    borderRadius: slot.radius ? `${pct(slot.radius / boxW)} / ${pct(slot.radius / boxH)}` : "0",
  };
}

/**
 * A slot's place in its picture, for laying the picture out round it: the slot's middle as shares
 * of the picture, how many times wider the picture is than the slot is drawn (`perWidth`), how
 * far the slot is turned, and the size of the upright box that holds the turned slot, in slot
 * widths. A phone's screen drawn 240 px wide in a picture with `perWidth` 3.4 means a picture
 * 816 px wide.
 */
export function slotGeometry(entry: Pick<PageArtEntry, "width" | "height">, slot: ArtSlot): { centerX: number; centerY: number; perWidth: number; turn: number; spanX: number; spanY: number } {
  const [boxW, boxH] = slot.box;
  const [a, b, c, d, e, f] = slot.matrix;
  const corners = [
    [0, 0],
    [boxW, 0],
    [boxW, boxH],
    [0, boxH],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const drawn = boxW * Math.hypot(a, b);
  return {
    centerX: (a * boxW) / 2 / entry.width + (c * boxH) / 2 / entry.width + e / entry.width,
    centerY: (b * boxW) / 2 / entry.height + (d * boxH) / 2 / entry.height + f / entry.height,
    perWidth: entry.width / drawn,
    turn: (Math.atan2(b, a) * 180) / Math.PI,
    spanX: (Math.max(...xs) - Math.min(...xs)) / drawn,
    spanY: (Math.max(...ys) - Math.min(...ys)) / drawn,
  };
}

/** A sample photo every demo uses (templates/_shared/demo-photos.ts, p2): what a polaroid on these pages shows. */
export const SAMPLE_PHOTO = { src: "/demo/photos/p2.webp", width: 896, height: 1200 } as const;
