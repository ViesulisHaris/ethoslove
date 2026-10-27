import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "midnight" | "harvest" | "blood" | "frost";

export type Look = {
  /** The sky, top to bottom. */
  sky: [string, string, string];
  /** The moon: its lit face and its shaded edge; and the glow it throws. */
  moon: [string, string];
  glow: string;
  /** The bats, and a hair of light round them for where they cross the dark sky. */
  bat: string;
  rim: string;
  /** The hills and the tower in front of the sky. */
  ground: string;
  star: string;
  /** The words written on the night. */
  ink: string;
  /** The page's card: dark glass, its ink and its hairline. */
  card: string;
  cardInk: string;
  cardSoft: string;
  cardEdge: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  midnight: {
    sky: ["#0a0820", "#1b1448", "#3a2570"],
    moon: ["#fff6dc", "#d9c8a0"],
    glow: "#cdb9ff",
    bat: "#0b0716",
    rim: "rgba(205,185,255,.5)",
    ground: "#07050f",
    star: "#e9e2ff",
    ink: "#efe9ff",
    card: "rgba(14,10,34,.9)",
    cardInk: "#f3eeff",
    cardSoft: "#a99cd6",
    cardEdge: "rgba(205,185,255,.22)",
    accent: "#cdb9ff",
  },
  harvest: {
    sky: ["#16080f", "#3b1124", "#7a2a2a"],
    moon: ["#ffb347", "#e0701f"],
    glow: "#ff9a3c",
    bat: "#0d0508",
    rim: "rgba(255,170,90,.5)",
    ground: "#0a0406",
    star: "#ffd9a8",
    ink: "#ffe9d0",
    card: "rgba(28,10,14,.9)",
    cardInk: "#fff0e2",
    cardSoft: "#d9a07a",
    cardEdge: "rgba(255,170,90,.24)",
    accent: "#ffb066",
  },
  blood: {
    sky: ["#0c0306", "#2a0710", "#5e0f1c"],
    moon: ["#ff6b5e", "#b3182b"],
    glow: "#ff4a5c",
    bat: "#080204",
    rim: "rgba(255,110,120,.5)",
    ground: "#050102",
    star: "#ffc6c6",
    ink: "#ffe3e0",
    card: "rgba(26,6,10,.9)",
    cardInk: "#ffeceb",
    cardSoft: "#d98a90",
    cardEdge: "rgba(255,110,120,.24)",
    accent: "#ff7a86",
  },
  frost: {
    sky: ["#04121a", "#0b2e3c", "#1c5a6e"],
    moon: ["#f2fcff", "#a9d8e6"],
    glow: "#9fe6ff",
    bat: "#040c12",
    rim: "rgba(159,230,255,.5)",
    ground: "#030a0f",
    star: "#e0f8ff",
    ink: "#e8fbff",
    card: "rgba(6,22,30,.9)",
    cardInk: "#effcff",
    cardSoft: "#8fc4d4",
    cardEdge: "rgba(159,230,255,.24)",
    accent: "#8fe0ff",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  midnight: { page: LOOKS.midnight.sky[1], paper: LOOKS.midnight.moon[0], accent: LOOKS.midnight.glow },
  harvest: { page: LOOKS.harvest.sky[1], paper: LOOKS.harvest.moon[0], accent: LOOKS.harvest.glow },
  blood: { page: LOOKS.blood.sky[1], paper: LOOKS.blood.moon[0], accent: LOOKS.blood.glow },
  frost: { page: LOOKS.frost.sky[1], paper: LOOKS.frost.moon[0], accent: LOOKS.frost.glow },
};
