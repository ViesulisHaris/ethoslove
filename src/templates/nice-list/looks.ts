import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "red" | "pink" | "blue" | "green";
export type RibbonId = "red" | "pink" | "blue";

export type Look = {
  /** Whether the desk is dark, which sets the words on it in cream. */
  dark: boolean;
  /** The desk's own colour, for the instant before its picture arrives and past its edges. */
  desk: string;
  /** Words written on the desk. */
  label: string;
  /** The ribbon the scroll is tied with (one of the colours that were rendered). */
  ribbon: RibbonId;
  /** The colour of the fairy lights' glow, as "r,g,b". */
  glow: string;
  /** A soft dark (or light) laid over the desk's edges, and over all of it behind the letter. */
  vignette: string;
  veil: string;
  /** What is written on the parchment: its ink, a quieter ink, its ruled lines, and the colour of the hand. */
  ink: string;
  soft: string;
  rule: string;
  accent: string;
  /** The letter's own paper. */
  paper: string;
};

const PARCHMENT_INK = { ink: "#3a2414", soft: "#8a6a48", rule: "rgba(120,78,36,.34)", paper: "#fbf3e2" };

export const LOOKS: Record<LookId, Look> = {
  red: {
    dark: true,
    desk: "#2a180e",
    label: "#fbf1e2",
    ribbon: "red",
    glow: "255,208,138",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(10,4,0,.55))",
    veil: "linear-gradient(180deg, rgba(26,7,6,.26), rgba(16,5,4,.5))",
    ...PARCHMENT_INK,
    accent: "#a3151f",
  },
  pink: {
    dark: false,
    desk: "#d6bda2",
    label: "#6e2440",
    ribbon: "pink",
    glow: "255,238,200",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(120,60,50,.22))",
    veil: "linear-gradient(180deg, rgba(96,34,58,.18), rgba(84,28,50,.34))",
    ...PARCHMENT_INK,
    accent: "#c2416f",
  },
  blue: {
    dark: true,
    desk: "#647896",
    label: "#f4f8ff",
    ribbon: "blue",
    glow: "236,244,255",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 54%, rgba(8,16,36,.5))",
    veil: "linear-gradient(180deg, rgba(12,20,42,.26), rgba(8,14,32,.5))",
    ...PARCHMENT_INK,
    accent: "#2f5fae",
  },
  green: {
    dark: true,
    desk: "#2a180e",
    label: "#f6efe0",
    ribbon: "red",
    glow: "255,208,138",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 52%, rgba(4,8,2,.55))",
    veil: "linear-gradient(180deg, rgba(8,22,12,.26), rgba(4,14,8,.5))",
    ...PARCHMENT_INK,
    accent: "#1f6a44",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  red: { page: "#6e1620", paper: "#f3e2bf", accent: "#a3151f" },
  pink: { page: "#eeb4c4", paper: "#f3e2bf", accent: "#e8789c" },
  blue: { page: "#1b2c4d", paper: "#f3e2bf", accent: "#7fa6e0" },
  green: { page: "#17472f", paper: "#f3e2bf", accent: "#a3151f" },
};
