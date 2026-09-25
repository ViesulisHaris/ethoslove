import { mulberry32 } from "../_shared/random";
import type { MemeId } from "../_shared/memes/catalogue";

/**
 * The page is one column 100 `--p` wide that scrolls, cut into sections stacked top to bottom:
 * the headline over the first photo, the rest of the photos, the song, the guest list, the cake
 * and the letter. Everything on it is placed by its middle, in `--p`, from its section's top-left
 * corner. This file says where the photos and the guests go; the drawing lives in art.tsx.
 */

/** The ten guests, in the order the sender's lines go to them: the first line to the first guest. */
export const GUESTS: MemeId[] = ["party-yell", "green-hat-kitten", "puppies", "hamster-cake", "sad-hamster", "balloon-cat", "hamster-slice", "party-kitten", "ferrets", "puppy"];

export const MAX_PHOTOS = 7;

export type PhotoPlan = { hero?: number; word?: number; strip: number[]; loose: number[] };

/**
 * Which frame each photo lands in: the first under the headline, the second on the polaroid with
 * the word, two to four in the booth strip, and a seventh (or a lone third) on a polaroid of its own.
 */
export function arrangePhotos(count: number): PhotoPlan {
  const n = Math.max(0, Math.min(MAX_PHOTOS, Math.floor(count)));
  const strip = n >= 4 ? Array.from({ length: Math.min(4, n - 2) }, (_, i) => 2 + i) : [];
  const loose = n === 3 ? [2] : n === 7 ? [6] : [];
  return { hero: n >= 1 ? 0 : undefined, word: n >= 2 ? 1 : undefined, strip, loose };
}

/** How tall the booth strip stands, in `--p`: a margin, the frames and the gaps, and the foot. */
export const stripHeight = (cells: number): number => (cells <= 0 ? 0 : 2.2 + cells * 20 + (cells - 1) * 1.6 + 8);

/** Where the strip starts in the photos section, and where each of its frames is centred. */
export const STRIP_TOP = 94;
export const stripCellY = (i: number): number => STRIP_TOP + 2.2 + i * 21.6 + 10;

/** The photos section's height for a plan, so the section can make room. */
export function photosHeight(plan: PhotoPlan): number {
  if (plan.word === undefined) return 0;
  if (plan.strip.length) return Math.max(STRIP_TOP + stripHeight(plan.strip.length) + (plan.loose.length ? 58 : 14), 150);
  if (plan.loose.length) return 156;
  return 100;
}

export type Section = "hero" | "photos" | "song" | "list" | "cake" | "letter";
export type Move = "jump" | "spin" | "zoom" | "wiggle";
export type Idle = "bob" | "tilt" | "squish";
export type Voice = "squeak" | "chirp" | "boing" | "honk";

export type GuestSpot = {
  id: MemeId;
  /** Which of the sender's lines this guest yells: its place in GUESTS. */
  index: number;
  section: Section;
  x: number;
  y: number;
  w: number;
  rotate: number;
  z: number;
  move: Move;
  idle: Idle;
  voice: Voice;
  pace: number;
  phase: number;
  /** Which way the speech bubble leans, and whether it hangs under the guest instead of over it. */
  side: "left" | "middle" | "right";
  below: boolean;
};

type Spot = { x: number; y: number; w: number; rotate: number; z?: number; below?: boolean };

const VOICES: Partial<Record<MemeId, Voice>> = { ferrets: "honk", "party-yell": "honk", puppies: "boing", puppy: "boing", "hamster-cake": "squeak", "hamster-slice": "squeak", "sad-hamster": "squeak" };
const MOVES: Move[] = ["jump", "spin", "zoom", "wiggle"];
const IDLES: Idle[] = ["bob", "tilt", "squish"];

/** Where each guest stands when its own section is on the page. */
function homeSpot(id: MemeId, plan: PhotoPlan): { section: Section; spot: Spot } | null {
  switch (id) {
    case "party-yell":
      return { section: "hero", spot: { x: 12.5, y: 74, w: 27, rotate: -9, z: 12 } };
    case "green-hat-kitten":
      return { section: "hero", spot: { x: 9, y: 118, w: 11.5, rotate: 5, z: 12 } };
    case "puppies":
      return { section: "hero", spot: { x: 84, y: 124, w: 29, rotate: 6, z: 12 } };
    case "hamster-cake":
      return plan.word === undefined ? null : { section: "photos", spot: { x: 15, y: 24, w: 16, rotate: -7, z: 9 } };
    case "sad-hamster": {
      if (plan.word === undefined) return null;
      if (plan.strip.length) return { section: "photos", spot: { x: 53, y: STRIP_TOP + stripHeight(plan.strip.length) - 1, w: 17, rotate: 9, z: 9 } };
      if (plan.loose.length) return { section: "photos", spot: { x: 76, y: 128, w: 19, rotate: 8, z: 9 } };
      return { section: "photos", spot: { x: 12, y: 84, w: 17, rotate: -6, z: 9 } };
    }
    case "balloon-cat":
      return { section: "song", spot: { x: 12, y: 30, w: 20, rotate: -6, z: 9 } };
    case "hamster-slice":
      return { section: "list", spot: { x: 85, y: 74, w: 22, rotate: 8, z: 9 } };
    case "party-kitten":
      return { section: "cake", spot: { x: 87, y: 97, w: 20, rotate: 5, z: 9 } };
    case "ferrets":
      return { section: "cake", spot: { x: 15, y: 104, w: 28, rotate: -4, z: 9 } };
    case "puppy":
      return { section: "letter", spot: { x: 84, y: -9, w: 22, rotate: 7, z: 9 } };
    default:
      return null;
  }
}

