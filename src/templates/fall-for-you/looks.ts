import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "gingham" | "sage" | "cranberry";

/** The fabrics a patchwork pumpkin and the letter blocks are cut from. */
export type Fabrics = { a: string; aInk: string; b: string; bInk: string; c: string; cInk: string; d: string; dInk: string };

export type Look = {
  /** The page and the gingham over it. */
  wall: string;
  check: string;
  /** Words written straight on the page: the scroll hint. */
  wallInk: string;
  /** Polaroids, cards and the letter, and their ink. */
  paper: string;
  ink: string;
  accent: string;
  fabrics: Fabrics;
  /** The felt of the pumpkin's stem and leaf, and the stitching. */
  stem: string;
  leaf: string;
  stitch: string;
  /** The wooden letters' faces and the letters on them. */
  block: { faces: string[]; ink: string };
  /** The kraft tag. */
  tag: { paper: string; ink: string; string: string };
  card: { card: string; ink: string; soft: string; bar: string };
  cardDark: boolean;
  tape: string;
  dark: boolean;
  /** The real leaves round the photos. */
  leaves: [ScrapId, ScrapId, ScrapId];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  /** The cover: the room before the candle is lit, and the light it gives. */
  room: { dark: string; glow: string };
};

export const LOOKS: Record<LookId, Look> = {
  gingham: {
    wall: "#EFDCC2",
    check: "rgba(160,98,55,.3)",
    wallInk: "#4A2A16",
    paper: "#FFFBF4",
    ink: "#3B2416",
    accent: "#C8602A",
    fabrics: { a: "#E07A36", aInk: "#F7D9B6", b: "#B8492C", bInk: "#F2C9A8", c: "#F3E3C8", cInk: "#D9753A", d: "#D9A441", dInk: "#FFF3D6" },
    stem: "#6B4A2E",
    leaf: "#7E8B4A",
    stitch: "#FFF4E0",
    block: { faces: ["#B8492C", "#EAD4AE", "#7E8B4A", "#D9A441", "#C9864C"], ink: "#3B2416" },
    tag: { paper: "#E9CFA5", ink: "#4A2A16", string: "#8A5A36" },
    card: { card: "#F6E2C6", ink: "#3B2416", soft: "#8A5A36", bar: "#C8602A" },
    cardDark: false,
    tape: "#E2B27C",
    dark: false,
    leaves: ["leaf-maple-orange", "leaf-maple-gold", "leaf-maple-red"],
    ambience: [{ kind: "leaves", colors: ["#C8602A", "#9C4A1E", "#D9A441"], count: 9 }],
    room: { dark: "#1E140D", glow: "rgba(255,176,92,.55)" },
  },
  sage: {
    wall: "#E4E6D2",
    check: "rgba(110,128,86,.26)",
    wallInk: "#2F3A24",
    paper: "#FFFDF6",
    ink: "#2F2A1E",
    accent: "#B8612E",
    fabrics: { a: "#D9823F", aInk: "#F7E2C2", b: "#8C9A62", bInk: "#EEF1DC", c: "#F2E8D2", cInk: "#C9733A", d: "#C9A24A", dInk: "#FFF6DC" },
    stem: "#5C4A30",
    leaf: "#6F7F45",
    stitch: "#FFF8E8",
    block: { faces: ["#8C9A62", "#EFE3C6", "#C9733A", "#C9A24A", "#B5A27A"], ink: "#2F2A1E" },
    tag: { paper: "#E8DCC0", ink: "#2F3A24", string: "#7B6A48" },
    card: { card: "#EEF0DD", ink: "#2F2A1E", soft: "#6F7F45", bar: "#B8612E" },
    cardDark: false,
    tape: "#C9C79A",
    dark: false,
    leaves: ["leaf-maple-gold", "leaf-maple-orange", "leaf-skeleton"],
    ambience: [{ kind: "leaves", colors: ["#B8612E", "#C9A24A", "#8C9A62"], count: 9 }],
    room: { dark: "#141A10", glow: "rgba(255,190,110,.5)" },
  },
  cranberry: {
    wall: "#F1DCD2",
    check: "rgba(140,40,45,.24)",
    wallInk: "#4A1A1E",
    paper: "#FFFAF5",
    ink: "#3A1A1C",
    accent: "#A8323A",
    fabrics: { a: "#D8743A", aInk: "#F8DCC0", b: "#9E2F38", bInk: "#F4C9C7", c: "#F4E4D4", cInk: "#B23A3F", d: "#D9A441", dInk: "#FFF3D6" },
    stem: "#5E3A28",
    leaf: "#7A8A4A",
    stitch: "#FFF2E8",
    block: { faces: ["#9E2F38", "#F1DFC6", "#D9A441", "#7A8A4A", "#C9864C"], ink: "#3A1A1C" },
    tag: { paper: "#EBD3BD", ink: "#4A1A1E", string: "#8A4A3A" },
    card: { card: "#F6DCD4", ink: "#3A1A1C", soft: "#8A3A3A", bar: "#A8323A" },
    cardDark: false,
    tape: "#E3A79E",
    dark: false,
    leaves: ["leaf-maple-red", "leaf-maple-orange", "leaf-maple-gold"],
    ambience: [{ kind: "leaves", colors: ["#A8323A", "#D8743A", "#D9A441"], count: 9 }],
    room: { dark: "#1C0F10", glow: "rgba(255,170,110,.52)" },
  },
};

