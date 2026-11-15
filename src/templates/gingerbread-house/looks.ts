import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "cosy" | "midnight" | "berry";

export type Look = {
  /** Whether the wall behind the house is dark, which sets the words written over it in cream. */
  dark: boolean;
  /** The kitchen's own colour, for the instant before its picture arrives and past its edges. */
  floor: string;
  /** A soft dark laid over all of it behind the letter. */
  veil: string;
  /** The words over the wall: the title's colour and a quieter one. */
  label: string;
  labelSoft: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  cosy: { dark: false, floor: "#c9b596", veil: "linear-gradient(180deg, rgba(40,24,10,.36), rgba(26,14,6,.6))", label: "#5a2e14", labelSoft: "#8a5a3a", accent: "#c4202a" },
  midnight: { dark: true, floor: "#141d2e", veil: "linear-gradient(180deg, rgba(6,10,20,.34), rgba(4,6,14,.6))", label: "#fff1cf", labelSoft: "#e0c9a0", accent: "#e0902a" },
  berry: { dark: false, floor: "#cdbba0", veil: "linear-gradient(180deg, rgba(44,20,12,.36), rgba(28,12,6,.6))", label: "#6a1f1a", labelSoft: "#9a5a48", accent: "#c4302a" },
};

export const INK = { ink: "#3a1d12", soft: "#9a6a48" };

export const SWATCHES: Record<LookId, LookSwatch> = {
  cosy: { page: "#efe6d6", paper: "#b8885a", accent: "#c4202a" },
  midnight: { page: "#27364e", paper: "#96592e", accent: "#ffc878" },
  berry: { page: "#f1e8dc", paper: "#c4302a", accent: "#2f8a4a" },
};
