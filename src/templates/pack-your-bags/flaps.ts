/**
 * The departures board as numbers: what each split-flap tile turns through, and when. Worked out
 * once, up front, as a flat list of flips sorted by time, so the board itself only has to walk the
 * list on each animation frame and never decides anything while it is moving.
 */

/** A tile's drum, in the order its leaves come round. It only ever turns forwards. */
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-";

/** How many leaves a tile shows on the drum just before its own, so it visibly arrives rather than snaps. */
export const APPROACH = 4;

/** Letters the drum has no leaf for, and the one they're printed on. */
const SPECIAL: Record<string, string> = { Ø: "O", Æ: "A", Œ: "O", Ł: "L", Đ: "D", Þ: "T", "·": ".", "'": " ", "’": " ", "/": "-", _: "-" };

const fold = (ch: string) => ch.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * What a board prints for some text: upper case, accents kept (a tile can land on "Í" after
 * passing "I"), and anything it has no leaf for as a space.
 */
export function flapText(text: string): string {
  return Array.from(text.toUpperCase())
    .map((ch) => (drumIndex(ch) >= 0 ? ch : " "))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Where a character sits on the drum: its own leaf, or its base letter's for an accented one; -1 when neither. */
export function drumIndex(ch: string): number {
  const own = DRUM.indexOf(ch);
  if (own >= 0 && ch.length === 1) return own;
  const base = SPECIAL[ch] ?? fold(ch);
  return base.length === 1 ? DRUM.indexOf(base) : -1;
}

/** The last few leaves before `target` on the drum, then the target itself (by way of its base letter when accented). */
export function approach(target: string, steps = APPROACH): string[] {
  const at = Math.max(0, drumIndex(target));
  const run: string[] = [];
  for (let k = steps; k >= 1; k--) run.push(DRUM[(at - k + DRUM.length) % DRUM.length]);
  if (DRUM[at] !== target) run.push(DRUM[at]);
  run.push(target);
  return run;
}

export type TileFlip = { at: number; char: string };

/**
 * One tile, from `start` to `land` (ms): random leaves while the board clatters, then the run up
 * to its character. A tile that has nowhere to clatter still approaches, so it never jumps.
 */
export function tileFlips(target: string, start: number, land: number, flipMs: number, rng: () => number, steps = APPROACH): TileFlip[] {
  const tail = approach(target, steps);
  const total = Math.max(tail.length, Math.round((land - start) / flipMs) + 1);
  const flips: TileFlip[] = [];
  for (let k = 0; k < total - tail.length; k++) flips.push({ at: start + k * flipMs, char: DRUM[1 + Math.floor(rng() * (DRUM.length - 1))] });
  tail.forEach((char, i) => flips.push({ at: start + (total - tail.length + i) * flipMs, char }));
  return flips;
}

/** A run of tiles that clatter together: they start `stagger` apart and land `landStagger` apart, left to right. */
export type Plan = { text: string; start: number; land: number; stagger: number; landStagger: number };
export type Flip = { at: number; tile: number; char: string };

/**
 * Every flip on the board, in time order. Tiles are numbered through the plans in order, one per
 * character, which is the order the board renders them in.
 */
export function planFlips(plans: Plan[], rng: () => number, flipMs: number): Flip[] {
  const flips: Flip[] = [];
  let tile = 0;
  for (const plan of plans) {
    Array.from(plan.text).forEach((char, j) => {
      const start = plan.start + j * plan.stagger;
      const land = Math.max(start, plan.land + j * plan.landStagger);
      for (const f of tileFlips(char, start, land, flipMs, rng)) flips.push({ at: f.at, tile, char: f.char });
      tile++;
    });
  }
  // Stable: a tile's own flips keep their order when two tiles share a moment.
  return flips.map((f, i) => ({ f, i })).sort((a, b) => a.f.at - b.f.at || a.i - b.i).map(({ f }) => f);
}

/** When the last tile has landed. */
export const settledAt = (flips: Flip[], flipMs: number) => (flips.length ? flips[flips.length - 1].at + flipMs : 0);

/**
 * The destination, broken onto as few lines as the board has room for. Words stay whole; a
 * single long word gets a line of its own and the tiles shrink to fit it. Never more than three
 * lines: past that the lines get longer instead.
 */
export function wrapLines(text: string, max: number, maxLines = 3): string[] {
  const words = text.split(" ").filter(Boolean);
  if (!words.length) return [""];
  for (let width = max; ; width++) {
    const lines: string[] = [];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && last.length + 1 + word.length <= width) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    if (lines.length <= maxLines) return lines;
  }
}

/** A tile's width (in the board's units) so the longest line fills `room`, but never larger than `cap`. */
export function tileWidth(longest: number, room: number, cap: number): number {
  return Math.min(cap, room / Math.max(1, longest));
}

export type BoardTexts = {
  /** The destination, a line per entry. */
  hero: string[];
  /** Small cells under it: the time, the gate or platform, the nights. */
  info: string[];
  /** The other departures, or the stops on the way; each row a list of cells. */
  rows: string[][];
};

/** Board timings, in ms. */
const T = {
  rowGap: 60,
  rowLand: 600,
  rowLandGap: 220,
  /** A road trip reveals its stops one after another: each lands once the one above it has, and is left to be read. */
  stopGap: 260,
  stopLand: 700,
  stopLandStagger: 36,
  stopPause: 300,
  stagger: 22,
  landStagger: 26,
  /** The destination lands a letter at a time, slowly: this is the moment. */
  heroPause: 320,
  heroStagger: 16,
  heroLetter: 110,
  infoLead: 500,
  infoAfter: 260,
  infoGap: 200,
} as const;

/**
 * The plans for a whole board, in render order: the destination's lines, the info cells, then the
 * rows cell by cell. Every row settles first; then the destination, which has been clattering all
 * along, resolves letter by letter; then the time and gate flip in beside it.
 * `sequential` is the road trip: its rows are the stops, and they arrive in order.
 */
export function boardPlans(texts: BoardTexts, sequential: boolean): Plan[] {
  const rows: Plan[] = [];
  let rowsDone = 0;
  let cursor = T.stopLand;
  texts.rows.forEach((cells, r) => {
    const start = sequential ? r * T.stopGap : r * T.rowGap;
    const land = sequential ? cursor : T.rowLand + r * T.rowLandGap;
    const landStagger = sequential ? T.stopLandStagger : T.landStagger;
    let offset = 0;
    for (const text of cells) {
      rows.push({ text, start: start + offset * T.stagger, land: land + offset * landStagger, stagger: T.stagger, landStagger });
      offset += text.length;
    }
    const done = land + Math.max(0, offset - 1) * landStagger;
    cursor = done + T.stopPause;
    rowsDone = Math.max(rowsDone, done);
  });

  const resolveAt = rowsDone + T.heroPause;
  const hero: Plan[] = [];
  let before = 0;
  for (const text of texts.hero) {
    hero.push({ text, start: before * T.heroStagger, land: resolveAt + before * T.heroLetter, stagger: T.heroStagger, landStagger: T.heroLetter });
    before += text.length;
  }
  const heroDone = resolveAt + Math.max(0, before - 1) * T.heroLetter;

  const info = texts.info.map((text, i) => ({
    text,
    start: Math.max(0, heroDone - T.infoLead),
    land: heroDone + T.infoAfter + i * T.infoGap,
    stagger: 30,
    landStagger: 70,
  }));

  return [...hero, ...info, ...rows];
}
