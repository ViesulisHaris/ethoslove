import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "deck" | "porch" | "stone" | "evening";

export type Look = {
  dark: boolean;
  /** The ground's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** The colour of the lights' glow, as "r,g,b". */
  glow: string;
  vignette: string;
  veil: string;
  /** Words written straight on the ground, above the card. */
  label: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  deck: {
    dark: false,
    floor: "#7a644e",
    glow: "255,214,150",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 55%, rgba(30,18,8,.32))",
    veil: "linear-gradient(180deg, rgba(40,24,12,.3), rgba(28,16,8,.52))",
    label: "#fff3e0",
    accent: "#c8561a",
  },
  porch: {
    dark: false,
    floor: "#d9e0de",
    glow: "255,224,170",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 58%, rgba(40,50,50,.22))",
    veil: "linear-gradient(180deg, rgba(30,40,40,.3), rgba(20,28,28,.5))",
    label: "#3a3020",
    accent: "#c8561a",
  },
  stone: {
    dark: false,
    floor: "#8a877e",
    glow: "255,214,150",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 55%, rgba(20,20,16,.3))",
    veil: "linear-gradient(180deg, rgba(24,24,20,.3), rgba(16,16,12,.52))",
    label: "#fff6e8",
    accent: "#b8452a",
  },
  evening: {
    dark: true,
    floor: "#3a2a1e",
    glow: "255,200,128",
    vignette: "radial-gradient(125% 95% at 50% 46%, transparent 48%, rgba(8,4,0,.55))",
    veil: "linear-gradient(180deg, rgba(20,10,4,.26), rgba(12,6,2,.52))",
    label: "#fbefd8",
    accent: "#e0902a",
  },
};

/** What is written on the card: its ink, a quieter ink. */
export const INK = { ink: "#3a2412", soft: "#9a6a48" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  deck: { page: "#5e4a3a", paper: "#9a8068", accent: "#c8561a" },
  porch: { page: "#eef2f0", paper: "#d9e0de", accent: "#c8561a" },
  stone: { page: "#6a675f", paper: "#9a978e", accent: "#b8452a" },
  evening: { page: "#21140c", paper: "#5a4434", accent: "#e8b24a" },
};
