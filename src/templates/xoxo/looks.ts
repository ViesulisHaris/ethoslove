import { mulberry32 } from "../_shared/random";
import { ofKind, type ScrapId } from "../_shared/collage/scraps";

export type LookId = "cream" | "noir" | "blush";
export type Look = {
  wall: string;
  ink: string;
  soft: string;
  red: string;
  paper: string;
  paperInk: string;
  card: string;
  cardInk: string;
  envelope: { body: string; flap: string; lining: string };
  tiles: string[];
  confetti: string[];
  dark: boolean;
};

export const LOOKS: Record<LookId, Look> = {
  cream: {
    wall: "#F5EDE0",
    ink: "#2A1A1C",
    soft: "rgba(42,26,28,.6)",
    red: "#B3122A",
    paper: "#FFFDF8",
    paperInk: "#2A1A1C",
    card: "#E9E7E3",
    cardInk: "#1B1617",
    envelope: { body: "#F3E6D2", flap: "#EBDAC0", lining: "#B3122A" },
    tiles: ["#151112", "#FFFDF8", "#B3122A", "#E4DACB", "#FFFDF8", "#151112"],
    confetti: ["#B3122A", "#FFFFFF", "#E8909C", "#7E0C1D"],
    dark: false,
  },
  noir: {
    wall: "#151011",
    ink: "#F7EDE6",
    soft: "rgba(247,237,230,.62)",
    red: "#D4213D",
    paper: "#FFFDF8",
    paperInk: "#2A1A1C",
    card: "#241D1E",
    cardInk: "#F7EDE6",
    envelope: { body: "#2A2122", flap: "#332829", lining: "#D4213D" },
    tiles: ["#FFFDF8", "#D4213D", "#0B0809", "#E4DACB", "#FFFDF8", "#D4213D"],
    confetti: ["#D4213D", "#FFFFFF", "#7E0C1D", "#F7EDE6"],
    dark: true,
  },
  blush: {
    wall: "#F9DDE3",
    ink: "#4A1524",
    soft: "rgba(74,21,36,.6)",
    red: "#C2183A",
    paper: "#FFF9F6",
    paperInk: "#3A121D",
    card: "#FCEDF1",
    cardInk: "#3A121D",
    envelope: { body: "#FBE9EE", flap: "#F6D5DE", lining: "#C2183A" },
    tiles: ["#C2183A", "#FFF9F6", "#3A121D", "#F5B7C6", "#FFF9F6", "#C2183A"],
    confetti: ["#C2183A", "#FFFFFF", "#F5B7C6", "#7E0C1D"],
    dark: false,
  },
};

export type Mark = "marker" | "underline" | "box" | "heart";
export type Highlight = { start: number; length: number; mark: Mark };

const MARKS: Mark[] = ["heart", "underline", "marker", "box"];

/**
 * Which words of the card get marked up, the way someone goes at a lyric sheet with three pens:
 * a run of one to three words about every six, never two runs touching, never the same pen twice
 * in a row. The same words for the same two people, every time.
 */
export function highlightPlan(wordCount: number, seed: number): Highlight[] {
  const random = mulberry32(seed);
  const plan: Highlight[] = [];
  let i = 1 + Math.floor(random() * 3);
  let pen = Math.floor(random() * MARKS.length);
  while (i < wordCount && plan.length < 5) {
    const length = Math.min(1 + Math.floor(random() * 3), wordCount - i);
    plan.push({ start: i, length, mark: MARKS[pen % MARKS.length] });
    pen += 1;
    i += length + 3 + Math.floor(random() * 4);
  }
  return plan;
}

/** How many kisses they can leave before the oldest starts to fade off the page. */
export const MAX_KISSES = 16;
const KISSES: ScrapId[] = ofKind("kiss");

export type Kiss = { id: number; x: number; y: number; scrap: ScrapId; rotate: number; w: number };

/** The `n`th kiss they leave: which print, how big, which way it tilts. */
export function kissAt(n: number, x: number, y: number, seed: number): Kiss {
  const random = mulberry32(seed + n * 7919);
  return { id: n, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scrap: KISSES[Math.floor(random() * KISSES.length)], rotate: Math.round((random() - 0.5) * 70), w: 17 + Math.round(random() * 9) };
}

/** A new kiss joins the page; past the limit the oldest one goes. */
export const addKiss = (kisses: Kiss[], kiss: Kiss): Kiss[] => [...kisses, kiss].slice(-MAX_KISSES);
