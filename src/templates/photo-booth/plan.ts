/**
 * The booth's arithmetic, kept out of the drawing: which photo goes in which frame, how the strip
 * develops, where the camera looks, and how long every beat takes. Pure, so it is tested alone.
 */

export type FilterId = "color" | "bw" | "sepia";

/** A strip always has four frames, whatever the sender uploaded. */
export const POSES = 4;

export type Frame<T> = { photo: T | undefined; pose: number };

/**
 * The four frames of the strip. Four photos or more: the first four, as they are. Fewer: the same
 * ones again, each time framed a little differently, the way the third and fourth poses in a real
 * booth are the same two faces leaning in closer.
 */
export function stripFrames<T>(photos: readonly T[]): Frame<T>[] {
  if (photos.length === 0) return Array.from({ length: POSES }, () => ({ photo: undefined, pose: 0 }));
  return Array.from({ length: POSES }, (_, i) => ({ photo: photos[i % photos.length], pose: Math.floor(i / photos.length) }));
}

/** How a repeated photo is framed on its later poses: closer each time, and off to one side. */
const FRAMING = [
  { zoom: 1, x: 50, y: 42 },
  { zoom: 1.22, x: 36, y: 36 },
  { zoom: 1.16, x: 64, y: 46 },
  { zoom: 1.34, x: 50, y: 30 },
] as const;

export function framing(pose: number): { zoom: number; x: number; y: number } {
  return FRAMING[((pose % FRAMING.length) + FRAMING.length) % FRAMING.length];
}

/** The photos after the first four: four more print a second strip, and what is left is pinned up. */
export function extraPhotos<T>(photos: readonly T[]): { second: T[]; pinned: T[] } {
  const rest = photos.slice(POSES);
  if (rest.length >= POSES) return { second: rest.slice(0, POSES), pinned: rest.slice(POSES, POSES + 2) };
  return { second: [], pinned: rest.slice(0, 3) };
}

type Grade = { gray: number; sepia: number; contrast: number; bright: number; sat: number };

/** Straight out of the slot: pale, grey and flat, the way a wet print looks before it comes up. */
const WET: Grade = { gray: 1, sepia: 0.12, contrast: 0.4, bright: 1.45, sat: 1 };

const GRADES: Record<FilterId, Grade> = {
  color: { gray: 0, sepia: 0.06, contrast: 1.05, bright: 1.02, sat: 1.08 },
  bw: { gray: 1, sepia: 0, contrast: 1.18, bright: 1.04, sat: 1 },
  sepia: { gray: 0.25, sepia: 0.75, contrast: 1.06, bright: 1.03, sat: 1.05 },
};

const grade = (g: Grade) => `grayscale(${g.gray}) sepia(${g.sepia}) contrast(${g.contrast}) brightness(${g.bright}) saturate(${g.sat})`;

/**
 * The strip's chemistry as a CSS filter: pale grey while it is wet, its own grade once developed.
 * The same five functions in the same order either way, so the browser fades one into the other.
 */
export function stripFilter(filter: FilterId, developed: boolean): string {
  return grade(developed ? (GRADES[filter] ?? GRADES.color) : WET);
}

/** What the booth's mirror shows before the flash: them, dim and a little soft, behind dark glass. */
export const MIRROR_LIVE = "grayscale(0.3) brightness(0.62) contrast(0.92) saturate(0.8)";

export type Shot = "full" | "inside" | "print";

/** The booth is drawn in its own units (one `--k` each): this wide, and this tall with its sign. */
export const BOOTH_W = 76;
export const BOOTH_H = 156;

/** Where the camera looks, in the booth's units, and how close it goes. */
export const SHOTS: Record<Exclude<Shot, "full">, { x: number; y: number; zoom: number }> = {
  // The camera panel behind the curtain: mirror, lamps and button fill a phone held upright.
  inside: { x: 26, y: 72, zoom: 2.5 },
  // The slot on the front, with the strip hanging out of it and room for the hint under its foot.
  print: { x: 54.5, y: 120, zoom: 3.2 },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The camera as one CSS transform on the whole scene (room and booth), from its top-left corner.
 * The booth stands centred with its top at `--top`; a shot puts its focus point in the middle of
 * the screen, a little above centre so the hint fits under it. The full shot is the same two
 * functions at rest, so the browser can travel between any two shots.
 */
export function cameraTransform(shot: Shot): string {
  if (shot === "full") return "translate(0px, 0px) scale(1)";
  const { x, y, zoom } = SHOTS[shot];
  const tx = `calc(${r2(1 - zoom)} * 50cqw + ${r2(zoom * (BOOTH_W / 2 - x))} * var(--k))`;
  const ty = `calc(47cqh - ${r2(zoom)} * var(--top) - ${r2(zoom * y)} * var(--k))`;
  return `translate(${tx}, ${ty}) scale(${zoom})`;
}

/** How long each beat takes, in milliseconds. */
export const TIMING = {
  /** The curtain running along its rail after a tap. */
  curtain: 850,
  /** The camera moving between shots. */
  camera: 1150,
  /** Each number of the countdown. */
  step: 700,
  /** From the flash to the button lighting up again. */
  hold: 600,
  /** After the fourth flash, before the booth starts to print. */
  afterLast: 900,
  /** The strip being pushed out of the slot. */
  slide: 3400,
  /** Grey to its colours. */
  develop: 5000,
  /** Lifting the strip off before the wall comes in. */
  take: 650,
} as const;

export type Beat = { at: number; beat: "count" | "flash" | "ready"; n?: number };

/**
 * One pose, beat by beat, from the moment the button goes down: three, two, one, the flash, and
 * the button ready again. Without motion there is no countdown and no flash of light: the shutter
 * goes the moment it is pressed.
 */
export function poseBeats(reduce: boolean): Beat[] {
  if (reduce) return [{ at: 0, beat: "flash" }, { at: 380, beat: "ready" }];
  const numbers = [3, 2, 1].map((n, i): Beat => ({ at: i * TIMING.step, beat: "count", n }));
  const flash = 3 * TIMING.step;
  return [...numbers, { at: flash, beat: "flash" }, { at: flash + TIMING.hold, beat: "ready" }];
}

/** Two lines for the sign on top: "·" breaks the line, like the marquee's own "PHOTOS · 4 POSES". */
export function signLines(text: string): [string, string?] {
  const parts = text
    .split("·")
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (parts.length === 0) return [""];
  if (parts.length === 1) return [parts[0]];
  return [parts[0], parts.slice(1).join(" · ")];
}

/** A line of the sign at the largest size that fits `room` (in `--k`), never above `max`. */
export function signSize(line: string, room: number, max: number): number {
  const chars = Math.max(1, [...line].length);
  // Rounded down, so the line never runs a hair past the face.
  return Math.floor(Math.min(max, room / (chars * 0.74)) * 100) / 100;
}

/** The date the booth prints on the strip: day, month, year, the same in every language. */
export function stampDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())} · ${pad(date.getMonth() + 1)} · ${date.getFullYear()}`;
}

/** How far into the gift they are, for the progress the sender sees: the booth takes the first two thirds. */
export function boothProgress(step: "curtain" | "shot" | "printed" | "wall", shots = 0): number {
  if (step === "curtain") return 10;
  if (step === "shot") return 15 + Math.min(POSES, Math.max(0, shots)) * 10;
  if (step === "printed") return 62;
  return 70;
}
