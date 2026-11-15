import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "linen" | "farmhouse" | "check" | "candlelit";

export type Look = {
  /** Whether the table is dark, which sets the words written straight on it in cream. */
  dark: boolean;
  /** The table's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** The colour of the lights' glow, as "r,g,b". */
  glow: string;
  /** A soft dark laid over the table's edges, and over all of it behind the letter. */
  vignette: string;
  veil: string;
  /** Words written on the table itself, above the card. */
  label: string;
  labelSoft: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  linen: {
    dark: false,
    floor: "#efe6d6",
    glow: "255,214,150",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(90,60,30,.18))",
    veil: "linear-gradient(180deg, rgba(60,36,16,.3), rgba(46,26,10,.5))",
    label: "#5a3418",
    labelSoft: "#9a6a48",
    accent: "#c8692a",
  },
  farmhouse: {
    dark: true,
    floor: "#4a2e1a",
    glow: "255,206,132",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(10,4,0,.5))",
    veil: "linear-gradient(180deg, rgba(26,12,4,.26), rgba(16,8,2,.5))",
    label: "#fbefd8",
    labelSoft: "#e3c49a",
    accent: "#c8561a",
  },
  check: {
    dark: false,
    floor: "#e6e2d0",
    glow: "255,224,170",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(30,50,30,.2))",
    veil: "linear-gradient(180deg, rgba(20,36,22,.3), rgba(14,26,16,.5))",
    label: "#2f4a32",
    labelSoft: "#5f7a56",
    accent: "#3f6a48",
  },
  candlelit: {
    dark: true,
    floor: "#2e2230",
    glow: "255,200,128",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 50%, rgba(8,2,6,.55))",
    veil: "linear-gradient(180deg, rgba(20,8,14,.24), rgba(12,4,8,.5))",
    label: "#fbefd8",
    labelSoft: "#e0b98a",
    accent: "#c8692a",
  },
};

/** The card's own inks: pencil-dark for the words, the faded red of its heading line, blue for the numbers. */
export const CARD = { ink: "#3a2418", soft: "#9a6a48", red: "#c8504a", blue: "#5f86b0" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  linen: { page: "#f6efe2", paper: "#fcf7ec", accent: "#c8692a" },
  farmhouse: { page: "#3a2216", paper: "#8a5a32", accent: "#c8561a" },
  check: { page: "#eef0e6", paper: "#3f6a48", accent: "#c8692a" },
  candlelit: { page: "#21140c", paper: "#4a2a3a", accent: "#e8b24a" },
};
