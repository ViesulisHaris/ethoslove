import type { AmbienceKind } from "../_shared/Ambience";
import type { Print } from "../_shared/collage/paper";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "blush" | "cherry" | "lilac" | "blue" | "butter" | "sage" | "rouge" | "pressed" | "bow";
/** Where a flower goes on the page; each look puts its own flower there. */
export type Slot = "spray" | "small" | "gold" | "lily" | "hibiscus" | "plumeria" | "soft" | "star" | "pale" | "coral";

/**
 * The cut-outs on the page that aren't flowers: the bow by the name, what lies behind the photo
 * strip, the heart and the star by the scattered photos, and the two who cuddle.
 */
export type Trinkets = { bow: ScrapId; doily: ScrapId; heart: ScrapId; star: ScrapId; plush: ScrapId };

/** The ones the first six looks share, recoloured by each look's `tint` where it has one. */
export const TRINKETS: Trinkets = { bow: "bow-gingham", doily: "doily-pink", heart: "heart-print-pink", star: "star-felt", plush: "cats-cuddle" };

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
  /**
   * The same for the flowers, for a look with no cut-outs of its own colour: the pink lilies and
   * blossoms turned lilac, butter yellow, cherry or white with sage shading. Blue has real blue
   * flowers and needs none.
   */
  bloom?: string;
  flowers: Record<Slot, ScrapId>;
  /**
   * What the page is printed with, gingham unless the look says otherwise. The last three looks
   * change it with everything else, so a page in one of them shares no piece with the first six:
   * a screen recording of each is its own picture, not a recolouring of one.
   */
  print?: Print;
  /** Their own bow, doily, heart, star and plush, for a look that doesn't recolour the first six's. */
  trinkets?: Trinkets;
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

/**
 * Butter yellow from pink. A hue-rotate turns pink petals olive and brown, so this goes through
 * grey and sepia first: every flower keeps its own light and shade, now in one sunny yellow.
 */
