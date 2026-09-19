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

/**
 * Every cover is composed on the same eight slots, arranged around the envelope and the name so
 * nothing ever lands on them: two top corners, a small one at the top edge, one on each side, two
 * bottom corners and one at the foot. A cover picks stickers for the slots it wants; what makes it
 * its own is the paper, the palette and what is stuck on it, never a different layout. That is
 * what makes twelve of them read as one set in the picker.
 */
const SLOTS = {
  tl: { x: 15, y: 15, size: 25, rotate: -9 },
  tr: { x: 85, y: 14, size: 25, rotate: 9 },
  top: { x: 50, y: 6, size: 17, rotate: 0 },
  ml: { x: 8, y: 42, size: 17, rotate: -8 },
  mr: { x: 92, y: 40, size: 17, rotate: 10 },
  bl: { x: 16, y: 79, size: 24, rotate: -8 },
  br: { x: 84, y: 77, size: 24, rotate: 10 },
  bm: { x: 50, y: 93, size: 17, rotate: -5 },
} as const;

type SlotId = keyof typeof SLOTS;

/**
 * A sparkle and a bouquet at the same width look nothing alike: one is a speck, the other a
 * bunch. These even out how heavy each sticker reads so a slot holds the same amount of ink
 * whichever sticker is in it.
 */
const WEIGHT: Partial<Record<StickerId, number>> = {
  sparkle: 0.42,
  star: 0.62,
  squiggle: 0.62,
  heart: 0.72,
  snowflake: 0.78,
  acorn: 0.78,
  tulip: 0.82,
  kiss: 0.85,
  moon: 0.85,
  strawberry: 0.85,
  daisy: 0.86,
  leaf: 0.86,
  bat: 0.86,
  ghost: 0.88,
  cherries: 0.9,
  candy: 0.92,
  bow: 0.94,
  butterfly: 0.95,
  mug: 0.95,
  pumpkin: 0.96,
  cake: 1,
  cloud: 1,
  planet: 1,
  bouquet: 1.06,
  balloons: 1.06,
};

type Spot = StickerId | { id: StickerId; color?: string; scale?: number };

/** Turns a cover's choice of stickers into placements on the shared grid. */
function place(set: Partial<Record<SlotId, Spot>>): Placement[] {
  return (Object.keys(SLOTS) as SlotId[])
    .filter((slot) => set[slot])
    .map((slot) => {
      const spot = set[slot]!;
      const { id, color, scale = 1 } = typeof spot === "string" ? { id: spot, color: undefined, scale: 1 } : spot;
      const base = SLOTS[slot];
      return { id, x: base.x, y: base.y, size: Math.round(base.size * (WEIGHT[id] ?? 1) * scale * 10) / 10, rotate: base.rotate, color };
    });
}

/** Gingham from two half-tinted stripe layers; the overlap gives the darker squares. */
const gingham = (tint: string, ground: string, cell = "calc(12*var(--u))") =>
  `linear-gradient(90deg, ${tint} 50%, transparent 0) 0 0/${cell} ${cell}, linear-gradient(${tint} 50%, transparent 0) 0 0/${cell} ${cell}, ${ground}`;

/** Evenly spaced dots, the polka and pearl papers. */
const dots = (color: string, ground: string, cell = 10, r = 1.5) =>
  `radial-gradient(${color} calc(${r}*var(--u)), transparent calc(${r + 0.15}*var(--u))) 0 0/calc(${cell}*var(--u)) calc(${cell}*var(--u)), radial-gradient(${color} calc(${r}*var(--u)), transparent calc(${r + 0.15}*var(--u))) calc(${cell / 2}*var(--u)) calc(${cell / 2}*var(--u))/calc(${cell}*var(--u)) calc(${cell}*var(--u)), ${ground}`;

/** A night sky: two sizes of star, and the glow the whole page sits in. */
const night = (glow: string, mid: string, deep: string) =>
  `radial-gradient(rgba(255,255,255,.85) calc(.32*var(--u)), transparent calc(.45*var(--u))) 0 0/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(rgba(255,255,255,.5) calc(.22*var(--u)), transparent calc(.34*var(--u))) calc(6*var(--u)) calc(7*var(--u))/calc(17*var(--u)) calc(17*var(--u)), radial-gradient(120% 90% at 50% 18%, ${glow}, ${mid} 58%, ${deep})`;

