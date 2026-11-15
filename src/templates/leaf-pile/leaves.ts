import { mulberry32 } from "../_shared/random";

/** The loose leaves' pictures: three kinds in four colours (scripts/art/holiday/leaf_pile.py). */
export const LEAF_SPRITES = ["maple", "oak", "beech"].flatMap((kind) => ["red", "orange", "gold", "brown"].map((c) => `leaf-${kind}-${c}`));

/** A leaf on the ground: where its middle is (stage units), its turn and size, and how it is moving. */
export type Leaf = { sprite: string; x: number; y: number; rot: number; scale: number; vx: number; vy: number; vr: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };
type Pt = { x: number; y: number };

/** How far round the finger a leaf is pushed, in stage units. */
export const BRUSH = 11;
/** The fastest a leaf slides, in stage units a second. */
const TOP_SPEED = 260;

/**
 * The pile, the same every time for the same two names: a jittered grid over the card so that none
 * of it shows, more on top of that, and a few round its edges.
 */
export function scatter(seed: number, card: Box): Leaf[] {
  const rnd = mulberry32(seed);
  const leaf = (x: number, y: number, scale: number): Leaf => ({ sprite: LEAF_SPRITES[Math.floor(rnd() * LEAF_SPRITES.length)], x, y, rot: rnd() * 360, scale, vx: 0, vy: 0, vr: 0 });
  const out: Leaf[] = [];
  const w = card.x1 - card.x0;
  const h = card.y1 - card.y0;
  const cols = 7;
  const rows = 6;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push(leaf(card.x0 + (w * (c + 0.5)) / cols + (rnd() - 0.5) * 7, card.y0 + (h * (r + 0.5)) / rows + (rnd() - 0.5) * 7, 1.05 + rnd() * 0.35));
  for (let i = 0; i < 30; i++) out.push(leaf(card.x0 + rnd() * w, card.y0 + rnd() * h, 0.95 + rnd() * 0.45));
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    out.push(leaf((card.x0 + card.x1) / 2 + Math.cos(a) * (w / 2 + 4 + rnd() * 8), (card.y0 + card.y1) / 2 + Math.sin(a) * (h / 2 + 4 + rnd() * 8), 0.8 + rnd() * 0.4));
  }
  return out;
}

const cap = (l: Leaf) => {
  const v = Math.hypot(l.vx, l.vy);
  if (v > TOP_SPEED) {
    l.vx *= TOP_SPEED / v;
    l.vy *= TOP_SPEED / v;
  }
};

/**
 * A finger passing `at`, moving at `finger` (units a second): every leaf near it is shoved away from
 * it and along with it, harder the nearer it is, and set spinning. Returns how many it moved.
 */
export function brush(leaves: Leaf[], at: Pt, finger: Pt, reach = BRUSH, shove = 70): number {
  let moved = 0;
  for (const l of leaves) {
    const dx = l.x - at.x;
    const dy = l.y - at.y;
    const d = Math.hypot(dx, dy);
    if (d >= reach) continue;
    const f = 1 - d / reach;
    const ux = d > 0.01 ? dx / d : 1;
    const uy = d > 0.01 ? dy / d : 0;
    l.vx += ux * shove * f + finger.x * 0.55 * f;
    l.vy += uy * shove * f + finger.y * 0.55 * f;
    l.vr += (ux * finger.y - uy * finger.x >= 0 ? 1 : -1) * (120 + 260 * f);
    cap(l);
    moved++;
  }
  return moved;
}

/** The wind taking what is left: every leaf blown off away from the card's middle, and a little to the right. */
export function gust(leaves: Leaf[], from: Pt, seed = 3) {
  const rnd = mulberry32(seed);
  for (const l of leaves) {
    const dx = l.x - from.x;
    const dy = l.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 170 + rnd() * 110;
    l.vx = (dx / d) * speed + 50;
    l.vy = (dy / d) * speed - 20;
    l.vr = (rnd() - 0.5) * 900;
  }
}

/** Moves every leaf on by `dt` seconds, slowing as it slides. Returns whether any is still moving. */
export function step(leaves: Leaf[], dt: number): boolean {
  const slow = Math.exp(-dt * 3.2);
  const spin = Math.exp(-dt * 3);
  let moving = false;
  for (const l of leaves) {
    if (!l.vx && !l.vy && !l.vr) continue;
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
    l.vx *= slow;
    l.vy *= slow;
    l.vr *= spin;
    if (Math.hypot(l.vx, l.vy) < 0.6 && Math.abs(l.vr) < 2) {
      l.vx = 0;
      l.vy = 0;
      l.vr = 0;
    } else moving = true;
  }
  return moving;
}

/** How many leaves still lie on the card (their middles inside it, a little in from its edges). */
export function onCard(leaves: Leaf[], card: Box, inset = 4): number {
  return leaves.filter((l) => l.x > card.x0 + inset && l.x < card.x1 - inset && l.y > card.y0 + inset && l.y < card.y1 - inset).length;
}
