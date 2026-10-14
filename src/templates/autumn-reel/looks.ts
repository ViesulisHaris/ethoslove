import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "rust" | "espresso" | "olive";

export type Look = {
  /** The page. */
  wall: string;
  /** A soft darker edge round the page, like an old print. */
  vignette: string;
  /** Words written straight on the page: the scroll hint. */
  wallInk: string;
  /** The old book's page and its print. */
  page: string;
  pageInk: string;
  /** The film: its black stock, the sprocket holes and the dotted cream border. */
  film: string;
  sprocket: string;
  border: string;
  dot: string;
  /** The cut-out words: their paper and ink. */
  word: string;
  wordInk: string;
  /** Paper for the letter and cards, and its ink. */
  paper: string;
  ink: string;
  accent: string;
  tape: string;
  card: { card: string; ink: string; soft: string; bar: string };
  cardDark: boolean;
  dark: boolean;
  leaves: [ScrapId, ScrapId, ScrapId];
  /** A colour filter for the gingham bow, so it matches the look. */
  bowTone: string;
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
};

export const LOOKS: Record<LookId, Look> = {
  rust: {
    wall: "#7A3315",
    vignette: "rgba(40,12,4,.55)",
    wallInk: "#FBEBD7",
    page: "#EFE2C8",
    pageInk: "#2B1D12",
    film: "#16110E",
    sprocket: "#F3E6CF",
    border: "#F3E6CF",
    dot: "#1B1410",
    word: "#F8F1E3",
    wordInk: "#1E1712",
    paper: "#F7EEDD",
    ink: "#2E2015",
    accent: "#B5481C",
    tape: "#C9A27A",
    card: { card: "#F1E1C6", ink: "#2E2015", soft: "#8A5A36", bar: "#B5481C" },
    cardDark: false,
    dark: true,
    leaves: ["leaf-maple-orange", "leaf-maple-red", "leaf-maple-gold"],
    bowTone: "sepia(.55) saturate(.7) hue-rotate(-12deg) brightness(.92)",
    ambience: [{ kind: "leaves", colors: ["#C2551E", "#E39B3A", "#8E2E12"], count: 8 }],
  },
  espresso: {
    wall: "#3C2418",
    vignette: "rgba(15,6,2,.6)",
    wallInk: "#F6E7D2",
    page: "#EADCC0",
    pageInk: "#27190F",
    film: "#120D0B",
    sprocket: "#EFE2CB",
    border: "#EFE2CB",
    dot: "#17110D",
    word: "#F6EFE2",
    wordInk: "#1B140F",
    paper: "#F5EBD9",
    ink: "#2B1D13",
    accent: "#C27A3A",
    tape: "#B89670",
    card: { card: "#2E2018", ink: "#F6E7D2", soft: "#C9A57E", bar: "#C27A3A" },
    cardDark: true,
    dark: true,
    leaves: ["leaf-maple-gold", "leaf-maple-orange", "leaf-maple-red"],
    bowTone: "sepia(.7) saturate(.55) brightness(.85)",
    ambience: [{ kind: "leaves", colors: ["#C27A3A", "#E3B25E", "#7A3A1A"], count: 8 }],
  },
  olive: {
    wall: "#56552B",
    vignette: "rgba(20,20,6,.55)",
    wallInk: "#F7F0DC",
    page: "#EFE6CC",
    pageInk: "#2A2614",
    film: "#14130C",
    sprocket: "#F2EAD3",
    border: "#F2EAD3",
    dot: "#191812",
    word: "#F8F3E4",
    wordInk: "#1D1B10",
    paper: "#F7F1E0",
    ink: "#2C2817",
    accent: "#B5621E",
    tape: "#BCA97A",
    card: { card: "#EEE7CF", ink: "#2C2817", soft: "#6E6A3A", bar: "#B5621E" },
    cardDark: false,
    dark: true,
    leaves: ["leaf-maple-gold", "leaf-maple-orange", "leaf-skeleton"],
    bowTone: "sepia(.6) saturate(.6) hue-rotate(10deg) brightness(.9)",
    ambience: [{ kind: "leaves", colors: ["#B5621E", "#D9A441", "#7A7A3A"], count: 8 }],
  },
};

export type Spot = { x: number; y: number; w: number; rotate: number };

/**
 * The film frames on the first screen, by how many there are, in `--p` from the section's top-left:
 * one big up top left, one middle right, one bottom left, as the autumn film frames on Pinterest lay
 * them. A fourth photo goes in the heart.
 */
