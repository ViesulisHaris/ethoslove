import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "gingham" | "harvest" | "sage" | "candlelit";

export type Look = {
  /** The wall behind the table, top to bottom, and whether it is dark. */
  wall: [string, string];
  dark: boolean;
  /** The tablecloth: its colour and the check or weave printed on it. */
  cloth: string;
  check: string;
  /** The plate, its rim, and the bone. */
  plate: string;
  rim: string;
  bone: [string, string];
  /** Words on the wall, and the tags on the bone. */
  ink: string;
  tag: string;
  tagInk: string;
  /** Lights out of focus behind the table. */
  lights: string[];
  /** The card the wish comes on. */
  card: string;
  cardInk: string;
  cardSoft: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  gingham: {
    wall: ["#f6ead8", "#ecd9bd"],
    dark: false,
    cloth: "#fbf3e6",
    check: "rgba(196,48,42,.42)",
    plate: "#fffdf8",
    rim: "#d9cdb8",
    bone: ["#f3e6c8", "#a0784a"],
    ink: "#5a2a1a",
    tag: "#c4302a",
    tagInk: "#fff6ea",
    lights: ["#ffffff", "#ffe2b8", "#ffd0a0"],
    card: "#fffaf2",
    cardInk: "#3a1d12",
    cardSoft: "#a06a4a",
    accent: "#c4302a",
  },
  harvest: {
    wall: ["#3a2216", "#1d0f08"],
    dark: true,
    cloth: "#c8692a",
    check: "rgba(70,30,10,.35)",
    plate: "#fbf4e6",
    rim: "#d8c4a0",
    bone: ["#f3e6c8", "#a0784a"],
    ink: "#fbe8d0",
    tag: "#fbf1de",
    tagInk: "#7a3410",
    lights: ["#ffd27a", "#ffb36a", "#fff1c8", "#ff8a4a"],
    card: "#fbf2e2",
    cardInk: "#3a1d0c",
    cardSoft: "#a0683a",
    accent: "#c4561a",
  },
  sage: {
    wall: ["#eef0e6", "#dfe3d2"],
    dark: false,
    cloth: "#a9b994",
    check: "rgba(255,255,255,.28)",
    plate: "#fffdf6",
    rim: "#d4d6c4",
    bone: ["#f3e6c8", "#a0784a"],
    ink: "#3a4a30",
    tag: "#fffaf0",
    tagInk: "#4a5a38",
    lights: ["#ffffff", "#f3f6e6", "#ffe8c0"],
    card: "#fffcf4",
    cardInk: "#2a3420",
    cardSoft: "#6a7a58",
    accent: "#6a8450",
  },
  candlelit: {
    wall: ["#21140c", "#0c0603"],
    dark: true,
    cloth: "#5a2a1c",
    check: "rgba(255,200,140,.12)",
    plate: "#f4ead6",
    rim: "#c9b48c",
    bone: ["#f3e6c8", "#a0784a"],
    ink: "#ffe6c4",
    tag: "#e8b24a",
    tagInk: "#3a1d08",
    lights: ["#ffd27a", "#ffb36a", "#fff1c8", "#ffcf8a"],
    card: "#fbf0dc",
    cardInk: "#3a1d0c",
    cardSoft: "#a0703a",
    accent: "#b8641a",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  gingham: { page: LOOKS.gingham.wall[0], paper: LOOKS.gingham.cloth, accent: LOOKS.gingham.tag },
  harvest: { page: LOOKS.harvest.wall[0], paper: LOOKS.harvest.cloth, accent: LOOKS.harvest.accent },
  sage: { page: LOOKS.sage.wall[0], paper: LOOKS.sage.cloth, accent: LOOKS.sage.accent },
  candlelit: { page: LOOKS.candlelit.wall[0], paper: LOOKS.candlelit.cloth, accent: LOOKS.candlelit.tag },
};
