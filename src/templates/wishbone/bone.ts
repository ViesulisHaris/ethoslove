/**
 * The wishbone's geometry, out of the component so it can be tested: where the two arms run, how
 * they bend under a pull, when the bone gives, and how it splits into a big half and a small one.
 * Everything is in the drawing's own 0–100 units.
 */

export type Pt = { x: number; y: number };
export type Curve = [Pt, Pt, Pt];

/** The joint at the top, and the two ends: the sender holds the left, the recipient pulls the right. */
export const APEX: Pt = { x: 50, y: 20 };
export const LEFT_END: Pt = { x: 23, y: 80 };
export const RIGHT_END: Pt = { x: 77, y: 80 };
const LEFT_BOW: Pt = { x: 31, y: 40 };
const RIGHT_BOW: Pt = { x: 69, y: 40 };

/** How far the right end can be pulled, in drawing units, before the bone gives. */
export const GIVE = 22;
/** Where along the losing arm it breaks, from the joint: the winner's half keeps this much of it. */
export const BREAK_AT = 0.24;
/** The strains at which it creaks louder on the way to giving. */
export const CREAKS = [0.35, 0.6, 0.82] as const;

const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** A pull, limited to how far the bone goes: the end follows the finger, never past GIVE. */
export function clampPull(d: Pt): Pt {
  const len = Math.hypot(d.x, d.y);
  if (len <= GIVE || len === 0) return d;
  return { x: (d.x / len) * GIVE, y: (d.y / len) * GIVE };
}

/** How close it is to giving, 0 to 1. */
export const strainOf = (d: Pt) => Math.min(1, Math.hypot(d.x, d.y) / GIVE);

/** Both arms as quadratic curves from the joint, bent by a pull `d` on the right end. */
export function arms(d: Pt): { left: Curve; right: Curve } {
  const p = clampPull(d);
  // The joint gives a little towards the pull, and the right arm bows the way it is dragged.
  const apex = add(APEX, p, 0.14);
  return {
    left: [apex, add(LEFT_BOW, p, 0.06), LEFT_END],
    right: [apex, add(RIGHT_BOW, p, 0.38), add(RIGHT_END, p)],
  };
}

/** A curve split at `t` (de Casteljau): the part from its start, and the rest. */
export function split([a, b, c]: Curve, t: number): [Curve, Curve] {
  const ab = lerp(a, b, t);
  const bc = lerp(b, c, t);
  const m = lerp(ab, bc, t);
  return [
    [a, ab, m],
    [m, bc, c],
  ];
}

/**
 * The two halves once it gives. The winner keeps the joint, their own arm and a stub of the other;
 * the loser is left holding the rest of theirs. `winner` is whose side gets the big half.
 */
export function halves(d: Pt, winner: "them" | "me"): { big: Curve[]; small: Curve[] } {
  const { left, right } = arms(d);
  if (winner === "them") {
    const [stub, rest] = split(left, BREAK_AT);
    return { big: [right, stub], small: [rest] };
  }
  const [stub, rest] = split(right, BREAK_AT);
  return { big: [left, stub], small: [rest] };
}

export const pathOf = ([a, b, c]: Curve) => `M${a.x.toFixed(2)} ${a.y.toFixed(2)}Q${b.x.toFixed(2)} ${b.y.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;

/** The pull a tap makes on its own, towards the recipient's side and down, at `t` from 0 to 1. */
export const autoPull = (t: number): Pt => {
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return { x: GIVE * 0.86 * e, y: GIVE * 0.52 * e };
};
