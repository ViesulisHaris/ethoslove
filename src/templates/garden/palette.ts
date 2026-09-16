/**
 * Four gardens, each a complete world: the sky over it, the three bands of land, the paper the
 * notes are written on, the wood of the gate and the trellis, the glass of the greenhouse, and
 * what falls through the air. Pure data, so the art file stays drawings and the template stays
 * behaviour.
 */
import type { AmbienceKind } from "../_shared/Ambience";
import type { CoverTone, StickerPlacement } from "../_shared/cover-kit";
import type { FlowerId } from "../bouquet/catalogue";
import type { GardenFields } from "./schema";

export type Layer = { kind: AmbienceKind; colors: string[]; count?: number };

export type Garden = {
  dark: boolean;
  /** The sky, top to bottom, behind the gate and the meadow. */
  sky: string;
  /** The colour the sky ends on, for joining one section to the next. */
  skyLow: string;
  /** Three bands of land: far hills, the hedge behind the beds, the beds themselves. */
  land: { far: string; mid: string; near: string; nearDeep: string };
  /** The path underfoot. */
  soil: string;
  ink: string;
  inkSoft: string;
  /** The sketchbook page the walk starts on. */
  paper: string;
  paperRule: string;
  /** The card the letter is written on, inside the greenhouse. */
  card: string;
  cardInk: string;
  cardDark: boolean;
  wood: string;
  woodDeep: string;
  iron: string;
  /** Greenhouse glass: the pane, its frame, and the light coming through it. */
  glass: string;
  frame: string;
  glow: string;
  /** Washi tape for the photos on the trellis. */
  tapes: string[];
  matte: string;
  ribbon: string;
  ribbonDeep: string;
  tagPaper: string;
  tagInk: string;
  accent: string;
  cover: CoverTone;
  stickers: StickerPlacement[];
  petals: string[];
  ambience: Layer[];
};

