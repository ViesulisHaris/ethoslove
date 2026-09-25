/**
 * The four lacquers the box comes in, and the room each one is set in. The gold, the pearls, the
 * lace and the porcelain are the same in every look; the lacquer, its velvet and the wallpaper
 * change together, so the box always belongs on its vanity.
 */
export type FinishId = "blush" | "ivory" | "lilac" | "sage";

export type Finish = {
  /** The lacquer: its lit face, its sheen, the side in shadow and the deepest edge. */
  lacquer: string;
  sheen: string;
  shade: string;
  deep: string;
  /** Inside: crushed velvet, lit and in shadow. */
  velvet: string;
  velvetDeep: string;
  /** Wallpaper stripes and the ink the words on the wall are set in. */
  wall: [string, string];
  ink: string;
  soft: string;
  /** Painted flowers on the lid and the front. */
  posy: [string, string];
  /** Motes in the lamplight, and the paper thrown when the letter opens. */
  dust: string[];
  confetti: string[];
};

export const GOLD = { light: "#F6E3A8", mid: "#D9B25C", deep: "#9A7430", ink: "#6B4C18" };
export const PEARL = { light: "#FFFDF8", mid: "#F1E6D6", deep: "#C9B8A2" };
export const LACE = "#FFFBF3";

export const FINISHES: Record<FinishId, Finish> = {
  blush: {
    lacquer: "#F2C3CD",
    sheen: "#FCE4EA",
    shade: "#D697A6",
    deep: "#A9667A",
    velvet: "#A63D5C",
    velvetDeep: "#5E1A31",
    wall: ["#F8E3E6", "#F1D2D9"],
    ink: "#6E2E42",
    soft: "rgba(110,46,66,.62)",
    posy: ["#E27C98", "#F7C6D2"],
    dust: ["#FFFFFF", "#FFE3EA", "#F6D9A8"],
    confetti: ["#F2C3CD", "#FFFFFF", "#D9B25C", "#A63D5C"],
  },
  ivory: {
    lacquer: "#F3EADB",
    sheen: "#FFFBF2",
    shade: "#D5C6AC",
    deep: "#A8977A",
    velvet: "#C06C84",
    velvetDeep: "#74344A",
    wall: ["#F6EEE3", "#EEE2D1"],
    ink: "#5C4632",
    soft: "rgba(92,70,50,.62)",
    posy: ["#D98AA0", "#F3D2DA"],
    dust: ["#FFFFFF", "#FFF1D6", "#F3D9B0"],
    confetti: ["#F3EADB", "#FFFFFF", "#D9B25C", "#C06C84"],
  },
  lilac: {
    lacquer: "#D9C8EC",
    sheen: "#F0E8F9",
    shade: "#B5A0D3",
    deep: "#8672A8",
    velvet: "#5E3D86",
    velvetDeep: "#2F1A4C",
    wall: ["#F0E8F6", "#E6DBF0"],
    ink: "#4B3468",
    soft: "rgba(75,52,104,.62)",
    posy: ["#B58BD6", "#EBDDF6"],
    dust: ["#FFFFFF", "#F1E6FF", "#F4DDB0"],
    confetti: ["#D9C8EC", "#FFFFFF", "#D9B25C", "#5E3D86"],
  },
  sage: {
    lacquer: "#C9D8C2",
    sheen: "#E7F0E2",
    shade: "#A5BA9C",
    deep: "#768E6E",
    velvet: "#B1536B",
    velvetDeep: "#6A2539",
    wall: ["#EEF2E8", "#E2EADB"],
    ink: "#3F5238",
    soft: "rgba(63,82,56,.62)",
    posy: ["#D7839A", "#F4D3DB"],
    dust: ["#FFFFFF", "#F2F7E8", "#F4DDB0"],
    confetti: ["#C9D8C2", "#FFFFFF", "#D9B25C", "#B1536B"],
  },
};
