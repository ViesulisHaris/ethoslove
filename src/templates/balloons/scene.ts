import { mulberry32 } from "../_shared/random";

/**
 * Where everything in the room goes. Pure, seeded from the names, so the balloons hang in the
 * same places on the server, on the client and on every replay.
 */

export type BalloonSpot = {
  /** The centre of the balloon across, and the top of it down, in % of the room. */
  x: number;
  y: number;
  /** Width, as a multiple of the base balloon size. */
  scale: number;
  /** Which of the palette's tones. */
  tone: number;
  /** Delay into the bob cycle, in seconds, so no two rise together. */
  phase: number;
  /** How long one bob takes, in seconds. */
  bob: number;
};

/** The band the balloons' tops hang in: under the sign, above the floor where the photos land. */
export const CLUSTER = { top: 30, bottom: 60, left: 12, right: 88 };
/** On a wide screen the sign takes more of the height, so the balloons hang lower, in fewer rows. */
export const WIDE_CLUSTER = { top: 38, bottom: 58, left: 10, right: 90 };
/** The editor's still frame: the room packed under the sign, so the letter can show beneath it. */
export const COMPACT_CLUSTER = { top: 26, bottom: 40, left: 12, right: 88 };

/**
 * A jittered grid: enough columns that a phone's width holds them, a row per line of the grid,
 * and every balloon nudged off its cell's centre. The last spot is for the balloon that carries
 * the letter, so it sits in the middle of the cluster, bigger than the rest.
 */
export function layoutBalloons(count: number, seed: number, tones: number, wide = false, compact = false): BalloonSpot[] {
  const n = Math.max(1, count);
  const rng = mulberry32(seed);
  // A phone stacks them; a laptop, or a phone on its side, spreads them across.
  const cols = wide ? Math.min(n, n <= 6 ? 3 : n <= 8 ? 4 : 5) : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const band = compact ? COMPACT_CLUSTER : wide ? WIDE_CLUSTER : CLUSTER;
  const cellW = (band.right - band.left) / cols;
  const cellH = (band.bottom - band.top) / rows;
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Odd rows shift half a cell, the way a bunch of balloons packs.
      const shift = r % 2 ? 0.5 : 0;
      const x = band.left + cellW * (c + 0.5 + shift * (c === cols - 1 ? -1 : 1) * 0.6);
      const y = band.top + cellH * (r + 0.5);
      cells.push({ x, y });
    }
  }
  // The letter takes the cell nearest the middle of the cluster.
  const mid = { x: (band.left + band.right) / 2, y: (band.top + band.bottom) / 2 + cellH * 0.15 };
  const used = cells.slice(0, n);
  let letterIndex = 0;
  let best = Infinity;
  used.forEach((cell, i) => {
    const d = (cell.x - mid.x) ** 2 + (cell.y - mid.y) ** 2;
    if (d < best) {
      best = d;
      letterIndex = i;
    }
  });
  const others = used.filter((_, i) => i !== letterIndex);
  const ordered = [...others, used[letterIndex]];
  // The palette's colours dealt out in a shuffled order, so every one shows before any repeats.
  const deck = shuffle(Array.from({ length: Math.max(1, tones) }, (_, i) => i), rng);
  // Four columns only fit on a phone if the balloons come down a size.
  const fit = (compact ? 0.8 : 1) * (wide ? 1 : cols === 4 ? 0.84 : cols === 3 ? 0.94 : 1);
  return ordered.map((cell, i) => {
    const last = i === n - 1;
    const jx = (rng() - 0.5) * cellW * 0.3;
    const jy = (rng() - 0.5) * cellH * 0.44;
    return {
      x: clamp(cell.x + jx, band.left, band.right),
      y: clamp(cell.y + jy, band.top, band.bottom),
      scale: (last ? 1.3 : 0.88 + rng() * 0.24) * fit,
      tone: last ? -1 : deck[i % deck.length],
      phase: -rng() * 6,
      bob: 5.2 + rng() * 2.6,
    };
  });
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type PileSlot = { x: number; y: number; rotate: number };

/** Where popped photos land: along the floor, fanned out, each a little askew, later ones on top. */
export function pileSlots(count: number, seed: number): PileSlot[] {
  const rng = mulberry32(seed + 7);
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return {
      x: 22 + t * 56 + (rng() - 0.5) * 6,
      y: 80 + (rng() - 0.5) * 5,
      rotate: (rng() - 0.5) * 26,
    };
  });
}

/** The pennant line wraps into rows a thumb can read: at most 14 letters each, split on spaces. */
export function bannerRows(text: string, max = 14): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let current = "";
  for (const raw of words) {
    // A single word longer than a row is cut, rather than shrunk past reading.
    const pieces = raw.length > max ? raw.match(new RegExp(`.{1,${max}}`, "g")) ?? [raw] : [raw];
    for (const word of pieces) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= max) current = next;
      else {
        if (current) rows.push(current);
        current = word;
      }
    }
  }
  if (current) rows.push(current);
  return rows.slice(0, 2);
}

/** The digits of an age, for the foil balloons. Nothing for no age. */
export function ageDigits(age: number | undefined): string[] {
  if (!age || !Number.isFinite(age)) return [];
  return String(Math.round(clamp(age, 1, 120))).split("");
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
