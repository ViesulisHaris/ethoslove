/**
 * The paper's geometry. Seven silhouettes and the six folds between them: the sheet, three
 * halvings, the base opening out, the neck and tail turned up, and a wing rising into a crane.
 *
 * A fold is a part that stays put and a flap that moves over it, and the two together are always
 * exactly what is on the table — so the paper answers a press continuously and never cuts from
 * one shape to the next. A flap's two positions have the same corners in the same order, so a
 * plain point-by-point blend is the fold seen from above: a corner turning about a crease travels
 * a circle in the air, and that circle, looked down on, is the straight line between where it
 * started and where it lands.
 */

export type Pt = [number, number];

/** Everything is drawn inside this square, so one width scales the whole thing. */
export const BOX = 140;

/** The sheet, then the shape left after each fold. */
export const SHEETS: readonly string[] = [
  // a square on the table
  "M28 26 L112 26 L112 110 L28 110 Z",
  // corner to corner
  "M28 26 L112 110 L28 110 Z",
  // and again: a triangle standing on its base
  "M70 68 L112 110 L28 110 Z",
  // and again: a narrow half
  "M70 68 L112 110 L70 110 Z",
  // opened out into the base
  "M70 46 L96 80 L70 108 L44 80 Z",
  // the two points turned up: a neck and a tail
  "M70 46 L78 56 L120 40 L96 80 L70 108 L44 80 L24 44 L62 56 Z",
  // the head folded over
  "M70 46 L78 56 L120 40 L96 80 L70 108 L44 80 L24 44 L12 50 L30 32 L62 56 Z",
];

/** The near wing, once it is up. The last fold's flap lands exactly here. */
export const WING_NEAR: Pt[] = [
  [58, 58],
  [70, 8],
  [90, 62],
  [90, 62],
];

/** The far wing, behind the body: a little smaller, a shade deeper. */
export const WING_FAR: Pt[] = [
  [72, 58],
  [88, 22],
  [96, 60],
  [96, 60],
];

/** Which paper a piece shows: the side facing up, one layer over it, or two. */
export type Tone = "face" | "shade" | "deep";

export type Flap = { from: Pt[]; to: Pt[]; tone: Tone };

export type Fold = {
  /** The silhouette that stays still under the flap, as an index into SHEETS. */
  base: number | null;
  /** What visibly moves. Two of them when both points of the base turn at once. */
  flaps: Flap[];
  /** The line it turns on: the dotted hint, and where the press target sits. */
  crease: [Pt, Pt];
};

export const FOLDS: readonly Fold[] = [
  // 1 · corner onto corner
  {
    base: 1,
    flaps: [
      {
        from: [
          [28, 26],
          [112, 26],
          [112, 110],
          [112, 110],
        ],
        to: [
          [28, 26],
          [28, 110],
          [112, 110],
          [112, 110],
        ],
        tone: "shade",
      },
    ],
    crease: [
      [28, 26],
      [112, 110],
    ],
  },
  // 2 · in half again
  {
    base: 2,
    flaps: [
      {
        from: [
          [28, 26],
          [70, 68],
          [28, 110],
          [28, 110],
        ],
        to: [
          [112, 110],
          [70, 68],
          [28, 110],
          [28, 110],
        ],
        tone: "shade",
      },
    ],
    crease: [
      [70, 68],
      [28, 110],
    ],
  },
  // 3 · half of the half
  {
    base: 3,
    flaps: [
      {
        from: [
          [28, 110],
          [70, 68],
          [70, 110],
          [70, 110],
        ],
        to: [
          [112, 110],
          [70, 68],
          [70, 110],
          [70, 110],
        ],
        tone: "deep",
      },
    ],
    crease: [
      [70, 68],
      [70, 110],
    ],
  },
  // 4 · the narrow half opens out into the base, both sides at once
  {
    base: null,
    flaps: [
      {
        from: [
          [70, 68],
          [112, 110],
          [70, 110],
          [70, 110],
        ],
        to: [
          [70, 46],
          [96, 80],
          [70, 108],
          [70, 108],
        ],
        tone: "face",
      },
      {
        from: [
          [70, 68],
          [112, 110],
          [70, 110],
          [70, 110],
        ],
        to: [
          [70, 46],
          [44, 80],
          [70, 108],
          [70, 108],
        ],
        tone: "shade",
      },
    ],
    crease: [
      [70, 68],
      [112, 110],
    ],
  },
  // 5 · both points turn up: a neck on one side, a tail on the other
  {
    base: 4,
    flaps: [
      {
        from: [
          [78, 56],
          [96, 80],
          [70, 108],
          [70, 108],
        ],
        to: [
          [78, 56],
          [96, 80],
          [120, 40],
          [120, 40],
        ],
        tone: "shade",
      },
      {
        from: [
          [62, 56],
          [44, 80],
          [70, 108],
          [70, 108],
        ],
        to: [
          [62, 56],
          [44, 80],
          [24, 44],
          [24, 44],
        ],
        tone: "shade",
      },
    ],
    crease: [
      [44, 80],
      [96, 80],
    ],
  },
  // 6 · the head folds over, the wing comes up, and it is a crane
  {
    base: 5,
    flaps: [
      {
        from: [
          [63, 56],
          [72, 52],
          [78, 58],
          [78, 58],
        ],
        to: WING_NEAR,
        tone: "shade",
      },
      {
        from: [
          [24, 44],
          [33, 53],
          [29, 48],
          [29, 48],
        ],
        to: [
          [24, 44],
          [12, 50],
          [30, 32],
          [30, 32],
        ],
        tone: "face",
      },
    ],
    crease: [
      [58, 58],
      [90, 62],
    ],
  },
];