export const FRAME_SPOTS: Record<1 | 2 | 3, Spot[]> = {
  1: [{ x: 50, y: 92, w: 72, rotate: -3 }],
  2: [
    { x: 33, y: 64, w: 54, rotate: -5 },
    { x: 64, y: 128, w: 56, rotate: 3 },
  ],
  3: [
    { x: 33, y: 62, w: 52, rotate: -5 },
    { x: 66, y: 116, w: 54, rotate: 3 },
    { x: 33, y: 168, w: 50, rotate: -3 },
  ],
};

/** A drawn or cut-out thing on the first screen, placed by its centre. */
export type Deco = { kind: "page" | "apple" | "bow" | "leafA" | "leafB" | "leafC" | "heart" | "tape" | "words" | "cats" | "sunflower" | "moonleaf"; x: number; y: number; w: number; rotate?: number; z?: number };

export const HERO_DECO: Record<1 | 2 | 3, Deco[]> = {
  1: [
    { kind: "page", x: 68, y: 26, w: 60, rotate: 3, z: 1 },
    { kind: "apple", x: 16, y: 26, w: 22, rotate: -8, z: 8 },
    { kind: "leafA", x: 86, y: 44, w: 26, rotate: 24, z: 3 },
    { kind: "bow", x: 22, y: 50, w: 22, rotate: -14, z: 9 },
    { kind: "words", x: 50, y: 158, w: 76, rotate: -2, z: 7 },
    { kind: "cats", x: 80, y: 190, w: 26, rotate: 4, z: 8 },
    { kind: "sunflower", x: 14, y: 186, w: 17, rotate: -10, z: 6 },
    { kind: "leafB", x: 50, y: 186, w: 18, rotate: -20, z: 5 },
  ],
  2: [
    { kind: "page", x: 70, y: 26, w: 58, rotate: 3, z: 1 },
    { kind: "apple", x: 13, y: 22, w: 20, rotate: -8, z: 8 },
    { kind: "leafA", x: 86, y: 46, w: 24, rotate: 24, z: 3 },
    { kind: "bow", x: 12, y: 40, w: 20, rotate: -14, z: 9 },
    { kind: "heart", x: 82, y: 82, w: 18, rotate: 10, z: 6 },
    { kind: "tape", x: 82, y: 98, w: 18, rotate: 14, z: 9 },
    { kind: "words", x: 27, y: 128, w: 42, rotate: -3, z: 7 },
    { kind: "moonleaf", x: 22, y: 172, w: 22, rotate: -12, z: 5 },
    { kind: "cats", x: 78, y: 182, w: 24, rotate: 4, z: 8 },
    { kind: "sunflower", x: 94, y: 160, w: 15, rotate: 12, z: 6 },
  ],
  3: [
    { kind: "page", x: 70, y: 25, w: 58, rotate: 3, z: 1 },
    { kind: "leafA", x: 86, y: 44, w: 24, rotate: 24, z: 3 },
    { kind: "leafC", x: 58, y: 36, w: 16, rotate: -30, z: 2 },
    { kind: "apple", x: 13, y: 21, w: 20, rotate: -8, z: 8 },
    { kind: "bow", x: 12, y: 40, w: 19, rotate: -14, z: 9 },
    { kind: "heart", x: 25, y: 104, w: 18, rotate: -8, z: 6 },
    { kind: "tape", x: 83, y: 89, w: 17, rotate: 14, z: 9 },
    { kind: "words", x: 72, y: 158, w: 46, rotate: 2, z: 7 },
    { kind: "moonleaf", x: 66, y: 186, w: 18, rotate: -12, z: 5 },
    { kind: "cats", x: 86, y: 186, w: 22, rotate: 4, z: 8 },
    { kind: "sunflower", x: 93, y: 131, w: 14, rotate: 12, z: 6 },
  ],
};

export const HERO_HEIGHT: Record<1 | 2 | 3, number> = { 1: 200, 2: 198, 3: 198 };
export const SCROLL_AT: Record<1 | 2 | 3, { x: number; y: number }> = { 1: { x: 86, y: 126 }, 2: { x: 14, y: 96 }, 3: { x: 13, y: 124 } };

/**
 * Which photos go where: up to three in film frames on the first screen and a fourth in the heart,
 * the rest further down. With three or fewer, the heart is a little gingham one instead.
 */
export function arrangePhotos<T>(photos: T[]): { frames: T[]; heart: T | undefined; scatter: T[] } {
  return { frames: photos.slice(0, 3), heart: photos[3], scatter: photos.slice(4, 10) };
}

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["rust", "espresso", "olive"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].page, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