export const GARDENS: Record<GardenFields["garden"], Garden> = {
  blush: {
    dark: false,
    sky: "linear-gradient(180deg,#FBF2E6 0%,#F8E7DB 46%,#F1D6CF 100%)",
    skyLow: "#F1D6CF",
    land: { far: "#D8DFC2", mid: "#B3C79D", near: "#8BA877", nearDeep: "#6B8A5C" },
    soil: "#D8C3A6",
    ink: "#3C2A2A",
    inkSoft: "rgba(60,42,42,.58)",
    paper: "#FBF3E6",
    paperRule: "rgba(112,84,60,.18)",
    card: "#FFFCF6",
    cardInk: "#33271F",
    cardDark: false,
    wood: "#CB9E6E",
    woodDeep: "#96673F",
    iron: "#6F6459",
    glass: "rgba(255,250,236,.30)",
    frame: "#E8DCC6",
    glow: "rgba(255,226,175,.55)",
    tapes: ["rgba(240,178,190,.72)", "rgba(226,206,172,.78)", "rgba(190,212,190,.7)"],
    matte: "#FFFDF8",
    ribbon: "#E28CA0",
    ribbonDeep: "#B45F77",
    tagPaper: "#FFF7EC",
    tagInk: "#4A2B33",
    accent: "#C8475A",
    cover: { page: "#F5E1D8", glow: ["rgba(255,246,224,.95)", "rgba(240,186,186,.45)"], accent: "#B4485C" },
    stickers: [
      { id: "butterfly", x: 87, y: 15, size: 13, rotate: 12 },
      { id: "sparkle", x: 10, y: 13, size: 8 },
      { id: "daisy", x: 7, y: 47, size: 11 },
      { id: "sparkle", x: 93, y: 49, size: 7 },
      { id: "bow", x: 12, y: 79, size: 12, rotate: -10 },
      { id: "heart", x: 90, y: 78, size: 11, rotate: 12 },
    ],
    petals: ["#F8CBD5", "#FFFFFF", "#FBDCC6"],
    ambience: [
      { kind: "petals", colors: ["#F8CBD5", "#FFFFFF", "#FBDCC6"], count: 12 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 },
    ],
  },
  wild: {
    dark: false,
    sky: "linear-gradient(180deg,#F3F1E0 0%,#E7EBD4 48%,#D6E0C1 100%)",
    skyLow: "#D6E0C1",
    land: { far: "#CBD5B0", mid: "#A4B98A", near: "#7C9668", nearDeep: "#5D7A50" },
    soil: "#CDBB94",
    ink: "#2F3327",
    inkSoft: "rgba(47,51,39,.58)",
    paper: "#F8F3E3",
    paperRule: "rgba(90,96,66,.18)",
    card: "#FFFDF4",
    cardInk: "#2C3025",
    cardDark: false,
    wood: "#C0A071",
    woodDeep: "#8C6C43",
    iron: "#5F6857",
    glass: "rgba(248,255,238,.28)",
    frame: "#E4E2CB",
    glow: "rgba(255,236,178,.5)",
    tapes: ["rgba(214,205,164,.8)", "rgba(196,216,186,.72)", "rgba(232,186,158,.7)"],
    matte: "#FFFDF6",
    ribbon: "#C8563F",
    ribbonDeep: "#96351F",
    tagPaper: "#FBF4E2",
    tagInk: "#3A3A28",
    accent: "#C8563F",
    cover: { page: "#E4EAD2", glow: ["rgba(255,250,222,.95)", "rgba(178,200,150,.45)"], accent: "#4A6B3E" },
    stickers: [
      { id: "leaf", x: 88, y: 14, size: 13, rotate: 16 },
      { id: "sparkle", x: 10, y: 13, size: 8 },
      { id: "daisy", x: 7, y: 47, size: 12 },
      { id: "butterfly", x: 93, y: 48, size: 12, rotate: -8 },
      { id: "squiggle", x: 12, y: 80, size: 11 },
      { id: "heart", x: 90, y: 78, size: 11, rotate: 12 },
    ],
    petals: ["#FFFFFF", "#F4D8A8", "#E8A9A0"],
    ambience: [
      { kind: "dust", colors: ["#FFF3D2", "#FFFFFF"], count: 16 },
      { kind: "petals", colors: ["#FFFFFF", "#F4D8A8"], count: 8 },
    ],
  },
  dusk: {
    dark: false,
    sky: "linear-gradient(180deg,#FBE6C4 0%,#F4C79C 44%,#DFA07E 100%)",
    skyLow: "#DFA07E",
    land: { far: "#C7A582", mid: "#9B8460", near: "#6E6B4B", nearDeep: "#4F5238" },
    soil: "#C6A77F",
    ink: "#3A2820",
    inkSoft: "rgba(58,40,32,.6)",
    paper: "#F9ECD8",
    paperRule: "rgba(120,80,48,.2)",
    card: "#FFF8EA",
    cardInk: "#3A2820",
    cardDark: false,
    wood: "#B98450",
    woodDeep: "#87552C",
    iron: "#5E4C3E",
    glass: "rgba(255,226,170,.32)",
    frame: "#E7CFA6",
    glow: "rgba(255,196,120,.6)",
    tapes: ["rgba(236,192,140,.78)", "rgba(216,164,132,.74)", "rgba(196,178,146,.72)"],
    matte: "#FFFAF0",
    ribbon: "#D98A4E",
    ribbonDeep: "#A05A26",
    tagPaper: "#FFF3DE",
    tagInk: "#472E20",
    accent: "#D4772F",
    cover: { page: "#F2C79D", glow: ["rgba(255,236,190,.95)", "rgba(224,150,102,.5)"], accent: "#96451F" },
    stickers: [
      { id: "sparkle", x: 88, y: 14, size: 9 },
      { id: "cloud", x: 12, y: 13, size: 16 },
      { id: "leaf", x: 7, y: 47, size: 12, rotate: -18 },
      { id: "sparkle", x: 93, y: 48, size: 7 },
      { id: "daisy", x: 12, y: 80, size: 11 },
      { id: "heart", x: 90, y: 78, size: 11, rotate: 12 },
    ],
    petals: ["#FFE1B0", "#FFFFFF", "#F0B48C"],
    ambience: [
      { kind: "dust", colors: ["#FFE0A8", "#FFFFFF"], count: 20 },
      { kind: "sparkles", colors: ["#FFEFC4", "#FFFFFF"], count: 12 },
    ],
  },
  moonlit: {
    dark: true,
    sky: "linear-gradient(180deg,#25375A 0%,#182742 48%,#0D1626 100%)",
    skyLow: "#0D1626",
    land: { far: "#1F3150", mid: "#1A2A42", near: "#152435", nearDeep: "#0E1A28" },
    soil: "#2A3A4E",
    ink: "#F2EADE",
    inkSoft: "rgba(242,234,222,.62)",
    paper: "#213048",
    paperRule: "rgba(242,234,222,.16)",
    card: "#22324C",
    cardInk: "#F2EADE",
    cardDark: true,
    wood: "#6C6552",
    woodDeep: "#463F31",
    iron: "#8E99A8",
    glass: "rgba(180,214,255,.16)",
    frame: "#3A4A63",
    glow: "rgba(180,206,255,.4)",
    tapes: ["rgba(148,176,214,.5)", "rgba(206,196,164,.42)", "rgba(180,160,196,.45)"],
    matte: "#F6F1E6",
    ribbon: "#C9B37E",
    ribbonDeep: "#8E7A47",
    tagPaper: "#2C3E5C",
    tagInk: "#F2EADE",
    accent: "#C9B37E",
    cover: { page: "#182742", glow: ["rgba(255,226,170,.26)", "rgba(80,110,160,.55)"], accent: "#F2EADE", dark: true },
    stickers: [
      { id: "moon", x: 88, y: 13, size: 15 },
      { id: "star", x: 11, y: 12, size: 10, rotate: -10 },
      { id: "sparkle", x: 7, y: 47, size: 9 },
      { id: "star", x: 93, y: 48, size: 8, rotate: 14 },
      { id: "daisy", x: 12, y: 80, size: 11 },
      { id: "heart", x: 90, y: 78, size: 11, rotate: 12 },
    ],
    petals: ["#FFFFFF", "#D8E6FF", "#F3E2B8"],
    ambience: [
      { kind: "sparkles", colors: ["#FFF3C4", "#CFE3FF"], count: 22 },
      { kind: "dust", colors: ["#CFE3FF", "#FFFFFF"], count: 12 },
    ],
  },
};

