import type { CoverId } from "@/lib/gift/schema";
import type { AmbienceKind } from "../Ambience";
import { SCRAPS, type ScrapId } from "../collage/scraps";
import { MEMES, type MemeId } from "../memes/catalogue";
import type { StickerId } from "./stickers";

/**
 * A photograph cut out as a sticker (public/scraps, public/memes): where the file is, and its
 * shape, so its box is reserved before it has loaded and nothing on the page moves when it does.
 */
export type Cut = { src: string; ratio: number };
const scrap = (id: ScrapId): Cut => ({ src: `/scraps/${id}.webp`, ratio: SCRAPS[id].w / SCRAPS[id].h });
const meme = (id: MemeId): Cut => ({ src: `/memes/${id}.webp`, ratio: MEMES[id].w / MEMES[id].h });

export type EnvelopeColors = {
  body: string;
  flap: string;
  inner: string;
  seal: string;
  mark: "heart" | "star" | "paw";
  letter: string;
  /** A CSS background for the lining, seen when the flap is up. Falls back to `inner`. */
  liner?: string;
  /** A real seal in place of the drawn one: wax, or a lipstick print. `w` is in % of the envelope's width. */
  sealArt?: { cut: Cut; w: number; rotate?: number };
};
export type GiftBoxColors = {
  body: string;
  lid: string;
  ribbon: string;
  /** A CSS background printed over the box: dots, stripes. */
  pattern?: string;
  /** A CSS background for the ribbon's bands, when they are patterned too. Falls back to `ribbon`. */
  band?: string;
  /** A real bow in place of the drawn one. `w` is in % of the box's width. */
  bowArt?: { cut: Cut; w: number };
};

type Where = {
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** Laid over the envelope's edge instead of under it. */
  front?: boolean;
  /**
   * Fixed to a corner of the page instead of placed by percentage: `x` and `y` are then how far its
   * centre sits in from that corner, in `--u`. For art with a cut edge (a corner of lace) that has
   * to stay flush with the page's edge on a wide screen as well as a phone.
   */
  pin?: "tl" | "tr" | "bl" | "br";
};
/** Something on the page, a drawn sticker or a cut-out: centre position in % of the frame, width in `--u`. */
export type Placement = Where & ({ id: StickerId; color?: string; cut?: undefined } | { cut: Cut; id?: undefined; color?: undefined });
/** A strip of washi tape, same coordinates. */
export type Tape = { x: number; y: number; width: number; rotate: number; color: string };
/**
 * Something fixed to the envelope or the box, which bobs with it: centre in % of the piece's own
 * box, width in % of its width. `back` tucks it behind (a kitten peeking over the top edge). When
 * the gift opens it flies off, or with `leave: "fade"` stays where it is and fades.
 */
export type Attachment = { cut: Cut; x: number; y: number; w: number; rotate: number; back?: boolean; leave?: "fly" | "fade" };

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
  attach?: Attachment[];
  /** What drifts across the page while it waits to be opened. */
  ambience?: { kind: AmbienceKind; colors: string[]; count: number };
  /** The paper thrown when it opens. Falls back to the look's own colours. */
  confetti?: string[];
  /** The light the gift opens into. Falls back to paper white, or candlelight on a dark page. */
  bloom?: string;
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
      return { id, x: base.x, y: base.y, size: Math.round(base.size * (WEIGHT[id] ?? 1) * scale * 10) / 10, rotate: base.rotate, color, cut: undefined };
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


/** Small gingham for the lining of an envelope. */
const lining = (tint: string, ground: string) => gingham(tint, ground, "calc(4*var(--u))");

/**
 * The collage covers. These are composed by hand rather than on the eight slots: the art is real
 * flowers, kisses and cats cut out of photographs, it is bigger, and it runs off the edges of the
 * page. What they keep is the clear column down the middle: nothing but the envelope, the name
 * and the hint between 27% and 72% of the height (a unit test holds them to it).
 */
