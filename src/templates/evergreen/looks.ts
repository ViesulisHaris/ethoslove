import type { AmbienceKind } from "../_shared/Ambience";

export type LookId = "sage" | "olive" | "mint";

export type Look = {
  /** The page and the words written straight on it. */
  wall: string;
  wallInk: string;
  /** Old newsprint and its print. */
  news: string;
  newsInk: string;
  /** Polaroids and the letter, and their ink. */
  paper: string;
  ink: string;
  /** The record's label. */
  label: string;
  labelInk: string;
  accent: string;
  card: { card: string; ink: string; soft: string; bar: string };
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  sage: {
    wall: "#AEBD9C",
    wallInk: "#25311F",
    news: "#ECE4CF",
    newsInk: "#3B352C",
    paper: "#FBF9F2",
    ink: "#2F3B28",
    label: "#7E9370",
    labelInk: "#F4F0E2",
    accent: "#4F6B42",
    card: { card: "#E6EBDA", ink: "#2F3B28", soft: "#6E7F62", bar: "#4F6B42" },
    ambience: [{ kind: "petals", colors: ["#F4EEDC", "#DCE6CC", "#FFFFFF"], count: 8 }],
    confetti: ["#F4EEDC", "#7E9370", "#FFFFFF", "#4F6B42"],
  },
  olive: {
    wall: "#9A9B6E",
    wallInk: "#22240F",
    news: "#E9DFC4",
    newsInk: "#3A3324",
    paper: "#FBF7EC",
    ink: "#2E2E18",
    label: "#B4A35F",
    labelInk: "#2E2A12",
    accent: "#5F6127",
    card: { card: "#E9E5CF", ink: "#2E2E18", soft: "#77744E", bar: "#5F6127" },
    ambience: [{ kind: "petals", colors: ["#F1E8CF", "#D9D3A7", "#FFFFFF"], count: 8 }],
    confetti: ["#F1E8CF", "#B4A35F", "#FFFFFF", "#5F6127"],
  },
  mint: {
    wall: "#C8DDCC",
    wallInk: "#1E3A2D",
    news: "#F1ECDE",
    newsInk: "#39362E",
    paper: "#FFFDF8",
    ink: "#1F3A2E",
    label: "#6FAE8F",
    labelInk: "#F6FBF7",
    accent: "#2F7E5C",
    card: { card: "#E7F1E9", ink: "#1F3A2E", soft: "#5E8371", bar: "#2F7E5C" },
    ambience: [{ kind: "petals", colors: ["#F6F2E6", "#D6E9DA", "#FFFFFF"], count: 8 }],
    confetti: ["#F6F2E6", "#6FAE8F", "#FFFFFF", "#2F7E5C"],
  },
};

/**
 * Our photographed cut-outs, turned to this collage's colours with filters: the black butterfly is
 * inverted into a cream cabbage white, the wine one turned green, the red maple leaf green, the pink
 * lily and flowers bleached white, and the pink satin bow taken to sage. Pass as a Scrap's `tone`.
 */
export const TONE = {
  creamWings: "invert(.92) sepia(.5)",
  creamMoth: "invert(.85) sepia(.6)",
  greenWings: "hue-rotate(115deg) saturate(.7) brightness(1.15)",
  greenLeaf: "hue-rotate(95deg) saturate(.6) brightness(.9)",
  whiteFlower: "grayscale(1) sepia(.2) brightness(1.3)",
  sageRibbon: "hue-rotate(110deg) saturate(.45) brightness(.95)",
} as const;

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["sage", "olive", "mint"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].news, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
