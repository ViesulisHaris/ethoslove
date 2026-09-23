import { mulberry32 } from "../_shared/random";

/**
 * Where the luggage tags wait and where each lands in the case, in the suitcase's own units (--k,
 * measured from the case's top-left: the lid is x 0–45, the base x 46–91, both 58 tall). Seeded, so
 * a gift packs the same way every time it is opened.
 */

export const TAG = { w: 30, h: 15 } as const;
/** Packed tags shrink to this: they're lying in the case now, a little further away. */
export const PACKED_SCALE = 0.74;
/** Once the lid is down it covers exactly this. Every packed tag has to be under it. */
export const LID_CLOSED = { x: 46, y: 0, w: 45, h: 58 } as const;

/** How the tags sit in rows under the case, for one to five of them. */
const ROWS: Record<number, number[]> = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2] };
const ROW_TOP = [70, 88];
/** How far a tag's string loop reaches left of the tag itself (see .pyb-string and TagString). */
export const STRING_REACH = 4.2;
/** A row of three sits a little right of the case's middle, so the first tag's string loop stays on a
 * phone's screen instead of running off its edge; the string is part of the tag, so the row is centred with it. */
const CENTRES: Record<number, number[]> = { 1: [45.5], 2: [29, 62], 3: [16, 47.25, 78.5] };

/** Five spots in the base, packed like a real case: two columns, staggered, nothing hanging over the edge. */
const SLOTS = [
  { x: 64, y: 13 },
  { x: 75, y: 21 },
  { x: 63.5, y: 29.5 },
  { x: 75.5, y: 37.5 },
  { x: 66, y: 45 },
];

export type TrayTag = { x: number; y: number; tilt: number };
export type Slot = { x: number; y: number; rot: number };

/** Top-left corner of each tag where it waits, with a small tilt. */
export function trayLayout(count: number, seed: number): TrayTag[] {
  const rng = mulberry32(seed ^ 0x7a9);
  const rows = ROWS[Math.min(5, Math.max(1, count))] ?? [1];
  const out: TrayTag[] = [];
  rows.forEach((inRow, r) => {
    for (const cx of CENTRES[inRow]) {
      if (out.length >= count) break;
      out.push({ x: cx - TAG.w / 2 + (rng() - 0.5) * 2.4, y: ROW_TOP[r] + (rng() - 0.5) * 2, tilt: (rng() - 0.5) * 10 });
    }
  });
  return out;
}

/** The centre each tag lands on in the base, and how far round it has turned by then (a full spin and a bit). */
export function slotLayout(count: number, seed: number): Slot[] {
  const rng = mulberry32(seed ^ 0x51075);
  return SLOTS.slice(0, Math.min(5, Math.max(0, count))).map((slot, i) => ({
    x: slot.x + (rng() - 0.5) * 2,
    y: slot.y + (rng() - 0.5) * 2,
    rot: (i % 2 ? 360 : -360) + (rng() - 0.5) * 28,
  }));
}

/** How far the tag has to fly (centre to centre), and how high the arc goes. */
export function tossPath(from: TrayTag, to: Slot, lift = 16) {
  const dx = to.x - (from.x + TAG.w / 2);
  const dy = to.y - (from.y + TAG.h / 2);
  return { dx, dy, peak: Math.min(0, dy) - lift };
}
