/**
 * The geometry of a top-fold pop-up card, as angles the CSS applies.
 *
 * The base lies on a table tilted BASE_TILT degrees away from the screen. The lid is hinged on
 * the base's far edge: at -180° it lies shut over the base, and it rises to stand parallel to
 * the screen, which is -BASE_TILT (the tilt undone), leaning back a touch beyond that. Every
 * pop-up piece stands on the base the same way, but starts flat and rises as the lid does, a
 * little after it, as a paper piece pulled up by the fold would.
 */
export const BASE_TILT = 58;
/** Shut, the card is held up to be read; it settles down onto the table as it opens. */
export const SHUT_TILT = 24;
export const LID_SHUT = -180;
export const LID_OPEN = -(BASE_TILT + 4);
export const PIECE_UP = -BASE_TILT;

/** Ease-out with a small overshoot, so the lid and the pieces settle rather than stop. */
export function settle(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  const c = 1.2;
  return 1 + c * Math.pow(x - 1, 3) + (c - 1) * Math.pow(x - 1, 2);
}

/** The lid's rotation for `open` from 0 (shut) to 1 (standing). */
export function lidAngle(open: number): number {
  return LID_SHUT + (LID_OPEN - LID_SHUT) * settle(open);
}

/** The table's tilt for `open`: nearly upright while shut, laid down once open. */
export function baseTilt(open: number): number {
  return SHUT_TILT + (BASE_TILT - SHUT_TILT) * settle(open);
}

/**
 * A piece's rotation for `open`, starting `delay` of the way through the opening, so pieces at
 * the back rise before the ones in front and the cake comes up last, tier by tier.
 */
export function pieceAngle(open: number, delay: number): number {
  const span = Math.max(0.2, 1 - delay);
  const t = (open - delay) / span;
  return PIECE_UP * settle(t);
}

/** The shadow a standing piece throws on the base: nothing while flat, full once it stands. */
export function pieceShadow(open: number, delay: number): number {
  return Math.min(1, Math.max(0, (open - delay) / Math.max(0.2, 1 - delay)));
}

/** How many candles a paper cake takes: one to five, from the number of tiers' worth of room. */
export function candleCount(age: number | undefined): number {
  if (!age || !Number.isFinite(age)) return 5;
  return Math.max(1, Math.min(5, Math.round(age)));
}

/** The topper's digits, or nothing for no age. */
export function topperDigits(age: number | undefined): string[] {
  if (!age || !Number.isFinite(age)) return [];
  return String(Math.round(Math.min(120, Math.max(1, age)))).split("");
}
