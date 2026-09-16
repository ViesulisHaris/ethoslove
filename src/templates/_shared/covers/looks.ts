import type { CoverId } from "@/lib/gift/schema";
import type { StickerId } from "./stickers";

export type EnvelopeColors = { body: string; flap: string; inner: string; seal: string; mark: "heart" | "star"; letter: string };
export type GiftBoxColors = { body: string; lid: string; ribbon: string };

/** A sticker on the page: centre position in % of the frame, width in % of the frame width. */
export type Placement = { id: StickerId; x: number; y: number; size: number; rotate: number; color?: string };
/** A strip of washi tape, same coordinates. */
export type Tape = { x: number; y: number; width: number; rotate: number; color: string };

export type CoverLook = {
  id: Exclude<CoverId, "classic">;
  /** Light pages lift the name with a white edge; dark pages sink it into a soft shadow. */
  tone: "light" | "dark";
  background: string;
  /** The "For {name}" line. */
  script: string;
  /** The tap hint under it. */
  hint: string;
  piece: { kind: "envelope"; colors: EnvelopeColors } | { kind: "gift"; colors: GiftBoxColors };
  stickers: Placement[];
  tapes?: Tape[];
};

/** Gingham from two half-tinted stripe layers; the overlap gives the darker squares. */
const gingham = (tint: string, ground: string, cell = "calc(12*var(--u))") =>
  `linear-gradient(90deg, ${tint} 50%, transparent 0) 0 0/${cell} ${cell}, linear-gradient(${tint} 50%, transparent 0) 0 0/${cell} ${cell}, ${ground}`;

