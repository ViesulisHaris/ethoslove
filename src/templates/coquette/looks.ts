import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "blush" | "blue";
/** Where a flower goes on the page; each look puts its own flower there. */
export type Slot = "spray" | "small" | "gold" | "lily" | "hibiscus" | "plumeria" | "soft" | "star" | "pale" | "coral";

export type Look = {
  wall: string;
  check: string;
  scriptPaper: string;
  scriptInk: string;
  paper: string;
  ink: string;
  frame: string;
  frameCheck: string;
  satin: { light: string; mid: string; deep: string };
  card: { card: string; ink: string; soft: string; bar: string };
  tape: string;
  /** A CSS filter that turns the red and pink trinkets (the gingham bow, the doily) this look's colour. */
  tint?: string;
  flowers: Record<Slot, ScrapId>;
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  blush: {
    wall: "#FCE3EA",
    check: "rgba(240,130,165,.30)",
    scriptPaper: "#EBA9BE",
    scriptInk: "rgba(124,40,70,.55)",
    paper: "#FFF9F4",
    ink: "#4A2230",
    frame: "#FFFFFF",
    frameCheck: "rgba(238,120,158,.42)",
    satin: { light: "#FFD3E0", mid: "#F08FB0", deep: "#B9486F" },
    card: { card: "#FBD0DD", ink: "#3A1524", soft: "#9C5A72", bar: "#C4577E" },
    tape: "#F5A9C0",
    flowers: { spray: "columbine", small: "sakura", gold: "blossom-gold", lily: "lily-pink", hibiscus: "hibiscus-pink", plumeria: "plumeria-pink", soft: "lily-blush", star: "lily-stargazer", pale: "blossom-pale", coral: "hibiscus-coral" },
    ambience: [{ kind: "petals", colors: ["#FFD1DF", "#FFFFFF", "#F7A8C0"], count: 12 }],
    confetti: ["#F08FB0", "#FFFFFF", "#FFD3E0", "#C4577E"],
  },
  blue: {
    wall: "#E6EEF8",
    check: "rgba(110,150,205,.28)",
    scriptPaper: "#9FB6D6",
    scriptInk: "rgba(28,48,92,.55)",
    paper: "#FBFCFF",
    ink: "#1E2B4A",
    frame: "#FFFFFF",
    frameCheck: "rgba(100,140,200,.42)",
    satin: { light: "#DCE9FB", mid: "#8FB0E0", deep: "#3F64A6" },
    card: { card: "#D5E2F5", ink: "#16213D", soft: "#56698F", bar: "#3F64A6" },
    tape: "#A9C2E8",
    tint: "hue-rotate(215deg) saturate(.75)",
    flowers: { spray: "blue-spray", small: "blue-pansy", gold: "blue-poppy", lily: "blue-lily", hibiscus: "blue-rose", plumeria: "blue-clematis", soft: "blue-hibiscus", star: "blue-cluster", pale: "blue-velvet", coral: "blue-gerbera" },
    ambience: [{ kind: "petals", colors: ["#DCE9FB", "#FFFFFF", "#9FB6D6"], count: 12 }],
    confetti: ["#8FB0E0", "#FFFFFF", "#DCE9FB", "#3F64A6"],
  },
};

/** Which photos go where: the first is the hero, the next three fill the strip, the rest scatter. */
export function arrangePhotos<T>(photos: T[]): { hero: T | undefined; strip: T[]; scatter: T[] } {
  return { hero: photos[0], strip: photos.slice(1, 4), scatter: photos.slice(4, 10) };
}

/** How tall a gingham strip of `n` photos stands. */
export const stripHeight = (n: number): number => (n === 0 ? 0 : 2.4 + n * 40.7 + 6);
