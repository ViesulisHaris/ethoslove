import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "red" | "navy" | "sage";

export type Look = {
  /** The night's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** A soft dark laid over all of it behind the letter. */
  veil: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  red: { floor: "#0a1024", veil: "linear-gradient(180deg, rgba(6,8,20,.34), rgba(4,6,14,.62))", accent: "#c21e1e" },
  navy: { floor: "#0a1024", veil: "linear-gradient(180deg, rgba(6,8,20,.34), rgba(4,6,14,.62))", accent: "#c8562a" },
  sage: { floor: "#0a1024", veil: "linear-gradient(180deg, rgba(6,8,20,.34), rgba(4,6,14,.62))", accent: "#b8452a" },
};

export const INK = { ink: "#2a1a12", soft: "#8a6a50", light: "#fff1cf" };

/** The bulbs' colours, in the order they repeat along the string: the Blender scene's BULB_COLORS. */
export const BULB_COLORS = ["#ff3b30", "#ffd23a", "#34c759", "#3a8dff", "#ff9a2a"];

export const SWATCHES: Record<LookId, LookSwatch> = {
  red: { page: "#0f1a3a", paper: "#8a2620", accent: "#ffd23a" },
  navy: { page: "#0f1a3a", paper: "#26384e", accent: "#ff3b30" },
  sage: { page: "#0f1a3a", paper: "#6a7a5c", accent: "#ffd23a" },
};
