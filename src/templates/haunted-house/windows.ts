/**
 * The house's windows, in the house's own 100 × 100 box (see ./art). Each is somewhere the
 * silhouette of a photo's frame can sit, and the order they light up in is the order photos are
 * given to them: the first window to light holds the first photo.
 */
export type Slot = { id: string; cx: number; cy: number; w: number; h: number; round?: boolean };

export const WINDOWS: readonly Slot[] = [
  { id: "main-left", cx: 37, cy: 68, w: 9, h: 13 },
  { id: "main-right", cx: 63, cy: 68, w: 9, h: 13 },
  { id: "tower-top", cx: 18, cy: 44, w: 8, h: 12 },
  { id: "turret", cx: 82, cy: 62, w: 8, h: 12 },
  { id: "attic", cx: 50, cy: 41, w: 9, h: 9, round: true },
  { id: "tower-low", cx: 18, cy: 68, w: 8, h: 12 },
];

/** Who stands in a window until it is opened. */
export const SILHOUETTES = ["cat", "ghost", "witch", "bat", "owl", "candle"] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

/** The most photos the house can show: one to a window. */
export const MAX_PHOTOS = WINDOWS.length;

/** Which photo each window holds, by window index: the first `count` windows have one, the rest are only lit. */
export function photoOf(count: number): (number | null)[] {
  const n = Math.max(0, Math.min(MAX_PHOTOS, count));
  return WINDOWS.map((_, i) => (i < n ? i : null));
}

/** Milliseconds between one window lighting and the next. */
export const LIGHT_EVERY_MS = 420;
