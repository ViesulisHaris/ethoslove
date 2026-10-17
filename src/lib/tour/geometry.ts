/**
 * Where the tour's spotlight and card go, as plain arithmetic on rectangles so it can be tested
 * without a browser. All coordinates are viewport pixels, the way getBoundingClientRect gives them.
 */
export type Box = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
/** Screen edges the page can't draw under: the notch and the home indicator. */
export type Insets = { top: number; bottom: number };

/** Below this width the card docks to the top or bottom of the screen instead of floating by the target. */
export const PHONE_MAX = 640;
/** Air between the edge of the screen and the card. */
export const EDGE = 16;
/** Air between the lit target and the card. */
export const GAP = 14;
/** How much of the page around the target is lit with it. */
export const SPOT_PAD = 8;
/** The card beside a target on a wide screen. */
export const CARD_WIDTH = 360;
/** On a phone the card spans the screen, up to this. */
const PHONE_CARD_MAX = 440;

const NO_INSETS: Insets = { top: 0, bottom: 0 };
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

export const isPhone = (viewport: Size) => viewport.width < PHONE_MAX;

export function cardWidth(viewport: Size): number {
  return isPhone(viewport) ? Math.min(viewport.width - 2 * EDGE, PHONE_CARD_MAX) : Math.min(CARD_WIDTH, viewport.width - 2 * EDGE);
}

/**
 * The lit area: the target with a little room round it, clipped to the screen. A target taller than
 * the screen (a long form section) then reads as one lit band rather than a hole with no edges.
 */
export function spotlight(target: Box, viewport: Size, pad = SPOT_PAD): Box {
  const top = Math.max(target.top - pad, 2);
  const left = Math.max(target.left - pad, 2);
  const bottom = Math.min(target.top + target.height + pad, viewport.height - 2);
  const right = Math.min(target.left + target.width + pad, viewport.width - 2);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export type CardSpot = { top: number; left: number; width: number; dock: "top" | "bottom" | "float" | "center" };

/**
 * Where the card goes, given the lit area (or none) and the card's own height at this width.
 *
 * On a phone it docks to the bottom edge, where a thumb is, unless the target is down there too;
 * then it docks to the top. It never sits on the target unless the target leaves no room at either
 * end. On a wider screen it floats beside the target: below, above, right, then left.
 */
export function placeCard(spot: Box | null, cardHeight: number, viewport: Size, insets: Insets = NO_INSETS): CardSpot {
  const width = cardWidth(viewport);
  const centred = (viewport.width - width) / 2;
  const bottomTop = viewport.height - insets.bottom - EDGE - cardHeight;
  const topTop = insets.top + EDGE;

  if (!spot) {
    return isPhone(viewport)
      ? { dock: "bottom", top: bottomTop, left: centred, width }
      : { dock: "center", top: Math.max(topTop, (viewport.height - cardHeight) / 2), left: centred, width };
  }

  const spotBottom = spot.top + spot.height;

  if (isPhone(viewport)) {
    if (spotBottom + GAP <= bottomTop) return { dock: "bottom", top: bottomTop, left: centred, width };
    if (spot.top - GAP >= topTop + cardHeight) return { dock: "top", top: topTop, left: centred, width };
    // Room at neither end: cover the end of it that shows less.
    const above = spot.top;
    const below = viewport.height - spotBottom;
    return above > below ? { dock: "top", top: topTop, left: centred, width } : { dock: "bottom", top: bottomTop, left: centred, width };
  }

  const alignedLeft = clamp(spot.left + spot.width / 2 - width / 2, EDGE, viewport.width - width - EDGE);
  const below = spotBottom + GAP;
  if (below + cardHeight <= viewport.height - insets.bottom - EDGE) return { dock: "float", top: below, left: alignedLeft, width };
  const above = spot.top - GAP - cardHeight;
  if (above >= topTop) return { dock: "float", top: above, left: alignedLeft, width };

  const besideTop = clamp(spot.top + spot.height / 2 - cardHeight / 2, topTop, viewport.height - insets.bottom - EDGE - cardHeight);
  const right = spot.left + spot.width + GAP;
  if (right + width <= viewport.width - EDGE) return { dock: "float", top: besideTop, left: right, width };
  const left = spot.left - GAP - width;
  if (left >= EDGE) return { dock: "float", top: besideTop, left, width };

  // Nowhere clear of it: the bottom corner, where it hides least of something this big.
  return { dock: "bottom", top: bottomTop, left: viewport.width - width - EDGE, width };
}

/**
 * How far to scroll the page so the target lands in `band`, the part of the screen that is neither
 * under the page's bar nor under a docked card. Nothing when it is already there; centred in the
 * band when it isn't; top-aligned when it is taller than the band, since its top is where to start.
 */
export function scrollNeeded(target: Box, band: { top: number; bottom: number }): number {
  const bottom = target.top + target.height;
  if (target.top >= band.top && bottom <= band.bottom) return 0;
  if (target.height > band.bottom - band.top) return target.top - band.top;
  return target.top + target.height / 2 - (band.top + band.bottom) / 2;
}

/** The band a target should be scrolled into, for this screen and a card of this height. */
export function scrollBand(viewport: Size, topInset: number, cardHeight: number, insets: Insets = NO_INSETS): { top: number; bottom: number } {
  const top = Math.max(topInset, insets.top) + EDGE;
  // On a phone the card is docked at the bottom, so the target has to land above it.
  const bottom = isPhone(viewport) ? viewport.height - insets.bottom - EDGE - cardHeight - GAP : viewport.height - insets.bottom - EDGE;
  return { top, bottom: Math.max(bottom, top + 1) };
}

/** The softest corner the lit area gets, for targets that are square themselves. */
const MIN_SPOT_RADIUS = 14;

/**
 * The lit area's corners follow the target's, grown by the padding, so a pill is lit as a pill
 * and a card as a card. Never rounder than half its height.
 */
export function spotRadius(targetRadius: number, spotHeight: number, pad = SPOT_PAD): number {
  return Math.max(0, Math.min(Math.max(targetRadius + pad, MIN_SPOT_RADIUS), spotHeight / 2));
}

/** One step of an exponential glide from `from` to `to`; `k` is 1 for a jump. */
export function glide(from: Box, to: Box, k: number): Box {
  const step = (a: number, b: number) => (Math.abs(b - a) < 0.5 ? b : a + (b - a) * k);
  return { top: step(from.top, to.top), left: step(from.left, to.left), width: step(from.width, to.width), height: step(from.height, to.height) };
}