const SUNNY = "grayscale(1) sepia(1) saturate(2.6) hue-rotate(-4deg) brightness(1.18)";

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
  cherry: {
    wall: "#FFE4E7",
    check: "rgba(208,40,62,.26)",
    scriptPaper: "#EC98A5",
    scriptInk: "rgba(118,10,30,.55)",
    paper: "#FFF8F7",
    ink: "#480B17",
    frame: "#FFFFFF",
    frameCheck: "rgba(200,34,56,.40)",
    satin: { light: "#FFC8D0", mid: "#DE4760", deep: "#9B1027" },
    card: { card: "#FFD0D6", ink: "#380711", soft: "#983F4F", bar: "#C01C37" },
    tape: "#F2A1AC",
    tint: "hue-rotate(-14deg) saturate(1.45)",
    bloom: "hue-rotate(-12deg) saturate(1.4) brightness(.96)",
    flowers: { spray: "columbine", small: "sakura", gold: "blossom-gold", lily: "lily-pink", hibiscus: "hibiscus-pink", plumeria: "plumeria-pink", soft: "lily-blush", star: "lily-stargazer", pale: "blossom-pale", coral: "hibiscus-coral" },
    ambience: [{ kind: "petals", colors: ["#FFC8D0", "#FFFFFF", "#EC98A5"], count: 12 }],
    confetti: ["#DE4760", "#FFFFFF", "#FFC8D0", "#9B1027"],
  },
  lilac: {
    wall: "#F2EAF9",
    check: "rgba(165,125,215,.30)",
    scriptPaper: "#C9B2E6",
    scriptInk: "rgba(80,40,110,.55)",
    paper: "#FDFAFF",
    ink: "#38204E",
    frame: "#FFFFFF",
    frameCheck: "rgba(160,115,210,.42)",
    satin: { light: "#EADCF8", mid: "#B793DF", deep: "#76499F" },
    card: { card: "#E7D8F6", ink: "#2B163D", soft: "#7B5C9A", bar: "#8B5FB7" },
    tape: "#CDB4EA",
    tint: "hue-rotate(-55deg) saturate(.8)",
    bloom: "hue-rotate(-48deg) saturate(.85)",
    flowers: { spray: "columbine", small: "sakura", gold: "blossom-gold", lily: "lily-pink", hibiscus: "hibiscus-pink", plumeria: "plumeria-pink", soft: "lily-blush", star: "lily-stargazer", pale: "blossom-pale", coral: "hibiscus-coral" },
    ambience: [{ kind: "petals", colors: ["#EADCF8", "#FFFFFF", "#C9B2E6"], count: 12 }],
    confetti: ["#B793DF", "#FFFFFF", "#EADCF8", "#76499F"],
  },
  butter: {
    wall: "#FFF5D6",
    check: "rgba(232,184,52,.30)",
    scriptPaper: "#F1D580",
    scriptInk: "rgba(105,76,8,.55)",
    paper: "#FFFDF3",
    ink: "#47360E",
    frame: "#FFFFFF",
    frameCheck: "rgba(226,176,44,.42)",
    satin: { light: "#FFEFB3", mid: "#EFC651", deep: "#B38416" },
    card: { card: "#FBE9A9", ink: "#382A07", soft: "#8A7231", bar: "#C6962A" },
    tape: "#F4DA86",
    tint: SUNNY,
    bloom: SUNNY,
    flowers: { spray: "columbine", small: "sakura", gold: "blossom-gold", lily: "lily-pink", hibiscus: "hibiscus-pink", plumeria: "plumeria-pink", soft: "lily-blush", star: "lily-stargazer", pale: "blossom-pale", coral: "hibiscus-coral" },
    ambience: [{ kind: "petals", colors: ["#FFEFB3", "#FFFFFF", "#F1D580"], count: 12 }],
    confetti: ["#EFC651", "#FFFFFF", "#FFEFB3", "#B38416"],
  },
  sage: {
    wall: "#EBF1E6",
    check: "rgba(118,150,108,.28)",
    scriptPaper: "#C1D1B3",
    scriptInk: "rgba(38,58,32,.55)",
    paper: "#FFFFFA",
    ink: "#24331E",
    frame: "#FFFFFF",
    frameCheck: "rgba(108,142,98,.40)",
    satin: { light: "#E1EBD8", mid: "#A6BD95", deep: "#5B784F" },
    card: { card: "#DAE6CF", ink: "#1C2917", soft: "#5D7352", bar: "#6C895F" },
    tape: "#C3D4B5",
    tint: "grayscale(1) sepia(.5) hue-rotate(45deg) saturate(1.5) brightness(1.02)",
    bloom: "grayscale(1) sepia(.35) hue-rotate(50deg) saturate(1.3) brightness(1.28) contrast(.9)",
    flowers: { spray: "columbine", small: "sakura", gold: "blossom-gold", lily: "lily-pink", hibiscus: "hibiscus-pink", plumeria: "plumeria-pink", soft: "lily-blush", star: "lily-stargazer", pale: "blossom-pale", coral: "hibiscus-coral" },
    ambience: [{ kind: "petals", colors: ["#FFFFFF", "#E1EBD8", "#C1D1B3"], count: 12 }],
    confetti: ["#A6BD95", "#FFFFFF", "#E1EBD8", "#5B784F"],
  },
  // The three below have their own flowers and trinkets and print, not a filter over Blush's.
  rouge: {
    wall: "#F8EFE9",
    check: "rgba(150,26,48,.22)",
    scriptPaper: "#E4BCC2",
    scriptInk: "rgba(96,14,30,.55)",
    paper: "#FFFBF8",
    ink: "#3E0D17",
    frame: "#FFFFFF",
    frameCheck: "rgba(150,26,48,.34)",
    satin: { light: "#EBA9B4", mid: "#A51E3A", deep: "#5C0C1C" },
    card: { card: "#F3D6DA", ink: "#330A13", soft: "#8A3946", bar: "#A51E3A" },
    tape: "#E6B4BB",
    print: "stripes",
    flowers: { spray: "orchid-spray-wine", small: "carnation-picotee", gold: "ranunculus-plum", lily: "lily-wine", hibiscus: "rose-oxblood", plumeria: "cosmos-chocolate", soft: "magnolia-wine", star: "tulip-parrot-wine", pale: "poppy-wine", coral: "dahlia-wine" },
    trinkets: { bow: "wax-seal-heart", doily: "doily-red", heart: "heart-damask", star: "brooch-heart", plush: "teddy-hug" },
    ambience: [{ kind: "petals", colors: ["#EBA9B4", "#FFFFFF", "#A51E3A"], count: 12 }],
    confetti: ["#A51E3A", "#FFFFFF", "#EBA9B4", "#5C0C1C"],
  },
  pressed: {
    wall: "#ECE1CE",
    check: "rgba(126,92,56,.22)",
    scriptPaper: "#D9C6A6",
    scriptInk: "rgba(74,50,24,.6)",
    paper: "#FCF7EC",
    ink: "#3B2A1A",
    frame: "#FCF7EC",
    frameCheck: "rgba(126,92,56,.34)",
    satin: { light: "#EEDDC4", mid: "#BC9364", deep: "#6F4C2B" },
    card: { card: "#E6D6BB", ink: "#2E2012", soft: "#7A5E3E", bar: "#9A6E43" },
    tape: "#DCC9A8",
    print: "dots",
    flowers: { spray: "dried-flowers", small: "paper-blossom", gold: "peony-kraft", lily: "roses-kraft", hibiscus: "sunflowers-kraft", plumeria: "leaf-skeleton", soft: "tulips-wrapped", star: "paper-roses", pale: "wax-seal-hibiscus", coral: "paper-couple" },
    trinkets: { bow: "bow-satin-blush", doily: "fan-lace", heart: "plaid-heart", star: "locket", plush: "teddy" },
    ambience: [{ kind: "petals", colors: ["#EEDDC4", "#FFFFFF", "#D9C6A6"], count: 12 }],
    confetti: ["#BC9364", "#FFFFFF", "#EEDDC4", "#6F4C2B"],
  },
  bow: {
    wall: "#FBE4EA",
    check: "rgba(34,16,22,.15)",
    scriptPaper: "#EFB8C8",
    scriptInk: "rgba(60,20,34,.55)",
    paper: "#FFF9FA",
    ink: "#2A1219",
    frame: "#FFFFFF",
    frameCheck: "rgba(34,16,22,.26)",
    satin: { light: "#8A7D82", mid: "#2C2428", deep: "#0A0708" },
    card: { card: "#F6D3DE", ink: "#2A1219", soft: "#8E5468", bar: "#2C2428" },
    tape: "#F2B6C8",
    print: "dots",
    flowers: { spray: "rose-black-large", small: "rose-black-small", gold: "hibiscus-ruffle", lily: "tulips-pink", hibiscus: "rose-black", plumeria: "plumeria-rose", soft: "carnation-picotee", star: "rose-ember", pale: "butterfly-black", coral: "lollipop-heart" },
    trinkets: { bow: "bow-lace-black", doily: "heart-pillow-black", heart: "brooch-heart-silver", star: "star-glossy", plush: "cats-nose" },
    ambience: [{ kind: "petals", colors: ["#FFD1DF", "#FFFFFF", "#F2A5BD"], count: 12 }],
    confetti: ["#2C2428", "#FFFFFF", "#F7B8CB", "#E07FA0"],
  },
};

/** Which photos go where: the first is the hero, the next three fill the strip, the rest scatter. */
export function arrangePhotos<T>(photos: T[]): { hero: T | undefined; strip: T[]; scatter: T[] } {
  return { hero: photos[0], strip: photos.slice(1, 4), scatter: photos.slice(4, 10) };
}

/** How tall a gingham strip of `n` photos stands. */
export const stripHeight = (n: number): number => (n === 0 ? 0 : 2.4 + n * 40.7 + 6);

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the satin. */
export const LOOK_ORDER: LookId[] = ["blush", "cherry", "lilac", "blue", "butter", "sage", "rouge", "pressed", "bow"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].satin.mid }])) as Record<LookId, { page: string; paper: string; accent: string }>;
