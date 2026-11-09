import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "red" | "pink" | "blue" | "green";

export type Look = {
  /** The wall, top to bottom; whether it is dark; the stripe printed on it. */
  wall: [string, string];
  dark: boolean;
  stripe: string;
  /** The desk under the scroll. */
  desk: [string, string];
  /** The scroll's paper, its ink, its quieter ink and its ruled lines. */
  paper: string;
  ink: string;
  soft: string;
  rule: string;
  /** The rollers: lit, middle and shadow; and the ribbon that ties it. */
  roller: [string, string, string];
  ribbon: string;
  /** Words written on the wall. */
  label: string;
  fall: string[];
  /** The lights out of focus in the room behind. */
  lights: string[];
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  red: {
    wall: ["#6a161b", "#2c0709"],
    dark: true,
    stripe: "rgba(255,255,255,.035)",
    desk: ["#5a351d", "#2a170b"],
    paper: "#fbf1de",
    ink: "#3a1d12",
    soft: "#9a6a4a",
    rule: "rgba(170,60,40,.28)",
    roller: ["#c48a52", "#8a5a32", "#4a2c14"],
    ribbon: "#d8342c",
    label: "#fff0e2",
    fall: ["#ffffff", "#ffe8d6"],
    lights: ["#ffd27a", "#ffb36a", "#fff1c8", "#ff8a6a"],
    accent: "#b0241d",
  },
  pink: {
    wall: ["#f9dbe5", "#f1bccc"],
    dark: false,
    stripe: "rgba(255,255,255,.35)",
    desk: ["#f4c3d2", "#e6a2b7"],
    paper: "#fffaf5",
    ink: "#4a1a2c",
    soft: "#b0708a",
    rule: "rgba(214,70,123,.25)",
    roller: ["#ffd3e1", "#ee9ab5", "#b8577a"],
    ribbon: "#d8467b",
    label: "#8a2a4f",
    fall: ["#ffffff", "#f7a8c0"],
    lights: ["#ffffff", "#ffc2d4", "#ffe2a8"],
    accent: "#d8467b",
  },
  blue: {
    wall: ["#16284a", "#070f21"],
    dark: true,
    stripe: "rgba(200,220,255,.04)",
    desk: ["#2a3a5a", "#121c30"],
    paper: "#f6f8fc",
    ink: "#1c2840",
    soft: "#6a7a9c",
    rule: "rgba(70,100,170,.25)",
    roller: ["#eef3fb", "#b9c6dc", "#6f7f9c"],
    ribbon: "#6f9ee0",
    label: "#eaf1ff",
    fall: ["#ffffff", "#d8e6ff"],
    lights: ["#cfe0ff", "#ffffff", "#ffd9a0", "#a8c4ff"],
    accent: "#3d6fc2",
  },
  green: {
    wall: ["#173a26", "#08180f"],
    dark: true,
    stripe: "rgba(255,255,255,.03)",
    desk: ["#5a351d", "#2a170b"],
    paper: "#fbf1de",
    ink: "#1d2e1f",
    soft: "#6a7a5a",
    rule: "rgba(40,110,60,.28)",
    roller: ["#c48a52", "#8a5a32", "#4a2c14"],
    ribbon: "#d8342c",
    label: "#f3ecdb",
    fall: ["#ffffff", "#f3ecdb"],
    lights: ["#ffd27a", "#fff1c8", "#ffb36a"],
    accent: "#2c6a4c",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  red: { page: LOOKS.red.wall[0], paper: LOOKS.red.paper, accent: LOOKS.red.ribbon },
  pink: { page: LOOKS.pink.wall[0], paper: LOOKS.pink.paper, accent: LOOKS.pink.ribbon },
  blue: { page: LOOKS.blue.wall[0], paper: LOOKS.blue.paper, accent: LOOKS.blue.ribbon },
  green: { page: LOOKS.green.wall[0], paper: LOOKS.green.paper, accent: LOOKS.green.ribbon },
};
