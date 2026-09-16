/**
 * What the gift may honestly say about a sensor, before and after the recipient answers for it.
 *
 * The old test for "does this device hold motion behind a tap" was "does `requestPermission`
 * exist", which used to mean iOS. Chrome answers it now too — on a laptop with no sensor in it —
 * so that test alone makes a gift ask a desktop to tilt, and, worse, makes it wait for a tap that
 * an Android phone never needed before it will listen at all. Two things fix that: listen
 * straight away everywhere, and only treat the sensor as gated on something you hold.
 *
 * The rules are pure so the prompt can be tested: what the gift asks for, what it offers, and
 * what it admits this machine cannot do.
 */

/** How long a phone is given to report before the gift offers the permission link. */
export const SENSE_GRACE_MS = 700;

/** What the recipient has said to the permission prompt, if it has been put to them. */
export type SensorAnswer = null | "granted" | "denied";

export type Sense = {
  /** A reading has arrived: this device genuinely feels it. */
  supported: boolean;
  /** Worth asking for the gesture at all — a phone that reports, or one that will once asked. */
  expected: boolean;
  /** Nothing will arrive until they tap, so offer the link. */
  needsPermission: boolean;
};

/**
 * True only for a device that both hides the sensor behind a prompt and is held in a hand.
 * `touch` is the coarse-pointer test, which is what actually separates a phone from a laptop.
 */
export function sensorGate(api: unknown, touch: boolean): boolean {
  if (!api || !touch) return false;
  const req = (api as { requestPermission?: unknown }).requestPermission;
  return typeof req === "function";
}

/** Is this something held in a hand? Client-only; a laptop and the server both say no. */
export function phoneLike(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * `quiet` is "the grace window has passed with nothing arriving", measured again after every
 * answer — so a phone that has just been granted permission is never written off before its
 * first reading, and one that was granted permission and still says nothing is.
 */
export function senseOf({
  gated,
  reading,
  answer,
  quiet,
}: {
  gated: boolean;
  reading: boolean;
  answer: SensorAnswer;
  quiet: boolean;
}): Sense {
  if (reading) return { supported: true, expected: true, needsPermission: false };
  return {
    supported: false,
    // Refused, or asked and answered and still silent: this is a button's job now.
    expected: gated && answer !== "denied" && !(answer === "granted" && quiet),
    needsPermission: gated && answer === null && quiet,
  };
}
