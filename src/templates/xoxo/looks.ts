import { mulberry32 } from "../_shared/random";
import type { Print } from "../_shared/collage/paper";
import { ofKind, type ScrapId } from "../_shared/collage/scraps";

export type LookId = "cream" | "blush" | "lilac" | "blue" | "sage" | "mocha" | "noir" | "rose" | "gothic" | "letters";

/**
 * Every cut-out on the page and the cover, by where it sits: the lace in the corner, the doily
 * under the first photo, the bow and kisses round it, and so on down to the seal on the envelope.
 */
export type DecorSlot =
  | "lace" | "doily" | "bow" | "kissA" | "kissB" | "kissC" | "heartPrint"
  | "heartBig" | "kiss2" | "kiss3" | "bowSmall" | "plush" | "damask"
  | "lace2" | "kiss4" | "heartPink" | "kissLast" | "plaster" | "sign"
  | "envelopeDoily" | "envelopeBow" | "seal" | "coverA" | "coverB" | "coverC" | "coverD";

/** The red lace, lipstick and doilies every XOXO page had before it had its own sets. */
export const DECOR: Record<DecorSlot, ScrapId> = {
  lace: "lace-red", doily: "doily-red", bow: "bow-red", kissA: "kiss-red", kissB: "kiss-1", kissC: "kiss-dark", heartPrint: "heart-print",
  heartBig: "heart-anatomical", kiss2: "kiss-2", kiss3: "kiss-3", bowSmall: "bow-red", plush: "cats-kiss", damask: "heart-damask",
  lace2: "lace-red", kiss4: "kiss-4", heartPink: "heart-print-pink", kissLast: "kiss-dark", plaster: "plaster-heart", sign: "kiss-red",
  envelopeDoily: "doily-red", envelopeBow: "bow-satin-mini", seal: "kiss-red", coverA: "lace-red", coverB: "kiss-red", coverC: "heart-print", coverD: "kiss-1",
};

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
  /** A print on the page: the first seven are plain paper. */
  print?: { kind: Print; ink: string };
  /**
   * Cut-outs of the look's own, by slot, in place of the red set. The last three have whole sets,
   * so a page in one of them shares no piece with the first seven: a screen recording of each is a
   * picture of its own, not the same page recoloured.
   */
  decor?: Partial<Record<DecorSlot, ScrapId>>;
  /** A CSS filter for a slot's cut-out: the red lace turned pink or black. */
  tones?: Partial<Record<DecorSlot, string>>;
  /** The same for the kisses a tap leaves. */
  kissTone?: string;
};

/** What goes in `slot` on a page in `look`, and the filter it is drawn through. */
export const decor = (look: Look, slot: DecorSlot): { id: ScrapId; tone?: string } => ({ id: look.decor?.[slot] ?? DECOR[slot], tone: look.tones?.[slot] });