const COLLAGE_LOOKS: Record<"lilies" | "kisses" | "cats" | "party" | "bluebell" | "pressed", CoverLook> = {
  lilies: {
    id: "lilies",
    tone: "light",
    background: gingham("rgba(240,130,165,.28)", "#fde8ee"),
    script: "#b3245d",
    hint: "#b45b73",
    piece: {
      kind: "envelope",
      colors: { body: "#f9b9c9", flap: "#fcd0dc", inner: "#ee8aa6", seal: "#c2185b", mark: "heart", letter: "#fffaf7", liner: lining("rgba(238,120,158,.5)", "#fff5f8"), sealArt: { cut: scrap("wax-seal"), w: 25 } },
    },
    stickers: [
      { cut: scrap("lily-stargazer"), x: 9, y: 9, size: 46, rotate: -24 },
      { cut: scrap("sakura"), x: 60, y: 4, size: 15, rotate: 12 },
      { cut: scrap("blossom-gold"), x: 91, y: 9, size: 31, rotate: 18 },
      { cut: scrap("sakura"), x: 3, y: 39, size: 17, rotate: -14 },
      { cut: scrap("plumeria-pink"), x: 98, y: 50, size: 21, rotate: 16 },
      { id: "butterfly", x: 84, y: 24, size: 11, rotate: 14, cut: undefined },
      { cut: scrap("hibiscus-pink"), x: 9, y: 87, size: 38, rotate: 12 },
      { cut: scrap("blossom-pale"), x: 45, y: 96, size: 20, rotate: -8 },
      { cut: scrap("lily-pink"), x: 89, y: 89, size: 48, rotate: 20 },
    ],
    attach: [{ cut: scrap("bow-gingham"), x: 8, y: 6, w: 36, rotate: -16 }],
    ambience: { kind: "petals", colors: ["#ffd1df", "#ffffff", "#f7a8c0"], count: 11 },
    confetti: ["#f08fb0", "#ffffff", "#ffd3e0", "#c2185b"],
  },
  kisses: {
    id: "kisses",
    tone: "light",
    background: "radial-gradient(90% 55% at 50% 0%, rgba(179,18,42,.10), transparent 70%), #f6eee2",
    script: "#a3122a",
    hint: "#a4474f",
    piece: {
      kind: "envelope",
      colors: { body: "#fffaf2", flap: "#fbefe0", inner: "#b3122a", seal: "#b3122a", mark: "heart", letter: "#ffffff", liner: `radial-gradient(rgba(255,255,255,.3) calc(.35*var(--u)), transparent calc(.45*var(--u))) 0 0/calc(3*var(--u)) calc(3*var(--u)), #b3122a`, sealArt: { cut: scrap("kiss-red"), w: 37, rotate: -8 } },
    },
    stickers: [
      { cut: scrap("lace-red"), x: 17, y: 19, size: 72, rotate: 180, pin: "tr" },
      { cut: scrap("kiss-red"), x: 15, y: 14, size: 31, rotate: -18 },
      { cut: scrap("heart-damask"), x: 8, y: 40, size: 14, rotate: -10 },
      { cut: scrap("kiss-1"), x: 95, y: 56, size: 19, rotate: 18 },
      { cut: scrap("kiss-dark"), x: 9, y: 79, size: 24, rotate: -22 },
      { cut: scrap("bow-red"), x: 30, y: 92, size: 13, rotate: -12 },
      { cut: scrap("heart-print"), x: 62, y: 95, size: 17, rotate: 10 },
      { cut: scrap("kiss-3"), x: 88, y: 84, size: 27, rotate: 14 },
    ],
    attach: [{ cut: scrap("doily-red"), x: 50, y: 42, w: 106, rotate: -8, back: true, leave: "fade" }],
    ambience: { kind: "hearts", colors: ["#b3122a", "#e8909c", "#ffffff"], count: 8 },
    confetti: ["#b3122a", "#ffffff", "#e8909c", "#7e0c1d"],
  },
  cats: {
    id: "cats",
    tone: "light",
    background: gingham("rgba(160,140,220,.26)", "#f4f0fb"),
    script: "#5b3fb0",
    hint: "#7d68b8",
    piece: {
      kind: "envelope",
      colors: { body: "#fffdfb", flap: "#f4eeff", inner: "#cdbef0", seal: "#7a5cc8", mark: "paw", letter: "#ffffff", liner: lining("rgba(160,140,220,.5)", "#faf7ff") },
    },
    stickers: [
      { cut: meme("whiskers"), x: 15, y: 11, size: 37, rotate: -8 },
      { id: "bow", x: 52, y: 5, size: 12, rotate: 4, cut: undefined },
      { cut: meme("blush"), x: 87, y: 12, size: 32, rotate: 10 },
      { cut: meme("shark-baby"), x: 5, y: 42, size: 18, rotate: -10 },
      { id: "heart", x: 95, y: 36, size: 9, rotate: 12, cut: undefined },
      { cut: meme("matcha"), x: 96, y: 55, size: 21, rotate: 8 },
      { cut: meme("tulips"), x: 13, y: 86, size: 27, rotate: -5 },
      { cut: meme("wink"), x: 50, y: 95, size: 17, rotate: 5 },
      { cut: meme("glasses-tulips"), x: 86, y: 87, size: 35, rotate: 8 },
    ],
    attach: [{ cut: meme("bow-kitten"), x: 80, y: -8, w: 22, rotate: 7, back: true }],
    ambience: { kind: "hearts", colors: ["#f7a8c0", "#cdbef0", "#ffffff"], count: 8 },
    confetti: ["#7a5cc8", "#f7a8c0", "#ffffff", "#ffd166"],
  },
  party: {
    id: "party",
    tone: "light",
    background: `radial-gradient(#ffd166 calc(1.1*var(--u)), transparent calc(1.25*var(--u))) 0 0/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(#7fd6c2 calc(1*var(--u)), transparent calc(1.15*var(--u))) calc(6.5*var(--u)) calc(7*var(--u))/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(#ff9ec0 calc(1.2*var(--u)), transparent calc(1.35*var(--u))) calc(3*var(--u)) calc(11*var(--u))/calc(17*var(--u)) calc(17*var(--u)), #fff6ee`,
    script: "#e0367b",
    hint: "#c25c85",
    piece: {
      kind: "gift",
      colors: { body: "#fffaf3", lid: "#ffc9d8", ribbon: "#d63a4a", pattern: dots("rgba(240,88,140,.34)", "transparent", 7, 0.9), band: gingham("rgba(214,58,70,.75)", "#ffffff", "calc(2.2*var(--u))"), bowArt: { cut: scrap("bow-gingham"), w: 56 } },
    },
    stickers: [
      { cut: meme("party-yell"), x: 14, y: 12, size: 32, rotate: -8 },
      { cut: meme("balloon-cat"), x: 53, y: 7, size: 18, rotate: 5 },
      { cut: meme("puppies"), x: 87, y: 12, size: 31, rotate: 8 },
      { cut: meme("hamster-cake"), x: 5, y: 45, size: 14, rotate: -8 },
      { cut: meme("sad-hamster"), x: 96, y: 49, size: 16, rotate: 8 },
      { cut: meme("party-kitten"), x: 12, y: 86, size: 29, rotate: -4 },
      { cut: meme("rat"), x: 49, y: 95, size: 25, rotate: -3 },
      { cut: meme("ferrets"), x: 87, y: 86, size: 36, rotate: 3 },
    ],
    confetti: ["#f0588c", "#ffc93c", "#57b8a0", "#6c8cf5", "#f58a4b", "#ffffff"],
  },
  bluebell: {
    id: "bluebell",
    tone: "light",
    background: gingham("rgba(110,150,205,.26)", "#ecf2fb"),
    script: "#274a8c",
    hint: "#5f7fb0",
    piece: {
      kind: "envelope",
      colors: { body: "#fffdf8", flap: "#f6f1e6", inner: "#b9cbe8", seal: "#2f4f8f", mark: "heart", letter: "#ffffff", liner: lining("rgba(100,140,200,.5)", "#f7faff") },
    },
    stickers: [
      { cut: scrap("blue-spray"), x: 9, y: 13, size: 27, rotate: -14 },
      { cut: scrap("blue-pansy"), x: 57, y: 4, size: 14, rotate: 10 },
      { cut: scrap("blue-poppy"), x: 90, y: 9, size: 33, rotate: 16 },
      { cut: scrap("blue-velvet"), x: 3, y: 47, size: 17, rotate: -10 },
      { cut: scrap("blue-clematis"), x: 98, y: 46, size: 20, rotate: 14 },
      { id: "butterfly", x: 17, y: 26, size: 10, rotate: -16, cut: undefined },
      { cut: scrap("blue-hibiscus"), x: 9, y: 87, size: 38, rotate: -12 },
      { cut: scrap("blue-gerbera"), x: 46, y: 96, size: 19, rotate: 6 },
      { cut: scrap("blue-lily"), x: 89, y: 88, size: 46, rotate: 18 },
    ],
    attach: [{ cut: scrap("blue-rose"), x: 95, y: 92, w: 24, rotate: 14 }],
    ambience: { kind: "petals", colors: ["#dce9fb", "#ffffff", "#9fb6d6"], count: 10 },
    confetti: ["#8fb0e0", "#ffffff", "#dce9fb", "#2f4f8f"],
  },
  pressed: {
    id: "pressed",
    tone: "light",
    background: "repeating-linear-gradient(8deg, rgba(90,60,20,.05) 0 1px, transparent 1px 5px), radial-gradient(80% 50% at 50% 30%, rgba(255,245,220,.5), transparent 75%), #d9c4a2",
    script: "#4a2a16",
    hint: "#7a5a3c",
    piece: {
      kind: "envelope",
      colors: { body: "#f0e2c8", flap: "#f6ebd5", inner: "#c9ab80", seal: "#8e2b2b", mark: "heart", letter: "#fffdf6", sealArt: { cut: scrap("wax-seal"), w: 25 } },
    },
    stickers: [
      { cut: scrap("roses-kraft"), x: 10, y: 12, size: 36, rotate: -12 },
      { cut: scrap("dried-flowers"), x: 89, y: 13, size: 27, rotate: 12 },
      { cut: scrap("kiss-4"), x: 95, y: 52, size: 13, rotate: 16 },
      { cut: scrap("leaf-skeleton"), x: 9, y: 82, size: 40, rotate: -26 },
      { cut: scrap("locket"), x: 38, y: 95, size: 34, rotate: -6 },
      { cut: scrap("peony-kraft"), x: 88, y: 87, size: 42, rotate: 10 },
    ],
    attach: [
      { cut: scrap("dried-flowers"), x: 17, y: -10, w: 24, rotate: -22, back: true },
      { cut: scrap("columbine"), x: 4, y: 94, w: 27, rotate: -18 },
    ],
    ambience: { kind: "dust", colors: ["#ffffff", "#ffefc2"], count: 16 },
    confetti: ["#8e2b2b", "#f7efde", "#d9b25c", "#7a5a38"],
  },
};