/** A guest whose section isn't on the page (no second photo, no song) joins the guest list instead. */
const LIST_FALLBACK: Partial<Record<MemeId, Spot>> = {
  "hamster-cake": { x: 13, y: 112, w: 15, rotate: -8 },
  "sad-hamster": { x: 39, y: 114, w: 16, rotate: 7 },
  "balloon-cat": { x: 64, y: 112, w: 19, rotate: -5 },
};

/**
 * Who is at the party and where they stand: the same ten every time, spread down the page, with
 * the same tilts and tempo for the same two names. `hasSong` is whether the song card is there.
 */
export function planGuests(photoCount: number, hasSong: boolean, seed: number): GuestSpot[] {
  const plan = arrangePhotos(photoCount);
  const random = mulberry32(seed);
  return GUESTS.map((id, i) => {
    const home = homeSpot(id, plan);
    const own = home && (home.section !== "song" || hasSong) ? home : null;
    const fallback = LIST_FALLBACK[id];
    const section: Section = own ? own.section : "list";
    const spot: Spot = own ? own.spot : (fallback ?? { x: 50, y: 112, w: 16, rotate: 0 });
    const wobble = (random() - 0.5) * 3;
    return {
      id,
      index: i,
      section,
      x: spot.x,
      y: spot.y,
      w: spot.w,
      rotate: spot.rotate + wobble,
      z: spot.z ?? 9,
      move: MOVES[(i + Math.floor(random() * MOVES.length)) % MOVES.length],
      idle: IDLES[i % IDLES.length],
      voice: VOICES[id] ?? "chirp",
      pace: 2.4 + random() * 1.8,
      phase: -random() * 3,
      side: spot.x < 32 ? "left" : spot.x > 68 ? "right" : "middle",
      below: spot.below ?? false,
    };
  });
}

/** How tall the guest list's section is: taller when guests from missing sections have joined it. */
export const listHeight = (guests: GuestSpot[]): number => (guests.filter((g) => g.section === "list").length > 1 ? 126 : 96);

/** The cut-out letters, broken into rows by word so no row runs past the page. */
export function bannerRows(text: string, max = 9): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  for (const word of words) {
    const last = rows[rows.length - 1];
    if (last !== undefined && last.length + 1 + word.length <= max) rows[rows.length - 1] = `${last} ${word}`;
    else rows.push(word);
  }
  return rows.slice(0, 3);
}

/** Letter tiles shrink until the longest row fits the 66 `--p` the age balloons leave free. */
export function letterSize(rows: string[]): number {
  const longest = Math.max(1, ...rows.map((r) => r.length));
  return Math.min(9.4, 66 / (longest * 0.95));
}

/** Their name in script under the letters: smaller as it gets longer, so it never runs off the page. */
export function nameSize(name: string): number {
  const length = Math.max(1, [...name.trim()].length);
  return Math.max(5.2, Math.min(14, 62 / (length * 0.74)));
}

/**
 * The word on the second polaroid: in the loopy script while it fits the frame at a readable size,
 * in the narrower handwriting once it's too long for that.
 */
export function wordFace(word: string): { size: number; script: boolean } {
  const length = Math.max(1, [...word.trim()].length);
  const script = Math.min(9, 49 / (length * 0.66));
  if (script >= 5.6) return { size: Math.round(script * 10) / 10, script: true };
  return { size: Math.round(Math.min(9, 49 / (length * 0.44)) * 10) / 10, script: false };
}

/** The line guest `i` yells: the sender's if they wrote one, otherwise one of the house lines. */
export function shoutFor(i: number, shouts: string[], house: string[], age?: number, ageLine?: string): string {
  const own = shouts.map((s) => s.trim()).filter(Boolean);
  if (i < own.length) return own[i];
  const rest = i - own.length;
  if (age && ageLine && rest === 1) return ageLine.replace("{age}", String(age));
  return house[rest % house.length];
}

