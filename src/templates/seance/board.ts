import { mulberry32 } from "../_shared/random";

/**
 * The board, and the planchette's journey across it. All of it is plain arithmetic on the board's
 * own coordinates (100 × 74), so the drawing, the motion and the tests agree about where a letter is.
 */
export type Pt = { x: number; y: number };

export const BOARD = { w: 100, h: 74 } as const;

const ROW_ONE = "ABCDEFGHIJKLM";
const ROW_TWO = "NOPQRSTUVWXYZ";
const NUMBERS = "1234567890";

/** The letters sit on two arches, one under the other, the way the old boards print them. */
function onArch(index: number, count: number, centreY: number): Pt {
  const radius = 52;
  const from = 138.6;
  const to = 41.4;
  const deg = from + ((to - from) * index) / (count - 1);
  const rad = (deg * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(rad), y: centreY - radius * Math.sin(rad) };
}

export const LETTERS: Readonly<Record<string, Pt>> = (() => {
  const at: Record<string, Pt> = {};
  [...ROW_ONE].forEach((ch, i) => (at[ch] = onArch(i, ROW_ONE.length, 74)));
  [...ROW_TWO].forEach((ch, i) => (at[ch] = onArch(i, ROW_TWO.length, 91)));
  [...NUMBERS].forEach((ch, i) => (at[ch] = { x: 22 + (i * 56) / 9, y: 61 }));
  return at;
})();

export const HOME: Pt = { x: 50, y: 51.5 };
export const GOODBYE: Pt = { x: 50, y: 69.5 };
export const YES: Pt = { x: 15, y: 11 };
export const NO: Pt = { x: 85, y: 11 };

/** What the board can say: its letters and numbers. */
export const SPELLABLE = Object.keys(LETTERS);

const FOLD: Record<string, string> = { "ß": "SS", "Æ": "AE", "Œ": "OE", "Ø": "O", "Ł": "L", "Đ": "D", "Þ": "TH" };

/**
 * Whatever the sender typed, as the board can say it: capitals, no accents (Ñ is N), digits, single
 * spaces. Anything else is dropped. Nothing left means the fallback.
 */
export function normalizeSpell(raw: string | undefined | null, fallback: string, max = 22): string {
  const folded = (raw ?? "")
    .toUpperCase()
    .replace(/[ßÆŒØŁĐÞ]/g, (c) => FOLD[c] ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
  return /[A-Z0-9]/.test(folded) ? folded : fallback;
}

/** One stop on the journey: where from, where to, and when. A space is a stop that goes nowhere. */
export type Leg = { index: number; char: string; from: Pt; to: Pt; start: number; move: number; dwell: number };
export type Tour = { legs: Leg[]; goodbye: Leg; total: number };

export const SPACE_MS = 280;
export const DWELL_MS = 380;
export const LEAD_MS = 500;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
/** Longer reaches take longer, but not by much: a spirit is not in a hurry, and not slow either. */
export const moveMs = (d: number) => Math.round(230 + d * 8.5);

export function buildTour(text: string, seed: number): Tour {
  const rng = mulberry32(seed);
  const legs: Leg[] = [];
  let at = LEAD_MS;
  let pos = HOME;
  [...text].forEach((char, index) => {
    if (char === " ") {
      legs.push({ index, char, from: pos, to: pos, start: at, move: 0, dwell: SPACE_MS });
      at += SPACE_MS;
      return;
    }
    const spot = LETTERS[char] ?? HOME;
    // Never exactly on the letter twice: a hand is not that steady.
    const to = { x: spot.x + (rng() - 0.5) * 0.9, y: spot.y + (rng() - 0.5) * 0.9 };
    const move = moveMs(dist(pos, to));
    legs.push({ index, char, from: pos, to, start: at, move, dwell: DWELL_MS });
    at += move + DWELL_MS;
    pos = to;
  });
  const move = moveMs(dist(pos, GOODBYE)) + 120;
  const goodbye: Leg = { index: legs.length, char: "", from: pos, to: GOODBYE, start: at + 160, move, dwell: 900 };
  return { legs, goodbye, total: goodbye.start + goodbye.move + goodbye.dwell };
}

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
/** How fast the ease is going, as a fraction of its average: 0 at both ends, about 1.9 in the middle. */
const easeSpeed = (p: number) => (p < 0.5 ? 12 * p * p : 12 * Math.pow(1 - p, 2)) / 2;

export type Sample = {
  x: number;
  y: number;
  /** Degrees: the planchette leans into a long reach. */
  tilt: number;
  /** The leg being walked or dwelt on, or -1 before the first and `legs.length` for the goodbye. */
  leg: number;
  phase: "idle" | "move" | "dwell" | "end";
};

/** Where the planchette is, and what it is doing, `t` milliseconds in. A pure function of time, so a skip is just a later `t`. */
export function sampleTour(tour: Tour, t: number): Sample {
  const all = [...tour.legs, tour.goodbye];
  let current: Leg | undefined;
  for (const leg of all) {
    if (t >= leg.start) current = leg;
    else break;
  }
  if (!current) {
    // Before it begins, it trembles where it sits.
    return { x: HOME.x + Math.sin(t / 90) * 0.06, y: HOME.y + Math.cos(t / 110) * 0.05, tilt: 0, leg: -1, phase: "idle" };
  }
  const { from, to, start, move, dwell } = current;
  const into = t - start;
  if (into < move) {
    const p = into / move;
    const e = easeInOut(p);
    const dx = to.x - from.x;
    const lean = move > 0 ? (dx / Math.max(1, Math.abs(dx) + Math.abs(to.y - from.y))) * easeSpeed(p) * 6.5 : 0;
    // A slight bow in the path, so it drifts rather than ruling a straight line.
    const bow = Math.sin(p * Math.PI) * Math.min(3.2, dist(from, to) * 0.06);
    const nx = -(to.y - from.y);
    const ny = dx;
    const nl = Math.hypot(nx, ny) || 1;
    return { x: from.x + dx * e + (nx / nl) * bow, y: from.y + (to.y - from.y) * e + (ny / nl) * bow, tilt: lean, leg: current.index, phase: "move" };
  }
  const settled = into - move;
  if (settled < dwell) {
    // It overshoots a hair and comes to rest.
    const ring = Math.sin(settled / 22) * Math.exp(-settled / 120) * 0.35;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: to.x + (dx / l) * ring, y: to.y + (dy / l) * ring, tilt: 0, leg: current.index, phase: "dwell" };
  }
  return { x: to.x, y: to.y, tilt: 0, leg: current.index, phase: current === tour.goodbye ? "end" : "dwell" };
}

/** How many of the letters have been reached by `t`: what the line under the board has said so far. */
export function reachedAt(tour: Tour, t: number): number {
  let n = 0;
  for (const leg of tour.legs) {
    if (t >= leg.start + leg.move) n++;
    else break;
  }
  return n;
}