/** What fills the beds, by the mix the sender picks. Drawn with the Bouquet template's flowers. */
export type Bed = { id: FlowerId; color: string; size: number };

export const MIXES: Record<GardenFields["blooms"], Bed[]> = {
  wildflowers: [
    { id: "cosmos", color: "pink", size: 1 },
    { id: "poppy", color: "red", size: 0.95 },
    { id: "daisy", color: "white", size: 0.8 },
    { id: "cosmos", color: "white", size: 0.9 },
    { id: "lavender", color: "purple", size: 1 },
    { id: "poppy", color: "orange", size: 0.9 },
    { id: "daisy", color: "pink", size: 0.78 },
    { id: "fern", color: "green", size: 1 },
  ],
  roses: [
    { id: "rose", color: "red", size: 1 },
    { id: "rose", color: "blush", size: 0.95 },
    { id: "rose", color: "white", size: 0.9 },
    { id: "gypsophila", color: "white", size: 1 },
    { id: "rose", color: "peach", size: 0.92 },
    { id: "eucalyptus", color: "sage", size: 1 },
    { id: "rose", color: "yellow", size: 0.88 },
    { id: "gypsophila", color: "white", size: 0.9 },
  ],
  peonies: [
    { id: "peony", color: "blush", size: 1.05 },
    { id: "peony", color: "coral", size: 1 },
    { id: "ranunculus", color: "peach", size: 0.85 },
    { id: "peony", color: "white", size: 1 },
    { id: "ranunculus", color: "cream", size: 0.8 },
    { id: "eucalyptus", color: "sage", size: 1 },
    { id: "peony", color: "magenta", size: 0.95 },
    { id: "fern", color: "green", size: 1 },
  ],
  sunflowers: [
    { id: "sunflower", color: "yellow", size: 1.1 },
    { id: "ranunculus", color: "orange", size: 0.85 },
    { id: "daisy", color: "white", size: 0.8 },
    { id: "sunflower", color: "yellow", size: 0.95 },
    { id: "tulip", color: "yellow", size: 0.9 },
    { id: "eucalyptus", color: "sage", size: 1 },
    { id: "ranunculus", color: "cream", size: 0.82 },
    { id: "fern", color: "green", size: 1 },
  ],
};
