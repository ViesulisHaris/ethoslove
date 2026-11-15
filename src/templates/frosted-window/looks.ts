import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "cottage" | "cabin" | "midnight";

export type Look = {
  dark: boolean;
  /** The wall's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  glow: string;
  vignette: string;
  veil: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  cottage: {
    dark: false,
    floor: "#cdb896",
    glow: "255,214,150",
    vignette: "radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(30,16,6,.42))",
    veil: "linear-gradient(180deg, rgba(30,16,6,.3), rgba(20,10,4,.55))",
    accent: "#b3241e",
  },
  cabin: {
    dark: true,
    floor: "#4a2e18",
    glow: "255,200,128",
    vignette: "radial-gradient(120% 90% at 50% 40%, transparent 46%, rgba(10,4,0,.55))",
    veil: "linear-gradient(180deg, rgba(20,10,4,.3), rgba(12,6,2,.56))",
    accent: "#c8562a",
  },
  midnight: {
    dark: true,
    floor: "#1a2232",
    glow: "255,214,160",
    vignette: "radial-gradient(120% 90% at 50% 40%, transparent 46%, rgba(2,4,10,.6))",
    veil: "linear-gradient(180deg, rgba(4,8,18,.3), rgba(2,4,10,.56))",
    accent: "#e0b04a",
  },
};

export const INK = { ink: "#2a1a12", soft: "#8a6a50" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  cottage: { page: "#efe2cc", paper: "#fbf6ec", accent: "#b3241e" },
  cabin: { page: "#4a2e18", paper: "#8a5a34", accent: "#c8562a" },
  midnight: { page: "#1a2232", paper: "#2a3448", accent: "#e0b04a" },
};
