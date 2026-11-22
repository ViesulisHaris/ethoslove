import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "evergreen" | "nordic" | "midnight";

export type Look = {
  /** The room's own dark, for the instant before its picture arrives and past the picture's edges. */
  floor: string;
  /** A soft dark laid over the room while a note or the letter is read in front of it. */
  veil: string;
  /** The words over the wall: the title's colour and a quieter one. */
  label: string;
  labelSoft: string;
  /** The ink a name is signed in. */
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  evergreen: { floor: "#0b120f", veil: "linear-gradient(180deg, rgba(6,12,10,.62), rgba(4,8,6,.78))", label: "#fff6e6", labelSoft: "#e6d9bd", accent: "#a8281f" },
  nordic: { floor: "#12161b", veil: "linear-gradient(180deg, rgba(10,14,20,.62), rgba(6,9,14,.78))", label: "#fff8ec", labelSoft: "#dfd8c8", accent: "#b3302a" },
  midnight: { floor: "#0a0d17", veil: "linear-gradient(180deg, rgba(6,8,18,.62), rgba(4,5,12,.78))", label: "#fff3da", labelSoft: "#e3d2a8", accent: "#8a2230" },
};

/** The ink of the card a note is read on, and a quieter one for its small labels. */
export const INK = { ink: "#3a2416", soft: "#7c5b2b" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  evergreen: { page: "#16302b", paper: "#1f4a36", accent: "#a8281f" },
  nordic: { page: "#3b4a5a", paper: "#f1ece2", accent: "#b3302a" },
  midnight: { page: "#18213a", paper: "#22335e", accent: "#c9a04a" },
};
