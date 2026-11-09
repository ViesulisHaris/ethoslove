import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The list's rules, out of the component so they can be tested: what is on it and in which order,
 * what the stamp says in each language, which year is under review, and when the stamp lands.
 */

export type Verdict = "nice" | "naughty" | "both";
export type Side = "nice" | "naughty";
export type Entry = { text: string; side: Side };

export const readVerdict = (v: unknown): Verdict => (v === "naughty" || v === "both" ? v : "nice");

const clean = (lines: readonly unknown[] | undefined) =>
  (Array.isArray(lines) ? lines : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 4);

/**
 * The evidence, a good deed and a crime in turn so the verdict stays in doubt to the end. A list
 * with nothing on it still has two lines, so the scroll is never blank.
 */
export function entries(nice: readonly unknown[] | undefined, naughty: readonly unknown[] | undefined, fallback: { nice: string; naughty: string }): Entry[] {
  const a = clean(nice);
  const b = clean(naughty);
  if (!a.length && !b.length) return [{ text: fallback.nice, side: "nice" }, { text: fallback.naughty, side: "naughty" }];
  const out: Entry[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push({ text: a[i], side: "nice" });
    if (b[i]) out.push({ text: b[i], side: "naughty" });
  }
  return out;
}

/** One press of the stamp: the word, its ink, how far it is turned, and where in the verdict box it lands. Two presses take opposite corners so both words stay readable. */
export type Ink = { word: string; color: string; rotate: number; at: "middle" | "top-left" | "bottom-right" };

const GREEN = "#2f8a4a";
const RED = "#c8282e";
const COAL = "#2b2624";
const SUGAR = "#d8467b";

/**
 * What the stamp says. In Spanish it is the Reyes tradition, not a translation: a good child gets
 * no coal, a naughty one gets coal, and the sugar coal sold in every sweet shop in January is the
 * one that is both. None of the words says whether the recipient is a he or a she.
 */
export function stamps(verdict: Verdict, locale: GiftLocale): Ink[] {
  const es = locale === "es";
  if (verdict === "nice") return [{ word: es ? "SIN CARBÓN" : "NICE", color: GREEN, rotate: -7, at: "middle" }];
  if (verdict === "naughty") return [{ word: es ? "CARBÓN" : "NAUGHTY", color: es ? COAL : RED, rotate: -8, at: "middle" }];
  return es
    ? [
        { word: "CARBÓN", color: COAL, rotate: -9, at: "top-left" },
        { word: "DULCE", color: SUGAR, rotate: 5, at: "bottom-right" },
      ]
    : [
        { word: "NAUGHTY", color: RED, rotate: -9, at: "top-left" },
        { word: "& NICE", color: GREEN, rotate: 5, at: "bottom-right" },
      ];
}

/** The year the list is about: until the end of February it is still last year's. */
export const reviewYear = (now: Date) => (now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear());

/** One press takes STAMP_S: it comes down, meets the paper STAMP_HIT of the way through, holds, and lifts. */
export const STAMP_S = 1.05;
export const STAMP_HIT = 0.34;
/** Seconds between the first press and the second, when there are two. */
export const STAMP_GAP_S = 1.2;
/** When each press meets the paper, in seconds from the first one starting. */
export const hitTimes = (count: number) => Array.from({ length: count }, (_, i) => i * STAMP_GAP_S + STAMP_S * STAMP_HIT);

/** How long a full unroll takes when it rolls on its own, for `remaining` of the scroll (0 to 1). */
export const unrollSeconds = (remaining: number) => Math.max(0.35, 2.4 * Math.min(1, Math.max(0, remaining)));