/** Red lipstick and lace turned pink: the hue toward rose, lighter, softer. */
const PINK = "hue-rotate(-16deg) saturate(.8) brightness(1.35)";
/** Red lace and doilies turned black. */
const BLACK = "grayscale(1) brightness(.3) contrast(1.4)";

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
  lilac: {
    wall: "#EEE5F6",
    ink: "#33203F",
    soft: "rgba(51,32,63,.6)",
    red: "#B01E4B",
    paper: "#FFFCFF",
    paperInk: "#33203F",
    card: "#E4D6F1",
    cardInk: "#271631",
    envelope: { body: "#EBE0F5", flap: "#E1D2F0", lining: "#B01E4B" },
    tiles: ["#271631", "#FFFCFF", "#B01E4B", "#D5C1EA", "#FFFCFF", "#271631"],
    confetti: ["#B01E4B", "#FFFFFF", "#CDB4EA", "#6D3C8C"],
    dark: false,
  },
  blue: {
    wall: "#E3EDF8",
    ink: "#1B2A44",
    soft: "rgba(27,42,68,.6)",
    red: "#B3122A",
    paper: "#FFFFFF",
    paperInk: "#1B2A44",
    card: "#D3E1F3",
    cardInk: "#141F35",
    envelope: { body: "#DDE8F5", flap: "#D0DFF1", lining: "#B3122A" },
    tiles: ["#141F35", "#FFFFFF", "#B3122A", "#B9CFEC", "#FFFFFF", "#141F35"],
    confetti: ["#B3122A", "#FFFFFF", "#9FBFE6", "#3A5E9E"],
    dark: false,
  },
  sage: {
    wall: "#E5ECDF",
    ink: "#22301D",
    soft: "rgba(34,48,29,.6)",
    red: "#A8172E",
    paper: "#FFFEF9",
    paperInk: "#22301D",
    card: "#D3DFC9",
    cardInk: "#1A2616",
    envelope: { body: "#DCE5D3", flap: "#D0DBC5", lining: "#A8172E" },
    tiles: ["#1A2616", "#FFFEF9", "#A8172E", "#BFCFB1", "#FFFEF9", "#1A2616"],
    confetti: ["#A8172E", "#FFFFFF", "#B5C8A5", "#4B6A42"],
    dark: false,
  },
  mocha: {
    wall: "#E9DDD0",
    ink: "#3A2A21",
    soft: "rgba(58,42,33,.6)",
    red: "#9C1C30",
    paper: "#FFFBF5",
    paperInk: "#3A2A21",
    card: "#DAC7B4",
    cardInk: "#2A1D16",
    envelope: { body: "#E4D4C2", flap: "#D9C6B1", lining: "#9C1C30" },
    tiles: ["#2A1D16", "#FFFBF5", "#9C1C30", "#CBB39A", "#FFFBF5", "#2A1D16"],
    confetti: ["#9C1C30", "#FFFFFF", "#CBB39A", "#6B4A3A"],
    dark: false,
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
  // The three below swap every cut-out for a set of their own, and two of them print the page.
  rose: {
    wall: "#F9DCE5",
    ink: "#4A1630",
    soft: "rgba(74,22,48,.6)",
    red: "#D2457E",
    paper: "#FFF9FB",
    paperInk: "#3E1228",
    card: "#FCEAF0",
    cardInk: "#3E1228",
    envelope: { body: "#FBE6EE", flap: "#F7D3E0", lining: "#D2457E" },
    tiles: ["#D2457E", "#FFF9FB", "#4A1630", "#F6B9CF", "#FFF9FB", "#D2457E"],
    confetti: ["#D2457E", "#FFFFFF", "#F6B9CF", "#9C2459"],
    dark: false,
    print: { kind: "dots", ink: "rgba(255,255,255,.75)" },
    decor: {
      lace: "lace-red", doily: "doily-pink", bow: "bow-satin-pink", kissA: "kiss-red", kissB: "heart-gingham", kissC: "kiss-3", heartPrint: "heart-print-pink",
      heartBig: "heart-puffy", kiss2: "kiss-2", kiss3: "wax-seal-swans", bowSmall: "bow-satin-blush", plush: "cats-nose", damask: "wax-seal-hibiscus",
      lace2: "lace-red", kiss4: "kiss-4", heartPink: "heart-print-pink", kissLast: "star-glossy-small", plaster: "plaster-heart", sign: "kiss-red",
      envelopeDoily: "doily-pink", envelopeBow: "bow-satin-pink", seal: "kiss-red", coverA: "lace-red", coverB: "kiss-red", coverC: "heart-print-pink", coverD: "heart-gingham",
    },
    tones: { lace: PINK, kissA: PINK, kissC: PINK, heartBig: PINK, kiss2: PINK, lace2: PINK, kiss4: PINK, sign: PINK, seal: PINK, coverA: PINK, coverB: PINK },
    kissTone: PINK,
  },
  gothic: {
    wall: "#EEE8E4",
    ink: "#1E1517",
    soft: "rgba(30,21,23,.6)",
    red: "#8E1B2B",
    paper: "#FFFDF9",
    paperInk: "#1E1517",
    card: "#E4DCD7",
    cardInk: "#1E1517",
    envelope: { body: "#E9E1DC", flap: "#DED4CE", lining: "#1E1517" },
    tiles: ["#151112", "#FFFDF9", "#8E1B2B", "#D8CFC9", "#FFFDF9", "#151112"],
    confetti: ["#151112", "#FFFFFF", "#8E1B2B", "#D8CFC9"],
    dark: false,
    decor: {
      lace: "lace-red", doily: "doily-red", bow: "bow-lace-black", kissA: "rose-black", kissB: "brooch-heart", kissC: "kiss-dark", heartPrint: "wax-seal-flower",
      heartBig: "heart-sculpture", kiss2: "butterfly-black", kiss3: "key-ornate", bowSmall: "bow-black-small", plush: "cat-black", damask: "moth",
      lace2: "lace-red", kiss4: "rose-black-small", heartPink: "butterfly-wine", kissLast: "kiss-dark", plaster: "mask-lace", sign: "rose-black-large",
      envelopeDoily: "doily-red", envelopeBow: "bow-black-small", seal: "wax-seal-flower", coverA: "lace-red", coverB: "rose-black", coverC: "wax-seal-flower", coverD: "kiss-dark",
    },
    tones: { lace: BLACK, doily: BLACK, lace2: BLACK, envelopeDoily: BLACK, coverA: BLACK },
    kissTone: "saturate(.7) brightness(.62)",
  },
  letters: {
    wall: "#EEE4D4",
    ink: "#2E2118",
    soft: "rgba(46,33,24,.6)",
    red: "#9E2333",
    paper: "#FFFCF5",
    paperInk: "#2E2118",
    card: "#E5D8C3",
    cardInk: "#2A1E15",
    envelope: { body: "#E6D5B8", flap: "#DCC7A4", lining: "#9E2333" },
    tiles: ["#2E2118", "#FFFCF5", "#9E2333", "#D9C6A6", "#FFFCF5", "#1F3A5F"],
    confetti: ["#9E2333", "#FFFFFF", "#D9C6A6", "#1F3A5F"],
    dark: false,
    print: { kind: "stripes", ink: "rgba(120,88,58,.14)" },
    decor: {
      lace: "paper-script", doily: "paper-roses", bow: "wax-seal-heart", kissA: "envelope-ps", kissB: "tag-tofrom", kissC: "wax-seal", heartPrint: "label-ornate",
      heartBig: "letters-quill", kiss2: "locket", kiss3: "kiss-red", bowSmall: "wax-seal-swans", plush: "envelopes-pair", damask: "heart-damask",
      lace2: "paper-script", kiss4: "kiss-1", heartPink: "wax-seal-hibiscus", kissLast: "heart-print", plaster: "plaster-heart", sign: "kiss-red",
      envelopeDoily: "paper-roses", envelopeBow: "tag-tofrom", seal: "wax-seal-heart", coverA: "paper-script", coverB: "envelope-ps", coverC: "label-ornate", coverD: "wax-seal",
    },
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

/** One of the prints that fly off the seal as it breaks: its direction in degrees, how far it goes and how big it is, in `--p`. */
export type BurstKiss = { scrap: ScrapId; angle: number; distance: number; rotate: number; w: number; delay: number };

/**
 * The ring of kisses the seal breaks into when the envelope is opened: spaced round the circle so
 * none of them overlap, each nudged off its slot, seeded so a replay throws the same ones.
 */
export function burstKisses(seed: number, count = 8): BurstKiss[] {
  const random = mulberry32(seed + 104729);
  return Array.from({ length: count }, (_, i) => ({
    scrap: KISSES[Math.floor(random() * KISSES.length)],
    angle: Math.round((i / count) * 360 + (random() - 0.5) * 24),
    distance: 38 + Math.round(random() * 14),
    rotate: Math.round((random() - 0.5) * 80),
    w: 10 + Math.round(random() * 5),
    delay: Math.round(random() * 9) / 100,
  }));
}

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the red. */
export const LOOK_ORDER: LookId[] = ["cream", "blush", "lilac", "blue", "sage", "mocha", "noir", "rose", "gothic", "letters"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].red }])) as Record<LookId, { page: string; paper: string; accent: string }>;
