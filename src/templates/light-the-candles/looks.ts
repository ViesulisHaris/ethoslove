import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "harvest" | "linen" | "plum";

export type Look = {
  /** The room's own dark, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** A soft dark laid over all of it behind the letter. */
  veil: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  harvest: { floor: "#0a0a12", veil: "linear-gradient(180deg, rgba(14,8,4,.34), rgba(8,4,2,.6))", accent: "#c8692a" },
  linen: { floor: "#0c0a0c", veil: "linear-gradient(180deg, rgba(14,10,6,.34), rgba(8,6,4,.6))", accent: "#b98a3a" },
  plum: { floor: "#0a060c", veil: "linear-gradient(180deg, rgba(16,6,12,.34), rgba(8,2,6,.6))", accent: "#b8452a" },
};

/** The paper's inks, and the colour of words written in candlelight. */
export const INK = { ink: "#3a1d12", soft: "#9a6a48", light: "#ffe2a8" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  harvest: { page: "#20332f", paper: "#a4472a", accent: "#ffcf7a" },
  linen: { page: "#4a3d33", paper: "#e6dcc6", accent: "#ffcf7a" },
  plum: { page: "#3a1f30", paper: "#6a1f2e", accent: "#ffcf7a" },
};
