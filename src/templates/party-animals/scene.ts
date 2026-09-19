import { mulberry32 } from "../_shared/random";
import type { MemeId } from "../_shared/memes/catalogue";

/**
 * The page is a 100 × 178 stage (a phone held upright). Frames are placed by their top-left corner
 * and guests by their middle, both in percent of the stage; widths are in stage units.
 */
export const STAGE_RATIO = 1.78;

const STRIP_TOP = 23.5;

export type FrameKind = "big" | "wide" | "strip" | "small";
export type FrameSpot = { kind: FrameKind; photos: number[]; x: number; y: number; w: number; rotate: number };

/** Which frames a number of photos fills: the big polaroid first, then the wide one, then the strip. */
export function planFrames(count: number): FrameSpot[] {
  const n = Math.max(0, Math.min(7, Math.floor(count)));
  if (n === 0) return [];
  if (n <= 3) {
    const frames: FrameSpot[] = [{ kind: "big", photos: [0], x: n === 1 ? 17 : 8, y: n === 1 ? 25 : 22, w: n === 1 ? 66 : 54, rotate: -3 }];
    if (n >= 2) frames.push({ kind: "wide", photos: [1], x: 27, y: 59.5, w: 60, rotate: 2 });
    if (n === 3) frames.push({ kind: "small", photos: [2], x: 4, y: 81, w: 34, rotate: -5 });
    return frames;
  }
  const cells = Math.min(4, n - 2);
  const frames: FrameSpot[] = [
    { kind: "big", photos: [0], x: 5, y: 22, w: 44, rotate: -3 },
    { kind: "wide", photos: [1], x: 4, y: 54.5, w: 52, rotate: 1.5 },
    { kind: "strip", photos: Array.from({ length: cells }, (_, i) => 2 + i), x: 61, y: STRIP_TOP, w: 28, rotate: 2 },
  ];
  if (n === 7) frames.push({ kind: "small", photos: [6], x: 27, y: 80, w: 36, rotate: -2 });
  return frames;
}

/** How tall a strip of `cells` photos stands, in percent of the stage. */
export const stripHeight = (cells: number): number => ((2.2 + cells * 20 + (cells - 1) * 1.6 + 7) / (100 * STAGE_RATIO)) * 100;

export type Move = "jump" | "spin" | "zoom" | "wiggle";
export type Idle = "bob" | "tilt" | "squish";
export type Voice = "squeak" | "chirp" | "boing" | "honk";
export type GuestSpot = { id: MemeId; x: number; y: number; w: number; rotate: number; move: Move; idle: Idle; voice: Voice; pace: number; phase: number };

type Anchor = [id: MemeId, x: number, y: number, w: number, rotate: number];

const VOICES: Partial<Record<MemeId, Voice>> = { rat: "honk", ferrets: "honk", "party-yell": "honk", puppies: "boing", puppy: "boing", "hamster-cake": "squeak", "hamster-slice": "squeak", "sad-hamster": "squeak" };
const MOVES: Move[] = ["jump", "spin", "zoom", "wiggle"];
const IDLES: Idle[] = ["bob", "tilt", "squish"];

function anchors(n: number): Anchor[] {
  if (n <= 3) {
    const list: Anchor[] = [
      ["party-yell", 14, 21.5, 26, -8],
      ["green-hat-kitten", 51, 21, 12, 4],
      ["puppies", 84, 21, 27, 5],
    ];
    if (n === 1) {
      list.push(["hamster-cake", 9, 42, 15, -8], ["sad-hamster", 91, 47, 17, 7], ["balloon-cat", 22, 68.5, 22, -5], ["rat", 66, 68, 30, 4], ["party-kitten", 15, 87.5, 27, -4], ["puppy", 47, 88, 23, 5], ["ferrets", 80, 88, 36, 2]);
    } else {
      list.push(["hamster-cake", 80, 33.5, 17, 6], ["sad-hamster", 84, 48, 23, -5], ["balloon-cat", 13, 64, 20, -6], ["hamster-slice", 92.5, 85, 15, 12]);
      list.push(n === 3 ? ["party-kitten", 53, 90, 21, 3] : ["party-kitten", 15, 88, 27, -4]);
      list.push(["ferrets", n === 3 ? 82 : 66, 91, n === 3 ? 30 : 36, 2]);
    }
    return list;
  }
  const cells = Math.min(4, n - 2);
  const list: Anchor[] = [
    ["party-yell", 13, 21.5, 25, -8],
    ["green-hat-kitten", 48, 21, 12.5, 4],
    ["puppies", 84, 20.5, 26, 5],
    ["hamster-cake", 55.5, 38.5, 13.5, -4],
    ["sad-hamster", 12.5, 53.5, 19, -6],
    ["balloon-cat", 43, 52, 16, 3],
    ["hamster-slice", 92, 49, 15.5, 12],
    ["party-kitten", 14, 88, 26, -4],
    ["ferrets", 79, 88.5, 37, 2],
  ];
  // A short strip leaves the wall under it free: the rat takes it.
  if (cells <= 3) list.push(["rat", 76, STRIP_TOP + stripHeight(cells) + 6.5, 25, -4]);
  if (n !== 7) list.push(["puppy", 46.5, 88, 21, 5]);
  return list;
}

/** Who is at the party and where they stand, the same for the same two names every time. */
export function planGuests(count: number, seed: number): GuestSpot[] {
  const random = mulberry32(seed);
  return anchors(Math.max(1, Math.min(7, Math.floor(count)))).map(([id, x, y, w, rotate], i) => ({
    id,
    x,
    y,
    w,
    rotate: rotate + (random() - 0.5) * 3,
    move: MOVES[(i + Math.floor(random() * MOVES.length)) % MOVES.length],
    idle: IDLES[i % IDLES.length],
    voice: VOICES[id] ?? "chirp",
    pace: 2.4 + random() * 1.8,
    phase: -random() * 3,
  }));
}

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

/** Letter tiles shrink until the longest row fits 88 units of page. */
export function letterSize(rows: string[]): number {
  const longest = Math.max(1, ...rows.map((r) => r.length));
  return Math.min(8.8, 88 / longest - 1.1);
}

/** The line guest `i` yells: the sender's if they wrote one, otherwise one of the house lines. */
export function shoutFor(i: number, shouts: string[], house: string[], age?: number, ageLine?: string): string {
  const own = shouts.map((s) => s.trim()).filter(Boolean);
  if (i < own.length) return own[i];
  const rest = i - own.length;
  if (age && ageLine && rest === 1) return ageLine.replace("{age}", String(age));
  return house[rest % house.length];
}