/** Paper covers are taped down at one corner; night skies are not. */
const TAPE = (color: string): Tape[] => [{ x: 84, y: 5, width: 28, rotate: 9, color }];

export const COVER_LOOKS: Record<CoverLook["id"], CoverLook> = {
  gingham: {
    id: "gingham",
    tone: "light",
    background: gingham("rgba(246,166,184,.36)", "#fff5f6"),
    script: "#c2185b",
    hint: "#b45b73",
    piece: { kind: "envelope", colors: { body: "#f7a9bd", flap: "#fbc4d2", inner: "#ee8aa6", seal: "#c2185b", mark: "heart", letter: "#fffaf7" } },
    stickers: place({ tl: "bouquet", tr: "bow", ml: "sparkle", mr: "heart", bl: "balloons", br: "butterfly" }),
    tapes: TAPE("rgba(255,255,255,.62)"),
  },
  picnic: {
    id: "picnic",
    tone: "light",
    background: gingham("rgba(214,58,70,.26)", "#fff9f2"),
    script: "#b8232f",
    hint: "#a4474f",
    piece: { kind: "envelope", colors: { body: "#fffaf1", flap: "#fff1df", inner: "#f0d4bd", seal: "#c62d3a", mark: "heart", letter: "#ffffff" } },
    stickers: place({ tl: "cherries", tr: "strawberry", top: "sparkle", ml: "daisy", mr: "heart", bl: "daisy", br: "butterfly" }),
    tapes: TAPE("rgba(255,255,255,.7)"),
  },
  starry: {
    id: "starry",
    tone: "dark",
    background: night("#33387a", "#181a45", "#0c0c26"),
    script: "#fff3cf",
    hint: "rgba(255,243,207,.75)",
    piece: { kind: "envelope", colors: { body: "#d6c9f6", flap: "#e4dafb", inner: "#b7a3ea", seal: "#6a4bc4", mark: "star", letter: "#fffdf6" } },
    stickers: place({ tl: "star", tr: "moon", top: "sparkle", ml: "sparkle", mr: "star", bl: "planet", br: "cloud" }),
  },
  polka: {
    id: "polka",
    tone: "light",
    background: dots("#f7aec2", "#fff7ef"),
    script: "#d6336c",
    hint: "#b8567a",
    piece: { kind: "gift", colors: { body: "#fffaf3", lid: "#fff2e4", ribbon: "#e84c6b" } },
    stickers: place({ tl: "heart", tr: "balloons", ml: "sparkle", mr: "heart", bl: "strawberry", br: "cherries" }),
    tapes: TAPE("rgba(255,255,255,.7)"),
  },
  garden: {
    id: "garden",
    tone: "light",
    background: gingham("rgba(137,170,122,.26)", "#f8f6ea"),
    script: "#55733a",
    hint: "#6d7f5a",
    piece: { kind: "envelope", colors: { body: "#dcbb92", flap: "#e6caa5", inner: "#c59c6d", seal: "#7c8f4c", mark: "heart", letter: "#fffdf6" } },
    stickers: place({ tl: "tulip", tr: "bouquet", top: "sparkle", ml: "daisy", mr: "butterfly", bl: "daisy", br: "leaf" }),
    tapes: TAPE("rgba(255,255,255,.6)"),
  },
  lovecore: {
    id: "lovecore",
    tone: "dark",
    background: "repeating-linear-gradient(45deg, #b3122e 0 calc(4.5*var(--u)), #c41f3a calc(4.5*var(--u)) calc(9*var(--u)))",
    script: "#fff5ee",
    hint: "rgba(255,245,238,.8)",
    piece: { kind: "envelope", colors: { body: "#fff6ee", flap: "#fdeadf", inner: "#f0cdb7", seal: "#b8860b", mark: "heart", letter: "#ffffff" } },
    stickers: place({ tl: "heart", tr: "kiss", ml: "sparkle", mr: "heart", bl: "balloons", br: "bow" }),
  },
  harvest: {
    id: "harvest",
    tone: "light",
    background: gingham("rgba(196,120,52,.28)", "#fbf3e3"),
    script: "#8a3b12",
    hint: "#9a6a44",
    piece: { kind: "envelope", colors: { body: "#e7c49c", flap: "#f0d6b6", inner: "#cfa273", seal: "#b8471f", mark: "heart", letter: "#fffaf2" } },
    stickers: place({ tl: "leaf", tr: "pumpkin", top: "sparkle", ml: "acorn", mr: "leaf", bl: "mug", br: "leaf" }),
    tapes: TAPE("rgba(255,255,255,.62)"),
  },
  spooky: {
    id: "spooky",
    tone: "dark",
    background: night("#4b2a70", "#22143d", "#0d0918"),
    script: "#ffd9a0",
    hint: "rgba(255,217,160,.75)",
    piece: { kind: "gift", colors: { body: "#f39a3a", lid: "#f7b25c", ribbon: "#5a2f8a" } },
    stickers: place({ tl: "bat", tr: "moon", top: "bat", ml: "sparkle", mr: "ghost", bl: "pumpkin", br: "candy" }),
  },
  birthday: {
    id: "birthday",
    tone: "light",
    background: `radial-gradient(#ffd166 calc(1.1*var(--u)), transparent calc(1.25*var(--u))) 0 0/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(#7ec8f2 calc(1*var(--u)), transparent calc(1.15*var(--u))) calc(6.5*var(--u)) calc(7*var(--u))/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(#ff9ec0 calc(1.2*var(--u)), transparent calc(1.35*var(--u))) calc(3*var(--u)) calc(11*var(--u))/calc(17*var(--u)) calc(17*var(--u)), #fff8ef`,
    script: "#e0367b",
    hint: "#c25c85",
    piece: { kind: "gift", colors: { body: "#fff3d1", lid: "#ffd166", ribbon: "#3fa9e0" } },
    stickers: place({ tl: "balloons", tr: "cake", ml: "sparkle", mr: "star", bl: "candy", br: "bow" }),
    tapes: TAPE("rgba(255,255,255,.72)"),
  },
  pearl: {
    id: "pearl",
    tone: "light",
    background: `radial-gradient(70% 46% at 50% 12%, rgba(255,255,255,.55), transparent 72%), ${dots("rgba(190,160,112,.42)", "#fbf4e6", 9, 1.2)}`,
    script: "#6f5426",
    hint: "#8a7350",
    piece: { kind: "envelope", colors: { body: "#fffdf8", flap: "#fbf3e6", inner: "#eadfc9", seal: "#c9a227", mark: "heart", letter: "#ffffff" } },
    stickers: place({ tl: "bow", tr: "bouquet", top: "sparkle", ml: "sparkle", mr: "heart", bl: "daisy", br: "butterfly" }),
    tapes: TAPE("rgba(255,255,255,.75)"),
  },
  mocha: {
    id: "mocha",
    tone: "dark",
    background: "repeating-linear-gradient(45deg, #5d4030 0 calc(4.5*var(--u)), #6a4a37 calc(4.5*var(--u)) calc(9*var(--u)))",
    script: "#ffeccd",
    hint: "rgba(255,236,205,.78)",
    piece: { kind: "envelope", colors: { body: "#f6e7cf", flap: "#fbf1de", inner: "#dcc4a1", seal: "#8c4a2f", mark: "heart", letter: "#fffdf7" } },
    stickers: place({ tl: "mug", tr: "cloud", ml: "sparkle", mr: "heart", bl: { id: "squiggle", color: "#e8c9a0" }, br: "star" }),
  },
  snow: {
    id: "snow",
    tone: "dark",
    background: night("#2f5680", "#1b3050", "#0c1a2e"),
    script: "#eaf6ff",
    hint: "rgba(234,246,255,.78)",
    piece: { kind: "gift", colors: { body: "#f6f9fc", lid: "#e6eef7", ribbon: "#c0392b" } },
    stickers: place({ tl: "snowflake", tr: "moon", top: "sparkle", ml: "star", mr: "snowflake", bl: "cloud", br: "snowflake" }),
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
    case "paper-crane":
      return "gingham";
    case "snow-globe":
      return "starry";
    case "recipe-box":
      return "garden";
    case "cap-toss":
      return "polka";
    case "the-toast":
      return "lovecore";
    case "constellations":
    case "midnight-countdown":
    case "passport":
      return "starry";
    case "birthday-cinema":
    case "arcade":
    case "balloons":
      return "birthday";
    case "scratch-card":
    case "fortune-cookie":
      return "polka";
    case "our-timeline":
    case "bloom":
    case "bouquet":
      return "garden";
    default:
      return "gingham";
  }
}