export const COVER_LOOKS: Record<CoverLook["id"], CoverLook> = {
  gingham: {
    id: "gingham",
    tone: "light",
    background: gingham("rgba(246,166,184,.36)", "#fff5f6"),
    script: "#c2185b",
    hint: "#b45b73",
    piece: { kind: "envelope", colors: { body: "#f7a9bd", flap: "#fbc4d2", inner: "#ee8aa6", seal: "#c2185b", mark: "heart", letter: "#fffaf7" } },
    stickers: [
      { id: "bouquet", x: 20, y: 19, size: 30, rotate: -8 },
      { id: "star", x: 70, y: 12, size: 15, rotate: 12 },
      { id: "moon", x: 87, y: 9, size: 13, rotate: 0 },
      { id: "planet", x: 80, y: 21, size: 21, rotate: -6 },
      { id: "squiggle", x: 7, y: 45, size: 12, rotate: 0, color: "#e27d98" },
      { id: "sparkle", x: 92, y: 50, size: 8, rotate: 0 },
      { id: "balloons", x: 17, y: 77, size: 28, rotate: -4 },
      { id: "bow", x: 80, y: 75, size: 25, rotate: 9 },
    ],
    tapes: [{ x: 21, y: 8, width: 32, rotate: -9, color: "rgba(255,255,255,.62)" }],
  },
  picnic: {
    id: "picnic",
    tone: "light",
    background: gingham("rgba(214,58,70,.26)", "#fff9f2"),
    script: "#b8232f",
    hint: "#a4474f",
    piece: { kind: "envelope", colors: { body: "#fffaf1", flap: "#fff1df", inner: "#f0d4bd", seal: "#c62d3a", mark: "heart", letter: "#ffffff" } },
    stickers: [
      { id: "cherries", x: 18, y: 16, size: 24, rotate: -10 },
      { id: "strawberry", x: 82, y: 15, size: 20, rotate: 12 },
      { id: "sparkle", x: 66, y: 7, size: 8, rotate: 0 },
      { id: "daisy", x: 11, y: 56, size: 15, rotate: 0 },
      { id: "daisy", x: 87, y: 60, size: 20, rotate: 20 },
      { id: "heart", x: 21, y: 79, size: 16, rotate: -12 },
      { id: "butterfly", x: 78, y: 80, size: 23, rotate: -8 },
    ],
    tapes: [{ x: 82, y: 6, width: 26, rotate: 8, color: "rgba(255,255,255,.7)" }],
  },
  starry: {
    id: "starry",
    tone: "dark",
    background:
      "radial-gradient(rgba(255,255,255,.85) calc(.32*var(--u)), transparent calc(.45*var(--u))) 0 0/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(rgba(255,255,255,.5) calc(.22*var(--u)), transparent calc(.34*var(--u))) calc(6*var(--u)) calc(7*var(--u))/calc(17*var(--u)) calc(17*var(--u)), radial-gradient(120% 90% at 50% 18%, #33387a, #181a45 58%, #0c0c26)",
    script: "#fff3cf",
    hint: "rgba(255,243,207,.75)",
    piece: { kind: "envelope", colors: { body: "#d6c9f6", flap: "#e4dafb", inner: "#b7a3ea", seal: "#6a4bc4", mark: "star", letter: "#fffdf6" } },
    stickers: [
      { id: "moon", x: 80, y: 14, size: 22, rotate: 0 },
      { id: "star", x: 17, y: 13, size: 14, rotate: -10 },
      { id: "star", x: 34, y: 18, size: 8, rotate: 14 },
      { id: "sparkle", x: 89, y: 46, size: 9, rotate: 0 },
      { id: "sparkle", x: 9, y: 49, size: 7, rotate: 0 },
      { id: "planet", x: 21, y: 76, size: 27, rotate: -8 },
      { id: "cloud", x: 79, y: 79, size: 27, rotate: 0 },
    ],
  },
  polka: {
    id: "polka",
    tone: "light",
    background:
      "radial-gradient(#f7aec2 calc(1.5*var(--u)), transparent calc(1.65*var(--u))) 0 0/calc(10*var(--u)) calc(10*var(--u)), radial-gradient(#f7aec2 calc(1.5*var(--u)), transparent calc(1.65*var(--u))) calc(5*var(--u)) calc(5*var(--u))/calc(10*var(--u)) calc(10*var(--u)), #fff7ef",
    script: "#d6336c",
    hint: "#b8567a",
    piece: { kind: "gift", colors: { body: "#fffaf3", lid: "#fff2e4", ribbon: "#e84c6b" } },
    stickers: [
      { id: "heart", x: 18, y: 14, size: 16, rotate: -10 },
      { id: "balloons", x: 82, y: 19, size: 27, rotate: 8 },
      { id: "sparkle", x: 11, y: 41, size: 8, rotate: 0 },
      { id: "strawberry", x: 16, y: 78, size: 18, rotate: -6 },
      { id: "heart", x: 86, y: 70, size: 11, rotate: 14 },
      { id: "cherries", x: 78, y: 84, size: 18, rotate: 6 },
    ],
    tapes: [{ x: 18, y: 5, width: 26, rotate: -6, color: "rgba(255,255,255,.7)" }],
  },
  garden: {
    id: "garden",
    tone: "light",
    background: gingham("rgba(137,170,122,.26)", "#f8f6ea"),
    script: "#55733a",
    hint: "#6d7f5a",
    piece: { kind: "envelope", colors: { body: "#dcbb92", flap: "#e6caa5", inner: "#c59c6d", seal: "#7c8f4c", mark: "heart", letter: "#fffdf6" } },
    stickers: [
      { id: "tulip", x: 14, y: 18, size: 18, rotate: -12 },
      { id: "bouquet", x: 82, y: 18, size: 28, rotate: 10 },
      { id: "sparkle", x: 44, y: 7, size: 7, rotate: 0 },
      { id: "butterfly", x: 21, y: 74, size: 22, rotate: -10 },
      { id: "daisy", x: 84, y: 70, size: 18, rotate: 0 },
      { id: "daisy", x: 73, y: 83, size: 12, rotate: 30 },
    ],
    tapes: [{ x: 82, y: 7, width: 28, rotate: 10, color: "rgba(255,255,255,.6)" }],
  },
  lovecore: {
    id: "lovecore",
    tone: "dark",
    background: "repeating-linear-gradient(45deg, #b3122e 0 calc(4.5*var(--u)), #c41f3a calc(4.5*var(--u)) calc(9*var(--u)))",
    script: "#fff5ee",
    hint: "rgba(255,245,238,.8)",
    piece: { kind: "envelope", colors: { body: "#fff6ee", flap: "#fdeadf", inner: "#f0cdb7", seal: "#b8860b", mark: "heart", letter: "#ffffff" } },
    stickers: [
      { id: "heart", x: 20, y: 14, size: 18, rotate: -12 },
      { id: "kiss", x: 78, y: 16, size: 24, rotate: 10 },
      { id: "sparkle", x: 90, y: 47, size: 9, rotate: 0 },
      { id: "heart", x: 87, y: 62, size: 11, rotate: 14 },
      { id: "balloons", x: 17, y: 77, size: 26, rotate: -6 },
      { id: "bow", x: 81, y: 81, size: 21, rotate: 8 },
    ],
  },
  harvest: {
    id: "harvest",
    tone: "light",
    background: gingham("rgba(196,120,52,.28)", "#fbf3e3"),
    script: "#8a3b12",
    hint: "#9a6a44",
    piece: { kind: "envelope", colors: { body: "#e7c49c", flap: "#f0d6b6", inner: "#cfa273", seal: "#b8471f", mark: "heart", letter: "#fffaf2" } },
    stickers: [
      { id: "leaf", x: 17, y: 16, size: 20, rotate: -22 },
      { id: "pumpkin", x: 82, y: 17, size: 25, rotate: 8 },
      { id: "sparkle", x: 50, y: 8, size: 7, rotate: 0 },
      { id: "acorn", x: 9, y: 50, size: 12, rotate: 14 },
      { id: "leaf", x: 91, y: 48, size: 13, rotate: 38 },
      { id: "mug", x: 19, y: 79, size: 22, rotate: -6 },
      { id: "leaf", x: 80, y: 80, size: 22, rotate: 152 },
    ],
    tapes: [{ x: 80, y: 6, width: 26, rotate: 8, color: "rgba(255,255,255,.62)" }],
  },
  spooky: {
    id: "spooky",
    tone: "dark",
    background:
      "radial-gradient(rgba(255,255,255,.75) calc(.3*var(--u)), transparent calc(.42*var(--u))) 0 0/calc(15*var(--u)) calc(15*var(--u)), radial-gradient(rgba(255,214,160,.5) calc(.2*var(--u)), transparent calc(.32*var(--u))) calc(7*var(--u)) calc(8*var(--u))/calc(19*var(--u)) calc(19*var(--u)), radial-gradient(120% 90% at 50% 20%, #4b2a70, #22143d 55%, #0d0918)",
    script: "#ffd9a0",
    hint: "rgba(255,217,160,.75)",
    piece: { kind: "gift", colors: { body: "#f39a3a", lid: "#f7b25c", ribbon: "#5a2f8a" } },
    stickers: [
      { id: "moon", x: 82, y: 12, size: 20, rotate: 0 },
      { id: "bat", x: 20, y: 12, size: 20, rotate: -10 },
      { id: "bat", x: 42, y: 21, size: 12, rotate: 12 },
      { id: "ghost", x: 87, y: 46, size: 16, rotate: 8 },
      { id: "sparkle", x: 9, y: 46, size: 8, rotate: 0 },
      { id: "pumpkin", x: 18, y: 78, size: 24, rotate: -6 },
      { id: "candy", x: 80, y: 81, size: 22, rotate: 18 },
    ],
  },
};

/** The cover a new gift starts with, chosen to suit the template's world. */
export function defaultCoverFor(slug: string): CoverId {
  switch (slug) {
    case "the-letter":
    case "scrapbook":
    case "garden":
      return "classic"; // each opens with its own envelope, book or gate
    case "kawaii":
      return "gingham";
    case "fireside":
      return "harvest";
    case "trick-or-treat":
      return "spooky";
    case "halfway":
      return "gingham";
    case "constellations":
    case "midnight-countdown":
    case "passport":
      return "starry";
    case "birthday-cinema":
    case "scratch-card":
    case "fortune-cookie":
    case "arcade":
      return "polka";
    case "our-timeline":
    case "bloom":
    case "bouquet":
      return "garden";
    default:
      return "gingham";
  }
}
