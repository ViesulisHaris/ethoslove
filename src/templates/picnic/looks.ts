import type { BlanketId } from "./schema";

/** A butterfly's wings: the colour by the body, the colour at the edge, and the veins. */
export type Wings = { inner: string; outer: string; vein: string; spot: string };

export type Look = {
  /** The cloth under the checks. */
  cloth: string;
  /** One stripe of the gingham, half see-through, so where two cross it is twice as deep. */
  band: string;
  /** The hem round the edge and its stitching. */
  hem: string;
  stitch: string;
  /** The small gingham on things: the jam jar's cover, the polaroid frames, the basket's lining. */
  check: string;
  /** Satin, for the cherries' bow and the parcel's ribbon. */
  satin: { light: string; mid: string; deep: string };
  /** The ticket's paper and ink. */
  ticket: { paper: string; ink: string };
  /** The tags' ink: the one colour every line is written in. */
  ink: string;
  /** A pale tint of the blanket, for every third tag. */
  blush: string;
  /** A CSS filter that turns the red gingham bow cut-out this look's colour. */
  tint?: string;
  butterflies: [Wings, Wings, Wings];
  petals: string[];
  confetti: string[];
  /** The words on the pill. */
  accent: string;
};

export const LOOKS: Record<BlanketId, Look> = {
  pink: {
    cloth: "#FFF7F8",
    band: "rgba(236,112,152,.32)",
    hem: "#EFA0B8",
    stitch: "rgba(255,255,255,.9)",
    check: "rgba(236,112,152,.42)",
    satin: { light: "#FFD6E2", mid: "#F291B2", deep: "#C04E77" },
    ticket: { paper: "#F7C4D3", ink: "#5A1F33" },
    ink: "#4A2331",
    blush: "#FCE6EC",
    tint: "hue-rotate(-18deg) saturate(.72) brightness(1.18)",
    butterflies: [
      { inner: "#FFE3EC", outer: "#F28DB0", vein: "#9C3F63", spot: "#FFFFFF" },
      { inner: "#FFF6E6", outer: "#F6C38B", vein: "#9A6431", spot: "#FFFFFF" },
      { inner: "#FFFFFF", outer: "#F7B6CB", vein: "#A0566F", spot: "#FFF1F5" },
    ],
    petals: ["#FFD1DF", "#FFFFFF", "#F7A8C0"],
    confetti: ["#F291B2", "#FFFFFF", "#FFD6E2", "#C04E77", "#FFE9B8"],
    accent: "#B8446C",
  },
  blue: {
    cloth: "#F6F9FF",
    band: "rgba(92,136,206,.32)",
    hem: "#9DB8E6",
    stitch: "rgba(255,255,255,.9)",
    check: "rgba(92,136,206,.42)",
    satin: { light: "#DDE9FB", mid: "#8FB1E2", deep: "#3E63A4" },
    ticket: { paper: "#C9DAF3", ink: "#1C2B4C" },
    ink: "#1F2B48",
    blush: "#E6EEFA",
    tint: "hue-rotate(215deg) saturate(.75)",
    butterflies: [
      { inner: "#EEF5FF", outer: "#86AEE6", vein: "#2F4F86", spot: "#FFFFFF" },
      { inner: "#FFFFFF", outer: "#F7B6CB", vein: "#A0566F", spot: "#FFF1F5" },
      { inner: "#FFFBEA", outer: "#F4D27A", vein: "#8C6A1E", spot: "#FFFFFF" },
    ],
    petals: ["#DCE9FB", "#FFFFFF", "#FFD1DF"],
    confetti: ["#8FB1E2", "#FFFFFF", "#DDE9FB", "#3E63A4", "#FFD1DF"],
    accent: "#3E63A4",
  },
  red: {
    cloth: "#FFFAF4",
    band: "rgba(206,48,62,.36)",
    hem: "#D9636D",
    stitch: "rgba(255,255,255,.9)",
    check: "rgba(206,48,62,.44)",
    satin: { light: "#FFD2D2", mid: "#E4606B", deep: "#9E1F2C" },
    ticket: { paper: "#F3D3B8", ink: "#4E1A12" },
    ink: "#43201A",
    blush: "#FBE4E1",
    butterflies: [
      { inner: "#FFFBEA", outer: "#F4D27A", vein: "#8C6A1E", spot: "#FFFFFF" },
      { inner: "#FFE3EC", outer: "#F28DB0", vein: "#9C3F63", spot: "#FFFFFF" },
      { inner: "#FFFFFF", outer: "#EFE6D6", vein: "#6E5B45", spot: "#FFFFFF" },
    ],
    petals: ["#FFFFFF", "#FFD1DF", "#FFE9E0"],
    confetti: ["#E4606B", "#FFFFFF", "#FFD2D2", "#9E1F2C", "#F4D27A"],
    accent: "#A52A36",
  },
  lilac: {
    cloth: "#FBF8FF",
    band: "rgba(158,122,214,.32)",
    hem: "#C3ADE9",
    stitch: "rgba(255,255,255,.9)",
    check: "rgba(158,122,214,.42)",
    satin: { light: "#EBDFFB", mid: "#BB9CE6", deep: "#6E4AA8" },
    ticket: { paper: "#DCCDF3", ink: "#2E1F4A" },
    ink: "#34254D",
    blush: "#EFE7FB",
    tint: "hue-rotate(262deg) saturate(.6) brightness(1.1)",
    butterflies: [
      { inner: "#F6EFFF", outer: "#B89BE8", vein: "#5B3F91", spot: "#FFFFFF" },
      { inner: "#FFE3EC", outer: "#F28DB0", vein: "#9C3F63", spot: "#FFFFFF" },
      { inner: "#FFFBEA", outer: "#F4D27A", vein: "#8C6A1E", spot: "#FFFFFF" },
    ],
    petals: ["#EBDFFB", "#FFFFFF", "#FFD1DF"],
    confetti: ["#BB9CE6", "#FFFFFF", "#EBDFFB", "#6E4AA8", "#FFD1DF"],
    accent: "#6E4AA8",
  },
};
