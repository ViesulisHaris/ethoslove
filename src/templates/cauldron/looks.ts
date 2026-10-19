import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "witch" | "love" | "midnight" | "gold";

export type Look = {
  /** The kitchen wall, top to bottom. */
  wall: [string, string];
  /** What the window shows. */
  night: [string, string];
  /** The fire: its outer flame and its heart. */
  fire: [string, string];
  /** The potion as it is at the start, and after each of the three ingredients. */
  liquid: [string, string, string, string];
  /** Light on the words written on the night. */
  ink: string;
  /** The paper the letter is on, and its ink. */
  paper: string;
  paperInk: string;
  paperSoft: string;
  paperEdge: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  witch: {
    wall: ["#12261f", "#050e0b"],
    night: ["#0b1633", "#27307a"],
    fire: ["#ff8a1f", "#fff0a8"],
    liquid: ["#46d65a", "#27d2b0", "#9a6bff", "#ff62b4"],
    ink: "#e6ffe9",
    paper: "#eee4c9",
    paperInk: "#1f2a1c",
    paperSoft: "#66795a",
    paperEdge: "rgba(70,100,60,.35)",
    accent: "#2f9e57",
  },
  love: {
    wall: ["#2a0e1c", "#0d0408"],
    night: ["#240a2c", "#6a2a6e"],
    fire: ["#ff6f3c", "#ffe3a0"],
    liquid: ["#a8123f", "#e0245e", "#ff5c93", "#ffb3d1"],
    ink: "#ffe8f0",
    paper: "#f3e3d6",
    paperInk: "#3a1422",
    paperSoft: "#9a5b70",
    paperEdge: "rgba(150,50,90,.32)",
    accent: "#c2185b",
  },
  midnight: {
    wall: ["#0e1430", "#040616"],
    night: ["#050a22", "#1c2f78"],
    fire: ["#ff9a3c", "#fff0b0"],
    liquid: ["#2a5bff", "#5a3fe0", "#a85cff", "#5ee6ff"],
    ink: "#e8efff",
    paper: "#e4e6f1",
    paperInk: "#141a36",
    paperSoft: "#5a6490",
    paperEdge: "rgba(60,70,140,.32)",
    accent: "#4a54d6",
  },
  gold: {
    wall: ["#2a1608", "#0d0603"],
    night: ["#1c0f2c", "#5a2a58"],
    fire: ["#ff7a1a", "#ffe9a0"],
    liquid: ["#e2851a", "#f2a61f", "#ff6a2a", "#ffd35e"],
    ink: "#fff0dc",
    paper: "#f1e2c2",
    paperInk: "#35200c",
    paperSoft: "#8a6638",
    paperEdge: "rgba(140,90,30,.35)",
    accent: "#c46a14",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  witch: { page: LOOKS.witch.wall[0], paper: LOOKS.witch.paper, accent: LOOKS.witch.liquid[0] },
  love: { page: LOOKS.love.wall[0], paper: LOOKS.love.paper, accent: LOOKS.love.liquid[1] },
  midnight: { page: LOOKS.midnight.wall[0], paper: LOOKS.midnight.paper, accent: LOOKS.midnight.liquid[1] },
  gold: { page: LOOKS.gold.wall[0], paper: LOOKS.gold.paper, accent: LOOKS.gold.liquid[1] },
};
