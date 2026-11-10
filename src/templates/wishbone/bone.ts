/**
 * The wishbone's mechanics, out of the component so they can be tested: how far a pull turns the
 * arm being pulled, when the bone gives, and where its pieces come to rest once it has. The bone
 * is stiff: an arm turns about the joint, it does not bend. Lengths are stage units (100 across,
 * 170 down); the bone's own points (its joint, its tips) come from the art map.
 */

export type Pt = { x: number; y: number };
/** A piece's place: turned about the joint (degrees, clockwise as the screen sees it), then moved. */
export type Pose = { turn: number; shift: Pt };

/** How far the tip can be pulled, in stage units, before the bone gives. */
export const GIVE = 20;
/** The strains at which it creaks louder on the way to giving. */
export const CREAKS = [0.35, 0.6, 0.82] as const;
/** How much of a pull the whole bone goes with, before the pulled arm takes the rest. */
const LEAN = 0.12;

/** A pull, limited to how far the bone goes: the tip follows the finger, never past GIVE. */
export function clampPull(d: Pt): Pt {
  const len = Math.hypot(d.x, d.y);
  if (len <= GIVE || len === 0) return d;
  return { x: (d.x / len) * GIVE, y: (d.y / len) * GIVE };
}

/** How close it is to giving, 0 to 1. */
export const strainOf = (d: Pt) => Math.min(1, Math.hypot(d.x, d.y) / GIVE);

/** How far the pulled arm turns about the joint for its tip to point at where the finger has taken it. */
export function armTurn(joint: Pt, tip: Pt, pull: Pt): number {
  const p = clampPull(pull);
  const from = Math.atan2(tip.y - joint.y, tip.x - joint.x);
  const to = Math.atan2(tip.y + p.y - joint.y, tip.x + p.x - joint.x);
  let turn = ((to - from) * 180) / Math.PI;
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  return turn;
}

/** The bone under a pull, before it gives: all of it leans a little the way it is pulled, and the pulled (right) arm turns. */
export function strained(joint: Pt, tip: Pt, pull: Pt): { head: Pose; left: Pose; right: Pose } {
  const p = clampPull(pull);
  const shift = { x: p.x * LEAN, y: p.y * LEAN };
  const turn = armTurn(joint, tip, pull);
  const rest: Pose = { turn: turn * 0.08, shift };
  return { head: rest, left: rest, right: { turn, shift } };
}

/**
 * Where the pieces come to rest once it gives. The winner keeps the head, so the head goes
 * wherever the winner's arm goes; the other arm is left on its own. `turn` is how far the pulled
 * arm had turned when it gave: the arm let go of keeps that and a little more.
 */
export function settled(winner: "them" | "me", turn: number): { head: Pose; left: Pose; right: Pose } {
  if (winner === "them") {
    const big: Pose = { turn: 7, shift: { x: 7, y: 4 } };
    return { head: big, right: big, left: { turn: -12, shift: { x: -6, y: 5 } } };
  }
  const big: Pose = { turn: -6, shift: { x: -5, y: 2 } };
  return { head: big, left: big, right: { turn: turn + 8, shift: { x: 8, y: 6 } } };
}

/** The pull a tap makes on its own, towards the recipient's side and down, at `t` from 0 to 1. */
export const autoPull = (t: number): Pt => {
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  return { x: GIVE * 0.86 * e, y: GIVE * 0.52 * e };
};
