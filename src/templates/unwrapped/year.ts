import type { GiftLocale } from "@/lib/gift/schema";
import { mulberry32 } from "../_shared/random";

/**
 * Unwrapped's rules, out of the component so they can be tested: how a line the sender typed
 * ("1,284 voice notes") becomes a number that counts up and the words under it, which year it is
 * about, how the paper comes off, and the barcode on the receipt.
 */

export type Stat = {
  /** The line as typed, for the receipt. */
  raw: string;
  /** The number to count up to, or null for a line with no number in front ("one very good cat"). */
  value: number | null;
  /** How many decimals it was typed with. */
  decimals: number;
  /** A sign before it (~, ≈, +) and a unit after it (%, k), kept as typed. */
  before: string;
  after: string;
  /** The words under the number; the whole line when there is no number. */
  label: string;
};

const NUMBER = /^\s*([~≈+]?)\s*(\d[\d.,\s]*\d|\d)\s*(%|k\b|K\b|x\b|×)?\s*(.*)$/;

/** Reads a typed number in either convention: a separator followed by exactly three digits groups thousands, any other is the decimal point. */
function readNumber(text: string): { value: number; decimals: number } | null {
  const t = text.replace(/\s/g, "");
  const parts = t.split(/[.,]/);
  if (parts.some((p) => p === "")) return null;
  if (parts.length === 1) return { value: Number(parts[0]), decimals: 0 };
  const last = parts[parts.length - 1];
  const grouped = parts.slice(1).every((p) => p.length === 3);
  if (grouped) return { value: Number(parts.join("")), decimals: 0 };
  const whole = parts.slice(0, -1).join("");
  const value = Number(`${whole}.${last}`);
  return Number.isFinite(value) ? { value, decimals: Math.min(2, last.length) } : null;
}

export function parseStat(line: string): Stat {
  const raw = line.trim().slice(0, 48);
  const m = NUMBER.exec(raw);
  if (m) {
    const n = readNumber(m[2]);
    if (n && Number.isFinite(n.value) && n.value <= 1e9) return { raw, value: n.value, decimals: n.decimals, before: m[1] ?? "", after: m[3] ?? "", label: (m[4] ?? "").trim() };
  }
  return { raw, value: null, decimals: 0, before: "", after: "", label: raw };
}

/** The presents to open: what was typed, or three lines that are true of anyone when nothing was. */
export function readStats(lines: readonly unknown[] | undefined, fallback: readonly string[]): Stat[] {
  const typed = (Array.isArray(lines) ? lines : []).filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 8);
  return (typed.length ? typed : fallback).map(parseStat);
}

/** The number as it reads partway through counting up, in the recipient's own grouping. */
export function formatCount(stat: Stat, progress: number, locale: GiftLocale): string {
  if (stat.value === null) return stat.label;
  const p = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - p) ** 3;
  const v = stat.value * eased;
  const shown = p >= 1 ? stat.value : stat.decimals ? v : Math.floor(v);
  const text = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { minimumFractionDigits: p >= 1 ? stat.decimals : 0, maximumFractionDigits: stat.decimals, useGrouping: stat.value >= 10000 || locale !== "es" }).format(shown);
  return `${stat.before}${text}${stat.after}`;
}

/** The year being unwrapped: until the end of February it is still last year. */
export const unwrapYear = (now: Date) => (now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear());

/** How many taps (or strokes of a drag) it takes to get the paper off one present. */
export const PIECES = 4;

/**
 * The paper on one present, torn in PIECES pieces. Each piece is a polygon in the box's 0–100 space,
 * cut along ragged lines from a seeded random so every present tears differently, and the same way
 * every time it is opened. Together they cover the whole box.
 */
export function tearPieces(seed: number): string[] {
  const rnd = mulberry32(seed);
  const jag = (from: [number, number], to: [number, number], steps = 6) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t;
      const edge = i === 0 || i === steps;
      pts.push(edge ? [x, y] : [x + (rnd() - 0.5) * 7, y + (rnd() - 0.5) * 7]);
    }
    return pts;
  };
  const cx = 42 + rnd() * 16;
  const cy = 42 + rnd() * 16;
  const top = 30 + rnd() * 40;
  const bottom = 30 + rnd() * 40;
  const left = 30 + rnd() * 40;
  const right = 30 + rnd() * 40;
  // Four tears run from the middle to the four sides; the corners between them are the pieces.
  const toTop = jag([cx, cy], [top, -2]);
  const toRight = jag([cx, cy], [102, right]);
  const toBottom = jag([cx, cy], [bottom, 102]);
  const toLeft = jag([cx, cy], [-2, left]);
  const poly = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`;
  const rev = (pts: [number, number][]) => [...pts].reverse();
  return [
    poly([...toTop, [-2, -2], ...rev(toLeft)]),
    poly([...toRight, [102, -2], ...rev(toTop)]),
    poly([...toBottom, [102, 102], ...rev(toRight)]),
    poly([...toLeft, [-2, 102], ...rev(toBottom)]),
  ];
}

/** The bars of the receipt's barcode, as widths in quarters of a bar, seeded from the names. */
export function barcode(seed: number, count = 42): number[] {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  return Array.from({ length: count }, () => 1 + Math.floor(rnd() * 4));
}
