import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "orange" | "white" | "purple" | "pink";

export type Look = {
  /** The pumpkin's skin: lit side, middle, shadow. */
  skin: [string, string, string];
  stem: [string, string];
  /** The light that comes through the cuts: the heart of the flame, the middle, the edge. */
  light: [string, string, string];
  /** The room: the wall, top to bottom, and the table. */
  wall: [string, string];
  table: [string, string];
  /** Words written on the night. */
  ink: string;
  /** The paper the letter is on. */
  paper: string;
  paperInk: string;
  paperSoft: string;
  paperEdge: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  orange: {
    skin: ["#ffa23a", "#e8741a", "#8f3a08"],
    stem: ["#7c8a3e", "#4a5420"],
    light: ["#fff4b8", "#ffc23d", "#ff7a14"],
    wall: ["#1d0e07", "#070302"],
    table: ["#4a2c16", "#1c0f06"],
    ink: "#ffe9c8",
    paper: "#efdfc0",
    paperInk: "#33200f",
    paperSoft: "#8a6638",
    paperEdge: "rgba(140,90,30,.34)",
    accent: "#c4601a",
  },
  white: {
    skin: ["#fbf6ea", "#e4dcc8", "#9d937d"],
    stem: ["#8f9a58", "#5a6430"],
    light: ["#fffbe0", "#ffe9a0", "#ffb84a"],
    wall: ["#0f1426", "#04060f"],
    table: ["#3a3a48", "#12121c"],
    ink: "#eef0ff",
    paper: "#e8e6ee",
    paperInk: "#1c2036",
    paperSoft: "#6a7096",
    paperEdge: "rgba(70,80,140,.32)",
    accent: "#4f5bb0",
  },
  purple: {
    skin: ["#a66bd8", "#7d3fb4", "#3f1a66"],
    stem: ["#7c8a3e", "#4a5420"],
    light: ["#fff0ff", "#ff9be6", "#a24dff"],
    wall: ["#150a24", "#05020c"],
    table: ["#3a2548", "#150b1f"],
    ink: "#f6e8ff",
    paper: "#ece0f2",
    paperInk: "#2a1540",
    paperSoft: "#7d5a9a",
    paperEdge: "rgba(120,70,170,.32)",
    accent: "#8a3fc4",
  },
  pink: {
    skin: ["#ffc2d4", "#f08aa8", "#a64a68"],
    stem: ["#8f9a58", "#5a6430"],
    light: ["#fff6f0", "#ffd0a0", "#ff7a8a"],
    wall: ["#26101a", "#0a0407"],
    table: ["#4a2a30", "#1c0e12"],
    ink: "#ffe6ee",
    paper: "#f3e2e2",
    paperInk: "#3a1a26",
    paperSoft: "#9a6070",
    paperEdge: "rgba(160,70,100,.32)",
    accent: "#c2456f",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  orange: { page: LOOKS.orange.skin[1], paper: LOOKS.orange.paper, accent: LOOKS.orange.light[1] },
  white: { page: LOOKS.white.skin[1], paper: LOOKS.white.paper, accent: LOOKS.white.light[1] },
  purple: { page: LOOKS.purple.skin[1], paper: LOOKS.purple.paper, accent: LOOKS.purple.light[2] },
  pink: { page: LOOKS.pink.skin[1], paper: LOOKS.pink.paper, accent: LOOKS.pink.light[2] },
};
