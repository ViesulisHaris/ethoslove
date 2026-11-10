import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "red" | "kraft" | "plaid" | "pink";

/** The wrapping papers and ribbons that were rendered (scripts/art/holiday/unwrapped.py). */
export type PaperId = "red-dots" | "green-stripes" | "kraft-stars" | "kraft-stripes" | "tartan-green" | "tartan-red" | "pink-stripes" | "blush-dots" | "gold";
export type RibbonId = "cream" | "red" | "blush" | "gold";
export type Wrapping = { paper: PaperId; ribbon: RibbonId };

export type Look = {
  /** Whether the floor is dark, which sets the words on it in cream. */
  dark: boolean;
  /** The floor's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** Words written on the floor. */
  ink: string;
  /** The presents take turns in these two wrappings; the last one is gold. */
  presents: [Wrapping, Wrapping];
  last: Wrapping;
  /** The colour of the fairy lights' glow, as "r,g,b". */
  glow: string;
  /** A soft dark (or light) laid over the table's edges, and over all of it behind the letter. */
  vignette: string;
  veil: string;
  /** The card inside each present, and the letter's paper. */
  card: string;
  cardInk: string;
  cardSoft: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  red: {
    dark: true,
    floor: "#2a180e",
    ink: "#fbf1e2",
    presents: [{ paper: "red-dots", ribbon: "cream" }, { paper: "green-stripes", ribbon: "red" }],
    last: { paper: "gold", ribbon: "red" },
    glow: "255,208,138",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(10,4,0,.55))",
    veil: "linear-gradient(180deg, rgba(24,12,6,.26), rgba(16,8,4,.5))",
    card: "#fbf5ea",
    cardInk: "#2a1a14",
    cardSoft: "#9a6a52",
    accent: "#a8232a",
  },
  kraft: {
    dark: false,
    floor: "#c39a6c",
    ink: "#3a2414",
    presents: [{ paper: "kraft-stars", ribbon: "red" }, { paper: "kraft-stripes", ribbon: "cream" }],
    last: { paper: "gold", ribbon: "red" },
    glow: "255,226,170",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 56%, rgba(70,40,14,.32))",
    veil: "linear-gradient(180deg, rgba(60,36,16,.2), rgba(50,28,12,.4))",
    card: "#fbf5ea",
    cardInk: "#2e1d10",
    cardSoft: "#9a744a",
    accent: "#a5402a",
  },
  plaid: {
    dark: true,
    floor: "#17301f",
    ink: "#f6efe0",
    presents: [{ paper: "tartan-red", ribbon: "cream" }, { paper: "tartan-green", ribbon: "gold" }],
    last: { paper: "gold", ribbon: "red" },
    glow: "255,208,138",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(0,8,2,.55))",
    veil: "linear-gradient(180deg, rgba(8,24,14,.26), rgba(4,16,8,.5))",
    card: "#fbf5ea",
    cardInk: "#1d2a1f",
    cardSoft: "#6a7a5a",
    accent: "#a8232a",
  },
  pink: {
    dark: false,
    floor: "#efc0cf",
    ink: "#7a2848",
    presents: [{ paper: "pink-stripes", ribbon: "cream" }, { paper: "blush-dots", ribbon: "blush" }],
    last: { paper: "gold", ribbon: "cream" },
    glow: "255,238,200",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(150,50,90,.2))",
    veil: "linear-gradient(180deg, rgba(110,40,68,.16), rgba(100,34,60,.32))",
    card: "#fffaf8",
    cardInk: "#4a1a2c",
    cardSoft: "#b0708a",
    accent: "#d8467b",
  },
};

const PAPER_SWATCH: Record<LookId, string> = { red: "#b8232b", kraft: "#b98d5e", plaid: "#244d34", pink: "#ef9ab3" };
const ACCENT_SWATCH: Record<LookId, string> = { red: "#f7ead2", kraft: "#a3151f", plaid: "#a8232a", pink: "#fdf1f4" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  red: { page: "#5d3a22", paper: PAPER_SWATCH.red, accent: ACCENT_SWATCH.red },
  kraft: { page: "#c9a57c", paper: PAPER_SWATCH.kraft, accent: ACCENT_SWATCH.kraft },
  plaid: { page: "#1d3b2a", paper: PAPER_SWATCH.plaid, accent: ACCENT_SWATCH.plaid },
  pink: { page: "#f3c9d6", paper: PAPER_SWATCH.pink, accent: ACCENT_SWATCH.pink },
};