export type Spot = { x: number; y: number; w: number; rotate: number };

/**
 * The polaroids on the first screen, by how many photos there are, in `--p` from the section's
 * top-left. Four is the picture it is drawn for: two up top, overlapping, the name in blocks across
 * the middle, then one right and one left, as the gingham frames on Pinterest lay them.
 */
export const HERO_SPOTS: Record<1 | 2 | 3 | 4, Spot[]> = {
  1: [{ x: 50, y: 58, w: 64, rotate: -3 }],
  2: [
    { x: 31, y: 40, w: 44, rotate: -6 },
    { x: 69, y: 34, w: 44, rotate: 5 },
  ],
  3: [
    { x: 29, y: 44, w: 40, rotate: -6 },
    { x: 69, y: 34, w: 42, rotate: 5 },
    { x: 61, y: 124, w: 42, rotate: 3 },
  ],
  4: [
    { x: 29, y: 44, w: 40, rotate: -6 },
    { x: 69, y: 34, w: 42, rotate: 5 },
    { x: 61, y: 124, w: 42, rotate: 3 },
    { x: 32, y: 163, w: 42, rotate: -2 },
  ],
};

/** Where the name in blocks goes, by photo count: its centre and how wide the row may be. */
export const BLOCKS_AT: Record<1 | 2 | 3 | 4, { x: number; y: number; w: number }> = {
  1: { x: 50, y: 108, w: 70 },
  2: { x: 50, y: 82, w: 72 },
  3: { x: 61, y: 83, w: 58 },
  4: { x: 61, y: 83, w: 58 },
};

/** The recipe card (the note) when it takes an empty polaroid's place. */
export const NOTE_SPOTS: Record<1 | 2 | 3, Spot> = {
  1: { x: 36, y: 154, w: 56, rotate: -3 },
  2: { x: 42, y: 140, w: 62, rotate: -2 },
  3: { x: 32, y: 162, w: 46, rotate: -2 },
};

/** A drawn or cut-out thing on the first screen, placed by its centre. */
export type Deco = { kind: "candle" | "teddy" | "pumpkin" | "cup" | "acorn" | "heart" | "leafA" | "leafB" | "leafC" | "tag"; x: number; y: number; w: number; rotate?: number; z?: number };

