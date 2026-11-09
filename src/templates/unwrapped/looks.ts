import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "red" | "kraft" | "plaid" | "pink";

/** A wrapping paper: its colour, the print on it, and the ribbon that goes round it. */
export type Paper = { base: string; ink: string; print: "dots" | "stripes" | "tartan" | "stars"; ribbon: string; satin: string };

/** Ribbon colours: a deep red, a warm ivory, a blush pink. */
const RIBBON = { red: "#a8202a", ivory: "#efe4d6", blush: "#f0bccb" } as const;

export type Look = {
  /** The room, top to bottom, and whether it is dark. */
  wall: [string, string];
  dark: boolean;
  /** The two papers the presents alternate between. */
  papers: [Paper, Paper];
  /** The lights in the room behind, and the floor the presents stand on. */
  lights: string[];
  floor: [string, string];
  /** Words on the wall. */
  ink: string;
  /** The card inside each present, and its words. */
  card: string;
  cardInk: string;
  cardSoft: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  red: {
    wall: ["#1c2944", "#0a1120"],
    dark: true,
    papers: [
      { base: "#b8262b", ink: "rgba(255,248,240,.92)", print: "dots", ribbon: RIBBON.ivory, satin: "#ffffff" },
      { base: "#24573f", ink: "rgba(255,255,255,.16)", print: "stripes", ribbon: RIBBON.red, satin: "#ff8a8a" },
    ],
    lights: ["#ffd27a", "#ff9a6a", "#fff1c8", "#ffc46a"],
    floor: ["#4a2e1e", "#1e120a"],
    ink: "#fbf1e4",
    card: "#fbf4e6",
    cardInk: "#2a1a14",
    cardSoft: "#9a6a52",
    accent: "#c62f2a",
  },
  kraft: {
    wall: ["#2a1c13", "#110a06"],
    dark: true,
    papers: [
      { base: "#b98d5e", ink: "rgba(255,250,240,.8)", print: "stars", ribbon: RIBBON.red, satin: "#ff8a8a" },
      { base: "#9c6e43", ink: "rgba(255,240,220,.2)", print: "stripes", ribbon: RIBBON.ivory, satin: "#ffffff" },
    ],
    lights: ["#ffd27a", "#ffe9b0", "#ffb36a", "#ffdca0"],
    floor: ["#3a2618", "#160c06"],
    ink: "#fbefe0",
    card: "#fbf4e6",
    cardInk: "#2e1d10",
    cardSoft: "#9a744a",
    accent: "#a5502a",
  },
  plaid: {
    wall: ["#18261b", "#08110a"],
    dark: true,
    papers: [
      { base: "#244d34", ink: "rgba(200,36,44,.55)", print: "tartan", ribbon: RIBBON.red, satin: "#ff8a8a" },
      { base: "#a8232a", ink: "rgba(20,56,34,.5)", print: "tartan", ribbon: RIBBON.ivory, satin: "#ffffff" },
    ],
    lights: ["#ffd27a", "#ff8a6a", "#fff1c8", "#ffc46a"],
    floor: ["#3a2a1c", "#140c06"],
    ink: "#f6efe0",
    card: "#fbf4e6",
    cardInk: "#1d2a1f",
    cardSoft: "#6a7a5a",
    accent: "#b8262b",
  },
  pink: {
    wall: ["#fde7ee", "#f5c9d7"],
    dark: false,
    papers: [
      { base: "#ef9ab3", ink: "rgba(255,255,255,.6)", print: "stripes", ribbon: RIBBON.ivory, satin: "#ffffff" },
      { base: "#fdf1f4", ink: "rgba(232,120,156,.7)", print: "dots", ribbon: RIBBON.blush, satin: "#ffffff" },
    ],
    lights: ["#ffffff", "#ffc2d4", "#ffe2a8", "#ffd6e2"],
    floor: ["#f3d2dc", "#e8b4c4"],
    ink: "#8a2a4f",
    card: "#fffaf8",
    cardInk: "#4a1a2c",
    cardSoft: "#b0708a",
    accent: "#d8467b",
  },
};

/** The last present, the same in every look: gold foil, so it reads as the big one. */
export const GOLD: Paper = { base: "#c9a046", ink: "rgba(255,248,220,.55)", print: "stars", ribbon: RIBBON.red, satin: "#ff8a8a" };

/** The print, as a CSS background in the gift's own units. */
export function printOf(p: Paper): string {
  const k = (n: number) => `calc(${n}*var(--k))`;
  if (p.print === "dots") return `radial-gradient(circle, ${p.ink} 0 ${k(1)}, transparent ${k(1.15)}) 0 0 / ${k(7)} ${k(7)}, radial-gradient(circle, ${p.ink} 0 ${k(1)}, transparent ${k(1.15)}) ${k(3.5)} ${k(3.5)} / ${k(7)} ${k(7)}, ${p.base}`;
  if (p.print === "stripes") return `repeating-linear-gradient(45deg, ${p.ink} 0 ${k(1.6)}, transparent ${k(1.6)} ${k(4.8)}), ${p.base}`;
  if (p.print === "stars") return `radial-gradient(circle, ${p.ink} 0 ${k(0.6)}, transparent ${k(0.75)}) 0 0 / ${k(5)} ${k(5)}, radial-gradient(circle, ${p.ink} 0 ${k(1.1)}, transparent ${k(1.25)}) ${k(2.5)} ${k(2.5)} / ${k(10)} ${k(10)}, linear-gradient(135deg, rgba(255,255,255,.25), transparent 40%, rgba(255,255,255,.18) 60%, transparent), ${p.base}`;
  return `repeating-linear-gradient(0deg, ${p.ink} 0 ${k(1.3)}, transparent ${k(1.3)} ${k(6.5)}), repeating-linear-gradient(90deg, ${p.ink} 0 ${k(1.3)}, transparent ${k(1.3)} ${k(6.5)}), repeating-linear-gradient(0deg, rgba(255,255,255,.14) 0 ${k(0.4)}, transparent ${k(0.4)} ${k(3.25)}), repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 ${k(0.4)}, transparent ${k(0.4)} ${k(3.25)}), ${p.base}`;
}

export const SWATCHES: Record<LookId, LookSwatch> = {
  red: { page: LOOKS.red.wall[0], paper: LOOKS.red.papers[0].base, accent: LOOKS.red.papers[0].ribbon },
  kraft: { page: LOOKS.kraft.wall[0], paper: LOOKS.kraft.papers[0].base, accent: LOOKS.kraft.papers[0].ribbon },
  plaid: { page: LOOKS.plaid.wall[0], paper: LOOKS.plaid.papers[0].base, accent: LOOKS.plaid.papers[0].ribbon },
  pink: { page: LOOKS.pink.wall[0], paper: LOOKS.pink.papers[0].base, accent: LOOKS.pink.papers[1].ribbon },
};
