import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "gingham" | "harvest" | "sage" | "candlelit";

export type Look = {
  /** Whether the table is dark, which sets the hint on it in cream. */
  dark: boolean;
  /** The table's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** The colour of the lights' glow, as "r,g,b". */
  glow: string;
  /** A soft dark laid over the table's edges, and over all of it behind the letter. */
  vignette: string;
  veil: string;
  /** What is written on the cards: their ink, a quieter ink, and the colour of the hand. */
  ink: string;
  soft: string;
  accent: string;
};

const CARD_INK = { ink: "#3a1d12", soft: "#9a6a48" };

export const LOOKS: Record<LookId, Look> = {
  gingham: {
    dark: false,
    floor: "#eec9bd",
    glow: "255,214,150",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(90,30,20,.2))",
    veil: "linear-gradient(180deg, rgba(60,16,10,.3), rgba(46,12,8,.5))",
    ...CARD_INK,
    accent: "#c4302a",
  },
  harvest: {
    dark: true,
    floor: "#3a2214",
    glow: "255,206,132",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(10,4,0,.5))",
    veil: "linear-gradient(180deg, rgba(26,12,4,.26), rgba(16,8,2,.5))",
    ...CARD_INK,
    accent: "#c4561a",
  },
  sage: {
    dark: false,
    floor: "#a9b994",
    glow: "255,236,196",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(40,56,30,.2))",
    veil: "linear-gradient(180deg, rgba(30,44,24,.28), rgba(22,34,18,.46))",
    ink: "#2a3420",
    soft: "#6a7a58",
    accent: "#5f7a46",
  },
  candlelit: {
    dark: true,
    floor: "#3b1f2b",
    glow: "255,200,128",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 50%, rgba(8,2,6,.55))",
    veil: "linear-gradient(180deg, rgba(20,8,14,.24), rgba(12,4,8,.5))",
    ...CARD_INK,
    accent: "#b8452a",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  gingham: { page: "#f6ead8", paper: "#fbf3e6", accent: "#c4302a" },
  harvest: { page: "#3a2216", paper: "#c8692a", accent: "#c4561a" },
  sage: { page: "#eef0e6", paper: "#a9b994", accent: "#6a8450" },
  candlelit: { page: "#21140c", paper: "#5a2a3a", accent: "#e8b24a" },
};