export const COVER_LOOKS: Record<CoverLook["id"], CoverLook> = {
  ...COLLAGE_LOOKS,
  gingham: {
    id: "gingham",
    ambience: { kind: "petals", colors: ["#ffd1df", "#ffffff", "#f7a8c0"], count: 9 },
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
    ambience: { kind: "sparkles", colors: ["#ffffff", "#ffe9b8", "#bfd7ff"], count: 22 },
    tone: "dark",
    background: night("#33387a", "#181a45", "#0c0c26"),
    script: "#fff3cf",
    hint: "rgba(255,243,207,.75)",
    piece: { kind: "envelope", colors: { body: "#d6c9f6", flap: "#e4dafb", inner: "#b7a3ea", seal: "#6a4bc4", mark: "star", letter: "#fffdf6" } },
    stickers: place({ tl: "star", tr: "moon", top: "sparkle", ml: "sparkle", mr: "star", bl: "planet", br: "cloud" }),
  },
  polka: {
    id: "polka",
    ambience: { kind: "hearts", colors: ["#f7aec2", "#ffffff"], count: 7 },
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
    ambience: { kind: "petals", colors: ["#ffffff", "#fff0b8", "#cfe3c0"], count: 9 },
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
    ambience: { kind: "hearts", colors: ["#ffd9d9", "#ffffff"], count: 9 },
    tone: "dark",
    background: "repeating-linear-gradient(45deg, #b3122e 0 calc(4.5*var(--u)), #c41f3a calc(4.5*var(--u)) calc(9*var(--u)))",
    script: "#fff5ee",
    hint: "rgba(255,245,238,.8)",
    piece: { kind: "envelope", colors: { body: "#fff6ee", flap: "#fdeadf", inner: "#f0cdb7", seal: "#b8860b", mark: "heart", letter: "#ffffff" } },
    stickers: place({ tl: "heart", tr: "kiss", ml: "sparkle", mr: "heart", bl: "balloons", br: "bow" }),
  },
  harvest: {
    id: "harvest",
    ambience: { kind: "leaves", colors: ["#c4783a", "#e0a45a", "#8a3b12"], count: 8 },
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
    ambience: { kind: "bats", colors: ["#1a0f2b"], count: 4 },
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
    ambience: { kind: "sparkles", colors: ["#d9b25c", "#ffffff"], count: 12 },
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
    ambience: { kind: "dust", colors: ["#ffeccd", "#ffffff"], count: 16 },
    tone: "dark",
    background: "repeating-linear-gradient(45deg, #5d4030 0 calc(4.5*var(--u)), #6a4a37 calc(4.5*var(--u)) calc(9*var(--u)))",
    script: "#ffeccd",
    hint: "rgba(255,236,205,.78)",
    piece: { kind: "envelope", colors: { body: "#f6e7cf", flap: "#fbf1de", inner: "#dcc4a1", seal: "#8c4a2f", mark: "heart", letter: "#fffdf7" } },
    stickers: place({ tl: "mug", tr: "cloud", ml: "sparkle", mr: "heart", bl: { id: "squiggle", color: "#e8c9a0" }, br: "star" }),
  },
  snow: {
    id: "snow",
    ambience: { kind: "snow", colors: ["#ffffff", "#dcecff"], count: 34 },
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
    case "the-council":
    case "sticker-bomb":
    case "coquette":
    case "xoxo":
    case "keepsake":
    case "the-letter":
    case "scrapbook":
    case "garden":
    case "popup-card":
    case "sketchbook":
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
    case "party-animals":
      return "party";
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
