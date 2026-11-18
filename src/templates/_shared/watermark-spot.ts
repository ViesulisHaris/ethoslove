/**
 * Where the floating "Made with Ethos" badge may stay: never on one of the gift's own controls.
 *
 * The badge floats at the foot of the gift, which is exactly where most templates keep their main
 * control ("Read the card", "Skip to the ruling", the blow meter), and a template may put a button
 * anywhere. Some templates lifted their buttons above it by hand and others were missed, so the badge
 * covered Sticker Bomb's "Read the card" and The Council's skip link. Instead the badge looks at what is
 * under it, and stands down while anything that can be pressed is there, as it already does for the end
 * screen (Watermark.tsx).
 */

/** Anything a recipient can press, type in or pick, the way a template marks it up. */
export const GIFT_CONTROLS = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="slider"]',
  '[role="tab"]',
  '[role="option"]',
  '[role="menuitem"]',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** A box on the screen, as getBoundingClientRect gives it. */
export type Box = { left: number; top: number; right: number; bottom: number };

/** Room kept between the badge and a control, in px, so the badge never butts up against a button either. */
export const BADGE_AIR = 4;

/**
 * Whether the badge, at `badge`, would cover the control at `control` in the gift at `gift`: whether it
 * would touch it, with BADGE_AIR to spare. A surface a quarter of the gift or bigger (a "tap anywhere"
 * page, a big photo) only counts if the badge would sit on its middle: the badge can't hide it, and it
 * takes a tap anywhere else.
 */
export function coversControl(badge: Box, control: Box, gift: Box): boolean {
  const width = control.right - control.left;
  const height = control.bottom - control.top;
  // Not laid out (display: none, or nothing in it).
  if (width <= 0 || height <= 0) return false;
  const touches =
    control.left < badge.right + BADGE_AIR &&
    control.right > badge.left - BADGE_AIR &&
    control.top < badge.bottom + BADGE_AIR &&
    control.bottom > badge.top - BADGE_AIR;
  if (!touches) return false;
  const surface = width * height >= ((gift.right - gift.left) * (gift.bottom - gift.top)) / 4;
  if (!surface) return true;
  const x = control.left + width / 2;
  const y = control.top + height / 2;
  return x >= badge.left && x <= badge.right && y >= badge.top && y <= badge.bottom;
}