export const STEPS = FOLDS.length;

/**
 * Halving a sheet leaves the paper hugging one edge of the frame, so each silhouette carries the
 * shift that puts it back in the middle of the table. It is applied once the fold has landed, the
 * way a hand nudges the paper straight again before starting the next crease.
 */
export const SHEET_SHIFT: readonly Pt[] = [
  [0, 2],
  [0, 2],
  [0, -19],
  [-21, -19],
  [0, -7],
  [0, -4],
  [0, 0],
];

/** How wide the paper's shadow is at each stage: half the width of the mass sitting on the table. */
export const SHEET_SHADOW: readonly number[] = [42, 40, 40, 20, 26, 26, 22];

/** Where the paper has been nudged to after this many folds. */
export function sheetShift(done: number): Pt {
  return SHEET_SHIFT[stageIndex(done)] ?? [0, 0];
}

/** How wide its shadow is, after this many folds. */
export function sheetShadow(done: number): number {
  return SHEET_SHADOW[stageIndex(done)] ?? SHEET_SHADOW[0];
}

/** The corners of a silhouette, read back out of the path it is written as. */
export function sheetPoints(index: number): Pt[] {
  const d = SHEETS[stageIndex(index)] ?? SHEETS[0];
  const numbers = d.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const points: Pt[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push([Number(numbers[i]), Number(numbers[i + 1])]);
  }
  return points;
}

/**
 * Where the paper's weight sits, side to side, after this many folds — the middle of the area,
 * not the middle of the frame, so a sheet folded down to one side keeps its shadow underneath it.
 */
export function shadowX(done: number): number {
  const pts = sheetPoints(done);
  let area = 0;
  let x = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
  }
  if (!area) return BOX / 2;
  return round(x / (3 * area));
}

function stageIndex(done: number): number {
  return Math.max(0, Math.min(STEPS, Math.floor(done) || 0));
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** A flap part-way through its fold. */
export function lerpPts(from: Pt[], to: Pt[], t: number): Pt[] {
  const k = clamp01(t);
  return from.map((p, i) => {
    const q = to[i] ?? p;
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k] as Pt;
  });
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Corners to an SVG path. Repeated corners are how a triangle is written as four points. */
export function polyPath(points: Pt[]): string {
  if (!points.length) return "";
  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L")} Z`;
}

/** The middle of a crease: where the press target and its ring sit. */
export function creaseMid([a, b]: readonly [Pt, Pt]): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * The sender writes between one and six lines and every line is one press. There are always six
 * folds in a crane, so the presses share them out: the press drives the first fold of its group
 * and the rest of the group follows on by itself, and the line is said once the group is done.
 */
export function foldPlan(lines: number): number[][] {
  const groups = Math.max(1, Math.min(STEPS, Math.floor(lines) || 1));
  const base = Math.floor(STEPS / groups);
  const extra = STEPS % groups;
  const out: number[][] = [];
  let step = 0;
  for (let g = 0; g < groups; g++) {
    const size = base + (g < extra ? 1 : 0);
    out.push(Array.from({ length: size }, (_, i) => step + i));
    step += size;
  }
  return out;
}

/** The sender's lines, tidied: no blanks, no stray spaces, never more than there are folds. */
export function usableLines(
  lines: readonly string[] | undefined,
  fallback: readonly string[] = [],
): string[] {
  const clean = (list: readonly string[]) =>
    list
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, STEPS);
  const written = clean(lines ?? []);
  return written.length ? written : clean(fallback);
}