export const HERO_DECO: Record<1 | 2 | 3 | 4, Deco[]> = {
  1: [
    { kind: "leafA", x: 7, y: 10, w: 22, rotate: -24 },
    { kind: "leafB", x: 93, y: 12, w: 20, rotate: 28 },
    { kind: "heart", x: 16, y: 26, w: 13, rotate: -12, z: 8 },
    { kind: "acorn", x: 84, y: 30, w: 9, rotate: 14, z: 8 },
    { kind: "candle", x: 86, y: 136, w: 17, z: 6 },
    { kind: "pumpkin", x: 78, y: 170, w: 28, rotate: 4, z: 7 },
    { kind: "cup", x: 89, y: 99, w: 13, rotate: 6, z: 6 },
    { kind: "leafC", x: 8, y: 184, w: 18, rotate: -16 },
  ],
  2: [
    { kind: "leafA", x: 6, y: 8, w: 22, rotate: -24 },
    { kind: "leafB", x: 94, y: 6, w: 20, rotate: 28 },
    { kind: "heart", x: 12, y: 18, w: 13, rotate: -12, z: 8 },
    { kind: "acorn", x: 50, y: 6, w: 9, rotate: 14, z: 8 },
    { kind: "teddy", x: 84, y: 128, w: 24, rotate: 4, z: 6 },
    { kind: "candle", x: 88, y: 102, w: 15, z: 5 },
    { kind: "pumpkin", x: 80, y: 172, w: 28, rotate: 4, z: 7 },
    { kind: "cup", x: 14, y: 182, w: 13, rotate: -6, z: 6 },
    { kind: "leafC", x: 94, y: 190, w: 18, rotate: 16 },
  ],
  3: [
    { kind: "leafA", x: 5, y: 10, w: 22, rotate: -24 },
    { kind: "leafB", x: 95, y: 6, w: 19, rotate: 30 },
    { kind: "heart", x: 11, y: 22, w: 13, rotate: -12, z: 8 },
    { kind: "acorn", x: 47, y: 8, w: 8.5, rotate: 14, z: 8 },
    { kind: "teddy", x: 20, y: 103, w: 24, rotate: -4, z: 6 },
    { kind: "tag", x: 22, y: 127, w: 28, rotate: -7, z: 7 },
    { kind: "candle", x: 90, y: 110, w: 15, z: 5 },
    { kind: "cup", x: 88, y: 152, w: 13, rotate: 6, z: 6 },
    { kind: "pumpkin", x: 72, y: 172, w: 30, rotate: 4, z: 7 },
    { kind: "leafC", x: 94, y: 190, w: 19, rotate: -14 },
  ],
  4: [
    { kind: "leafA", x: 5, y: 10, w: 22, rotate: -24 },
    { kind: "leafB", x: 95, y: 6, w: 19, rotate: 30 },
    { kind: "heart", x: 11, y: 22, w: 13, rotate: -12, z: 8 },
    { kind: "acorn", x: 47, y: 8, w: 8.5, rotate: 14, z: 8 },
    { kind: "teddy", x: 20, y: 103, w: 24, rotate: -4, z: 6 },
    { kind: "tag", x: 22, y: 127, w: 28, rotate: -7, z: 7 },
    { kind: "candle", x: 90, y: 110, w: 15, z: 5 },
    { kind: "cup", x: 88, y: 152, w: 13, rotate: 6, z: 6 },
    { kind: "pumpkin", x: 72, y: 172, w: 30, rotate: 4, z: 9 },
    { kind: "leafC", x: 94, y: 190, w: 19, rotate: -14 },
  ],
};

export const HERO_HEIGHT: Record<1 | 2 | 3 | 4, number> = { 1: 196, 2: 200, 3: 198, 4: 198 };
export const SCROLL_AT: Record<1 | 2 | 3 | 4, { x: number; y: number }> = { 1: { x: 14, y: 120 }, 2: { x: 14, y: 106 }, 3: { x: 91, y: 121 }, 4: { x: 91, y: 121 } };

/** Which photos go where: up to four on the first screen, the rest further down. */
export function arrangePhotos<T>(photos: T[]): { hero: T[]; scatter: T[] } {
  return { hero: photos.slice(0, 4), scatter: photos.slice(4, 10) };
}

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["gingham", "sage", "cranberry"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
