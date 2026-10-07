import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "pumpkin" | "midnight" | "cozy";

/** Where a cut-out goes on the page; each look puts its own thing there. */
export type Slot = "sky" | "leafA" | "leafB" | "leafC" | "cat" | "light" | "treat" | "drink" | "round" | "sign" | "flutter";

export type Look = {
  /** The page, and the gingham over it (none on kraft). */
  wall: string;
  check: string | null;
  /** Words written straight on the page: the scroll hint, the hint pill's text. */
  wallInk: string;
  /** The torn sheets of faint handwriting behind the first photo. */
  scriptPaper: string;
  scriptInk: string;
  /** Paper pieces (the name, the postcard, the letter) and their ink. */
  paper: string;
  ink: string;
  /** The film the photos are on, and its edge print. */
  film: string;
  filmInk: string;
  /** The kraft tag on the first screen, and its string. */
  tag: { paper: string; string: string };
  card: { card: string; ink: string; soft: string; bar: string };
  /** Whether that card is dark, for what sits on it (the surprise). */
  cardDark: boolean;
  tape: string;
  accent: string;
  dark: boolean;
  slots: Record<Slot, ScrapId>;
  /** The heap of leaves on the first screen. */
  leaves: ScrapId[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  pumpkin: {
    wall: "#FBEAD3",
    check: "rgba(232,116,42,.2)",
    wallInk: "#5A2A0E",
    scriptPaper: "#F2B27A",
    scriptInk: "rgba(110,45,10,.5)",
    paper: "#FFF8EE",
    ink: "#3A1F10",
    film: "#17110F",
    filmInk: "#F28C28",
    tag: { paper: "#F1DDBB", string: "#6B4226" },
    card: { card: "#FFE2C4", ink: "#3A1A08", soft: "#9A5B2E", bar: "#E8742A" },
    cardDark: false,
    tape: "#F2A15E",
    accent: "#E8742A",
    dark: false,
    slots: { sky: "moon", leafA: "leaf-maple-orange", leafB: "leaf-maple-red", leafC: "leaf-maple-gold", cat: "cat-pumpkin", light: "candle-amber", treat: "cookie-cat", drink: "coffee-cup", round: "pumpkins-round", sign: "sign-pumpkins", flutter: "cat-walk" },
    leaves: ["leaf-maple-orange", "leaf-maple-red", "leaf-maple-gold"],
    ambience: [{ kind: "leaves", colors: ["#E8742A", "#C2410C", "#F2B33D"], count: 10 }],
    confetti: ["#E8742A", "#1A1412", "#FFF8EE", "#C2410C", "#F2B33D"],
  },
  midnight: {
    wall: "#1B1524",
    check: "rgba(160,120,220,.09)",
    wallInk: "#F3E9FB",
    scriptPaper: "#2E2440",
    scriptInk: "rgba(235,220,255,.32)",
    paper: "#F7F0E6",
    ink: "#2A1A2E",
    film: "#0B080D",
    filmInk: "#F28C28",
    tag: { paper: "#EFE4D4", string: "#B9A3D6" },
    card: { card: "#2A2136", ink: "#F3E9FB", soft: "#B8A6CF", bar: "#F28C28" },
    cardDark: true,
    tape: "#7A5CA3",
    accent: "#F28C28",
    dark: true,
    slots: { sky: "moon", leafA: "rose-black-large", leafB: "butterfly-black", leafC: "leaf-maple-orange", cat: "cat-black", light: "lantern", treat: "skull", drink: "vial-blood", round: "web", sign: "coffin", flutter: "bat-plush" },
    leaves: ["leaf-maple-orange", "leaf-maple-red", "leaf-maple-gold"],
    ambience: [
      { kind: "bats", colors: ["#0B080D", "#2A2136"], count: 6 },
      { kind: "sparkles", colors: ["#F3E9FB", "#F28C28"], count: 10 },
    ],
    confetti: ["#F28C28", "#8B5CC6", "#F3E9FB", "#0B080D"],
  },
  cozy: {
    wall: "#7B5537",
    check: null,
    wallInk: "#FBF1E1",
    scriptPaper: "#E2CFAE",
    scriptInk: "rgba(70,40,15,.5)",
    paper: "#FBF3E4",
    ink: "#3B2618",
    film: "#22170F",
    filmInk: "#E9B26B",
    tag: { paper: "#F5E9D2", string: "#E8D3B0" },
    card: { card: "#EFE2CB", ink: "#3B2618", soft: "#7E5E40", bar: "#C8752E" },
    cardDark: false,
    tape: "#D7B98F",
    accent: "#C8752E",
    dark: true,
    slots: { sky: "moon", leafA: "leaf-maple-gold", leafB: "leaf-maple-orange", leafC: "leaf-maple-red", cat: "cat-pumpkin", light: "candle-amber", treat: "cookie-cat", drink: "coffee-cup", round: "pumpkins-round", sign: "book-coffee", flutter: "charm-with-love" },
    leaves: ["leaf-maple-gold", "leaf-maple-orange", "leaf-maple-red"],
    ambience: [{ kind: "leaves", colors: ["#C8752E", "#8B4A1F", "#E9B26B"], count: 10 }],
    confetti: ["#C8752E", "#FBF1E1", "#E9B26B", "#5A3A22"],
  },
};

/** Which photos go where: the first is the hero, the next three go on the film strip, the rest scatter. */
export function arrangePhotos<T>(photos: T[]): { hero: T | undefined; strip: T[]; scatter: T[] } {
  return { hero: photos[0], strip: photos.slice(1, 4), scatter: photos.slice(4, 10) };
}

/**
 * How tall a strip of `n` frames of film stands, in `--p`, at the 48 it is drawn: frames 36.8 wide
 * (48 less the sprocket margins) at 1.18, 2.2 between them and 2.2 of film above and below.
 */
export const stripHeight = (n: number): number => (n === 0 ? 0 : 2.2 + n * 33.4);

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["pumpkin", "midnight", "cozy"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