/** The age on the foil balloons and the number candles: its digits, or nothing when it's a secret. */
export function ageDigits(age: number | undefined): string[] {
  if (!age || !Number.isFinite(age)) return [];
  return String(Math.round(Math.min(120, Math.max(1, age)))).split("");
}

export type CandlePlan = { digits: string[]; small: number };

/** Number candles for the age, with a thin candle or two either side; five thin ones for a secret age. */
export function candlePlan(age: number | undefined): CandlePlan {
  const digits = ageDigits(age);
  if (!digits.length) return { digits, small: 5 };
  return { digits, small: digits.length >= 3 ? 2 : 4 };
}

export type Candle = { x: number; top: number; wick: number; kind: "digit" | "thin"; digit?: string; size?: number };

/**
 * Where the candles stand in the cake's drawing (a 200 × 196 box: the top tier's top at y 80, the
 * ledge of the bottom tier at y 122): the age's digits on top, thin ones either side and on the ledge.
 */
export function candleLayout(plan: CandlePlan): Candle[] {
  const list: Candle[] = [];
  const n = plan.digits.length;
  const size = n >= 3 ? 38 : n === 2 ? 44 : 50;
  const pitch = n >= 3 ? 26 : 29;
  plan.digits.forEach((digit, i) => {
    const x = 100 + (i - (n - 1) / 2) * pitch;
    const top = 80 - size * 0.72;
    list.push({ x, top, wick: top - 5, kind: "digit", digit, size });
  });
  // Thin candles stand on the top tier only where the number leaves room; otherwise on the ledge below it.
  const thin = (x: number, base: number) => list.push({ x, top: base - 28, wick: base - 33, kind: "thin" });
  if (!n) [68, 84, 100, 116, 132].slice(0, plan.small).forEach((x) => thin(x, 80));
  else if (n === 1) [70, 130, 40, 160].slice(0, plan.small).forEach((x, i) => thin(x, i < 2 ? 80 : 122));
  else if (n === 2) [59.5, 140.5, 40, 160].slice(0, plan.small).forEach((x, i) => thin(x, i < 2 ? 80 : 122));
  else [40, 160].slice(0, plan.small).forEach((x) => thin(x, 122));
  return list.sort((a, b) => a.x - b.x);
}

export type Bit = { dx: number; dy: number; peak: number; rotate: number; w: number; h: number; round: boolean; color: number };
export type Pop = { id: number; x: number; y: number; bits: Bit[] };

/** How many handfuls of confetti stay on the page before the oldest is swept away. */
export const MAX_POPS = 14;
const BITS = 12;

/**
 * The `n`th handful of confetti they throw, at `x`, `y` on the page: where every bit flies to and
 * lands, how it tumbles, and which colour it is. The same handful for the same tap, every time.
 */
export function popAt(n: number, x: number, y: number, seed: number): Pop {
  const random = mulberry32(seed + n * 7919);
  const bits = Array.from({ length: BITS }, (_, i) => {
    const angle = (i / BITS) * Math.PI * 2 + random() * 0.5;
    const reach = 5 + random() * 9;
    return {
      dx: Math.round(Math.cos(angle) * reach * 10) / 10,
      dy: Math.round((Math.sin(angle) * reach * 0.7 + 3 + random() * 4) * 10) / 10,
      peak: Math.round((4 + random() * 7) * 10) / 10,
      rotate: Math.round((random() - 0.5) * 540),
      w: Math.round((1.1 + random() * 1.3) * 10) / 10,
      h: Math.round((0.7 + random() * 1.6) * 10) / 10,
      round: random() < 0.3,
      color: Math.floor(random() * 1000),
    };
  });
  return { id: n, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, bits };
}

/** A new handful joins the page; past the limit the oldest one goes. */
export const addPop = (pops: Pop[], pop: Pop): Pop[] => [...pops, pop].slice(-MAX_POPS);

export type Fleck = { x: number; y: number; kind: "dot" | "strip" | "curl" | "star"; size: number; rotate: number; color: number };

/** Paper confetti lying flat on a stretch of page `height` tall: seeded, so it never jumps about. */
export function scatter(seed: number, count: number, height: number, margin = 2): Fleck[] {
  const random = mulberry32(seed);
  const kinds: Fleck["kind"][] = ["dot", "strip", "dot", "curl", "strip", "star"];
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round((margin + random() * (100 - margin * 2)) * 10) / 10,
    y: Math.round((margin + random() * (height - margin * 2)) * 10) / 10,
    kind: kinds[i % kinds.length],
    size: Math.round((0.8 + random() * 0.9) * 100) / 100,
    rotate: Math.round(random() * 360),
    color: Math.floor(random() * 1000),
  }));
}
