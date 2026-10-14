import type { AmbienceKind } from "../_shared/Ambience";

export type LookId = "pumpkin" | "pink" | "midnight";

/** The colours a drawing is painted in: a pumpkin's flesh, its light side, its shadow, its stem and leaf. */
export type PumpkinPaint = { body: string; light: string; deep: string; stem: string; leaf: string };

export type Look = {
  /** The page, and the faded print of pumpkins, ghosts and bats over it. */
  wall: string;
  print: { pumpkin: PumpkinPaint; ghost: string; ghostLine: string; bat: string; star: string; opacity: number };
  /** Words written straight on the page: the heading, the scroll hint. */
  wallInk: string;
  /** Polaroids, the note and the letter, and their ink. */
  paper: string;
  ink: string;
  accent: string;
  ghost: { body: string; shade: string; line: string; eye: string; blush: string };
  cat: { fur: string; sheen: string; eye: string; pupil: string; nose: string };
  pumpkin: PumpkinPaint;
  bat: string;
  star: string;
  card: { card: string; ink: string; soft: string; bar: string };
  /** Whether that card is dark, for what sits on it (the surprise). */
  cardDark: boolean;
  tape: string;
  dark: boolean;
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

const PUMPKIN: PumpkinPaint = { body: "#F08A3C", light: "#F9B878", deep: "#C9581F", stem: "#6B7A3A", leaf: "#8FA34E" };

export const LOOKS: Record<LookId, Look> = {
  pumpkin: {
    wall: "#FBF6EE",
    print: { pumpkin: { body: "#F3A267", light: "#FBCB9C", deep: "#DB7A3C", stem: "#8C9455", leaf: "#A9B56E" }, ghost: "#FFFFFF", ghostLine: "#D9D0C8", bat: "#7B6F78", star: "#D9573B", opacity: 0.82 },
    wallInk: "#4A2A1A",
    paper: "#FFFDF9",
    ink: "#2E2420",
    accent: "#E8742A",
    ghost: { body: "#FFFFFF", shade: "#E9E3EE", line: "#CFC6D4", eye: "#2B2430", blush: "#F6A8B6" },
    cat: { fur: "#17131C", sheen: "#3A3343", eye: "#FFFDF4", pupil: "#17131C", nose: "#F29BB0" },
    pumpkin: PUMPKIN,
    bat: "#3E3542",
    star: "#D9573B",
    card: { card: "#FFE6CC", ink: "#3A1F10", soft: "#9A5B2E", bar: "#E8742A" },
    cardDark: false,
    tape: "#F4B183",
    dark: false,
    ambience: [{ kind: "bats", colors: ["#3E3542", "#6E6270"], count: 4 }],
    confetti: ["#E8742A", "#17131C", "#FFFFFF", "#F9B878", "#D9573B"],
  },
  pink: {
    wall: "#FCEBF0",
    print: { pumpkin: { body: "#F6A9BE", light: "#FCD3DE", deep: "#E07B98", stem: "#9C8C6A", leaf: "#B9B98A" }, ghost: "#FFFFFF", ghostLine: "#EBC9D3", bat: "#B48496", star: "#E46D93", opacity: 0.85 },
    wallInk: "#6B2A45",
    paper: "#FFFDFB",
    ink: "#4A2235",
    accent: "#E0679A",
    ghost: { body: "#FFFFFF", shade: "#F7E4EC", line: "#EBC6D4", eye: "#4A2235", blush: "#FF9DBA" },
    cat: { fur: "#1E1620", sheen: "#43354A", eye: "#FFF8FB", pupil: "#1E1620", nose: "#FF9DBA" },
    pumpkin: { body: "#F59AB4", light: "#FCC9D8", deep: "#D9668A", stem: "#7D8A50", leaf: "#A7B56B" },
    bat: "#5B3A4C",
    star: "#E46D93",
    card: { card: "#FFD8E5", ink: "#4A2235", soft: "#A8587A", bar: "#E0679A" },
    cardDark: false,
    tape: "#F7B6CB",
    dark: false,
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#F7A9C2"], count: 10 }],
    confetti: ["#E0679A", "#FFFFFF", "#FCC9D8", "#1E1620", "#F6A9BE"],
  },
  midnight: {
    wall: "#1D1A2C",
    print: { pumpkin: { body: "#E8792E", light: "#F6AE6A", deep: "#B4511C", stem: "#5E6A35", leaf: "#7D8F45" }, ghost: "#F3EEFB", ghostLine: "#8E86A8", bat: "#0E0C16", star: "#F2C14E", opacity: 0.5 },
    wallInk: "#F4EEFF",
    paper: "#FBF7F0",
    ink: "#2A2233",
    accent: "#F28C28",
    ghost: { body: "#FBF9FF", shade: "#DCD5EC", line: "#B9B0D0", eye: "#231C2C", blush: "#F6A8B6" },
    cat: { fur: "#0C0A12", sheen: "#2E2838", eye: "#FFE9A8", pupil: "#0C0A12", nose: "#F29BB0" },
    pumpkin: PUMPKIN,
    bat: "#0E0C16",
    star: "#F2C14E",
    card: { card: "#2A2540", ink: "#F4EEFF", soft: "#B9B0D0", bar: "#F28C28" },
    cardDark: true,
    tape: "#7B6AA8",
    dark: true,
    ambience: [
      { kind: "bats", colors: ["#0E0C16", "#2A2540"], count: 5 },
      { kind: "sparkles", colors: ["#F4EEFF", "#F2C14E"], count: 10 },
    ],
    confetti: ["#F28C28", "#F4EEFF", "#F2C14E", "#0E0C16"],
  },
};

/**
 * The polaroids on the first screen, by how many photos there are, in `--p` from the section's
 * top-left: centre, width and tilt. Four is the picture the template is drawn for (a zigzag down
 * the screen, as a Pinterest frame lays them); with fewer, the empty places go to the note.
 */
export type Spot = { x: number; y: number; w: number; rotate: number };
export const HERO_SPOTS: Record<1 | 2 | 3 | 4, Spot[]> = {
  1: [{ x: 50, y: 76, w: 66, rotate: -3 }],
  2: [
    { x: 68, y: 50, w: 52, rotate: 5 },
    { x: 34, y: 116, w: 54, rotate: -4 },
  ],
  3: [
    { x: 71, y: 38, w: 44, rotate: 5 },
    { x: 31, y: 79, w: 46, rotate: -5 },
    { x: 68, y: 121, w: 46, rotate: 4 },
  ],
  4: [
    { x: 71, y: 38, w: 44, rotate: 5 },
    { x: 31, y: 79, w: 46, rotate: -5 },
    { x: 68, y: 121, w: 46, rotate: 4 },
    { x: 32, y: 163, w: 44, rotate: -3 },
  ],
};

/**
 * Where the note sits on the first screen when it takes an empty polaroid's place. The note is a
 * card of fixed size (NOTE_ASPECT), so the cat can lie along its top edge as it does on a photo.
 */
export const NOTE_SPOTS: Record<1 | 2 | 3, Spot> = {
  1: { x: 48, y: 150, w: 54, rotate: 2 },
  2: { x: 66, y: 170, w: 48, rotate: 3 },
  3: { x: 32, y: 160, w: 44, rotate: -3 },
};
export const NOTE_ASPECT = 0.9;

/** How a polaroid of width `w` stands, in `--p`: the frame, a 0.94 picture and the 9 of lip under it. */
export const polaroidHeight = (w: number): number => 2.4 + (w - 4.8) / 0.94 + 9;

/**
 * A top corner of a tilted card, in `--p`: where its top edge meets its side, after the tilt about
 * its centre. `h` is the card's height.
 */
export function topCorner(spot: Spot, h: number, side: "left" | "right"): { x: number; y: number } {
  const dx = ((side === "right" ? 1 : -1) * spot.w) / 2;
  const dy = -h / 2;
  const a = (spot.rotate * Math.PI) / 180;
  return { x: spot.x + dx * Math.cos(a) - dy * Math.sin(a), y: spot.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/**
 * Where the cat goes to lie on a card's top edge with its tail hanging past the right corner: its
 * centre and tilt, for a cat `w` wide. The drawing is 220 × 150 with the edge at 68 and the tail's
 * root at 178 of the 220.
 */
export function catOn(spot: Spot, h: number, w: number): Spot {
  const corner = topCorner(spot, h, "right");
  const a = (spot.rotate * Math.PI) / 180;
  // The tail's root sits a little inside the corner, so the tail hangs down the card's own edge and
  // never over a neighbouring caption.
  const along = -(178 / 220 - 0.5) * w - 3;
  const down = ((w * 150) / 220) * (0.5 - 68 / 150);
  return { x: corner.x + along * Math.cos(a) - down * Math.sin(a), y: corner.y + along * Math.sin(a) + down * Math.cos(a), w, rotate: spot.rotate };
}

/** A drawn thing on the first screen, placed by its centre in `--p`. */
export type Deco = { kind: "pumpkin" | "ghost" | "bat" | "star"; x: number; y: number; w: number; rotate?: number };

/**
 * The drawings round the polaroids, by how many photos there are: the pumpkin on the first photo's
 * corner, the ghost in the gap on the right, bats and stars in what is left, pumpkins at the foot.
 */
export const HERO_DECO: Record<1 | 2 | 3 | 4, Deco[]> = {
  1: [
    { kind: "ghost", x: 84, y: 22, w: 17 },
    { kind: "pumpkin", x: 19, y: 112, w: 21, rotate: -8 },
    { kind: "bat", x: 89, y: 124, w: 12, rotate: 14 },
    { kind: "pumpkin", x: 85, y: 168, w: 18, rotate: 8 },
    { kind: "star", x: 55, y: 24, w: 4.2 },
    { kind: "star", x: 9, y: 140, w: 3.8 },
    { kind: "star", x: 92, y: 100, w: 3.6 },
  ],
  2: [
    { kind: "pumpkin", x: 40, y: 80, w: 20, rotate: -8 },
    { kind: "ghost", x: 84, y: 112, w: 18 },
    { kind: "bat", x: 15, y: 46, w: 14, rotate: -12 },
    { kind: "pumpkin", x: 18, y: 176, w: 18, rotate: -6 },
    { kind: "star", x: 52, y: 20, w: 4.2 },
    { kind: "star", x: 93, y: 88, w: 3.8 },
    { kind: "star", x: 9, y: 156, w: 3.6 },
  ],
  3: [
    { kind: "pumpkin", x: 47, y: 62, w: 19, rotate: -8 },
    { kind: "ghost", x: 81, y: 78, w: 16 },
    { kind: "bat", x: 14, y: 44, w: 14, rotate: -12 },
    { kind: "bat", x: 92, y: 98, w: 9, rotate: 14 },
    { kind: "pumpkin", x: 80, y: 176, w: 19, rotate: 8 },
    { kind: "star", x: 54, y: 20, w: 4.2 },
    { kind: "star", x: 94, y: 140, w: 3.6 },
    { kind: "star", x: 7, y: 120, w: 3.6 },
  ],
  4: [
    { kind: "pumpkin", x: 47, y: 62, w: 19, rotate: -8 },
    { kind: "ghost", x: 81, y: 78, w: 16 },
    { kind: "bat", x: 14, y: 44, w: 14, rotate: -12 },
    { kind: "bat", x: 92, y: 98, w: 9, rotate: 14 },
    { kind: "pumpkin", x: 80, y: 176, w: 19, rotate: 8 },
    { kind: "star", x: 54, y: 20, w: 4.2 },
    { kind: "star", x: 94, y: 140, w: 3.6 },
    { kind: "star", x: 7, y: 120, w: 3.6 },
  ],
};

/** How tall the first screen's section stands, and where its scroll hint sits, by photo count. */
export const HERO_HEIGHT: Record<1 | 2 | 3 | 4, number> = { 1: 186, 2: 200, 3: 196, 4: 196 };
export const SCROLL_AT: Record<1 | 2 | 3 | 4, { x: number; y: number }> = { 1: { x: 86, y: 132 }, 2: { x: 15, y: 150 }, 3: { x: 84, y: 150 }, 4: { x: 84, y: 150 } };

/** Which photos go where: up to four on the first screen, the rest further down. */
export function arrangePhotos<T>(photos: T[]): { hero: T[]; scatter: T[] } {
  return { hero: photos.slice(0, 4), scatter: photos.slice(4, 10) };
}

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["pumpkin", "pink", "midnight"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
