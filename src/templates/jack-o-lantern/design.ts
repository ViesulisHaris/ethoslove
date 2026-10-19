/**
 * What is carved, and in what order. Every shape is a path in the pumpkin's own 100 × 92 box, so the
 * knife that traces it, the cavity it leaves and the light that comes through it all share one set of
 * numbers. The timeline is plain arithmetic on the lengths the browser measures.
 */
export type Cut = { id: string; d: string };
export type FaceId = "classic" | "sweet" | "cat";

export const FACES: Record<FaceId, Cut[]> = {
  classic: [
    { id: "eye-l", d: "M24 37 L33 22 L42 37 Z" },
    { id: "eye-r", d: "M58 37 L67 22 L76 37 Z" },
    { id: "nose", d: "M50 39 L55 47 L45 47 Z" },
    { id: "mouth", d: "M20 51 L27 55 L33 50 L41 57 L50 51 L59 57 L67 50 L73 55 L80 51 C 76 66 24 66 20 51 Z" },
  ],
  sweet: [
    { id: "eye-l", d: "M33 41 C 24 34 24 25 30 25 C 32 25 33 27 33 28 C 33 27 34 25 36 25 C 42 25 42 34 33 41 Z" },
    { id: "eye-r", d: "M67 41 C 58 34 58 25 64 25 C 66 25 67 27 67 28 C 67 27 68 25 70 25 C 76 25 76 34 67 41 Z" },
    { id: "nose", d: "M47.4 44 a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0 Z" },
    { id: "smile", d: "M25 50 C 35 67 65 67 75 50 C 66 58 34 58 25 50 Z" },
  ],
  cat: [
    { id: "eye-l", d: "M23 39 C 29 28 40 28 44 36 C 38 42 28 43 23 39 Z" },
    { id: "eye-r", d: "M77 39 C 71 28 60 28 56 36 C 62 42 72 43 77 39 Z" },
    { id: "nose", d: "M46 44 L54 44 L50 49.5 Z" },
    { id: "mouth", d: "M50 49.5 C 50 55 44.5 57 40 52.5 C 44 59.5 50 59.5 50 53.5 C 50 59.5 56 59.5 60 52.5 C 55.5 57 50 55 50 49.5 Z" },
    // Two whiskers a side, each side one cut: the knife draws both in a single pass.
    { id: "whiskers-l", d: "M10 41 L29 46 L10 44 Z M10 52 L29 49 L10 55 Z" },
    { id: "whiskers-r", d: "M90 41 L71 46 L90 44 Z M90 52 L71 49 L90 55 Z" },
  ],
};

/** The band of the belly the name is carved across: where it starts and ends along x, its baseline and its size. */
export const NAME_BAND = { x1: 21, x2: 79, y: 79, size: 10.5 } as const;

/** What is carved across the belly: capitals, no more than 12, or the fallback when nothing printable is left. */
export function normalizeCarving(raw: string | undefined | null, fallback: string, max = 12): string {
  const text = (raw ?? "")
    .toLocaleUpperCase()
    .replace(/[^\p{L}\p{N} !?&-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
  return /[\p{L}\p{N}]/u.test(text) ? text : fallback.toLocaleUpperCase().slice(0, max);
}

export const TRAVEL = 0.22;
export const GAP = 0.06;
export const NAME_SECONDS = 1.0;
export const LEAD = 0.4;

export type Step = { index: number; travelAt: number; start: number; end: number };
export type Plan = { steps: Step[]; nameTravelAt: number; nameStart: number; nameEnd: number; total: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** How long a cut takes: a little for a short one, more for a long one, never dragging. */
export const cutSeconds = (length: number) => clamp(0.16 + length * 0.0062, 0.32, 0.85);

/** When each cut starts and ends, given the length of each path; then the name; then a breath. */
export function planCarve(lengths: readonly number[]): Plan {
  let t = LEAD;
  const steps = lengths.map((length, index) => {
    const travelAt = t;
    const start = travelAt + TRAVEL;
    const end = start + cutSeconds(length);
    t = end + GAP;
    return { index, travelAt, start, end };
  });
  const nameTravelAt = t;
  const nameStart = nameTravelAt + TRAVEL;
  const nameEnd = nameStart + NAME_SECONDS;
  return { steps, nameTravelAt, nameStart, nameEnd, total: nameEnd + 0.4 };
}

/** How far along a stretch `t` is, from 0 before `from` to 1 after `to`. */
export function progressBetween(t: number, from: number, to: number): number {
  return to <= from ? (t >= to ? 1 : 0) : clamp((t - from) / (to - from), 0, 1);
}
