import { getConsent } from "@/lib/analytics/consent";
import { isInApp } from "@/lib/app/bridge";
import { accountDraw, tryOutAllowed } from "./free-tier-split";

/**
 * The Letter's send screen, in two versions (the owner's decision, 20 Nov 2026, after the short
 * free note changed almost nothing: twice as many people were shown the price and no more of them
 * paid; half took their photos out and sent free).
 *
 * "keep": the send screen shows the note with and without their photos; taking the photos out
 * shows them and offers to keep them in the note for less ("a note with photos", the "photos"
 * product, lib/pricing/products.ts); and a letter over the free length gets a pay button where its
 * writer is cutting words. "plain": the send screen as it was.
 *
 * A share of visitors get "keep" (NEXT_PUBLIC_LETTER_KEEP_SHARE, 0 to 1; unset is 0, so nothing
 * changes until the owner turns it on; 1 is everyone). One visitor meets one version, found in this
 * order: `?keep=on` or `?keep=off` on the editor's address where the build allows trying things out
 * (never production); this tab's memory; the browser's storage (ethos-letter-keep), only kept once
 * the visitor allowed cookies; a signed-in sender's account id; otherwise the draw. Inside the
 * iPhone app the App Store's own sheet sells, so the answer there is always "plain".
 */
export const LETTER_KEEP_KEY = "ethos-letter-keep";
/** Tab-only: which version the pay button was tapped on, read back on the success page to count the sale to it. */
export const LETTER_CLICK_KEY = "ethos-letter-click";
export type KeepArm = "keep" | "plain";

const isArm = (value: unknown): value is KeepArm => value === "keep" || value === "plain";

/** The share of visitors who get the "keep" version: 0 when unset or unreadable. */
export function keepShare(raw: string | undefined = process.env.NEXT_PUBLIC_LETTER_KEEP_SHARE): number {
  const n = Number(raw);
  return raw !== undefined && raw !== "" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** The version the address asks for (`?keep=on`), where this build honours the ask. */
export function askedKeepArm(search: string | null | undefined, allowed: boolean = tryOutAllowed()): KeepArm | undefined {
  if (!allowed) return undefined;
  const asked = new URLSearchParams(search ?? "").get("keep");
  return asked === "on" ? "keep" : asked === "off" ? "plain" : undefined;
}

let tab: KeepArm | undefined;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function stored(): KeepArm | undefined {
  try {
    const value = getConsent() === "granted" ? storage()?.getItem(LETTER_KEEP_KEY) : null;
    return isArm(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function pickKeep(options: { userId: string | null; search?: string | null; share?: number; draw?: () => number; inApp?: boolean; tryOut?: boolean }): KeepArm {
  if (options.inApp ?? isInApp()) return "plain";
  const share = options.share ?? keepShare();
  const arm =
    askedKeepArm(options.search, options.tryOut ?? tryOutAllowed()) ??
    // Everyone or no one: no draw to remember, and an old answer in the tab or the browser doesn't hold.
    (share >= 1 ? "keep" : share <= 0 ? "plain" : undefined) ??
    tab ??
    stored() ??
    ((options.userId ? accountDraw(options.userId) : (options.draw ?? Math.random)()) < share ? "keep" : "plain");
  tab = arm;
  try {
    if (share > 0 && share < 1 && getConsent() === "granted") storage()?.setItem(LETTER_KEEP_KEY, arm);
  } catch {
    // Private windows and blocked site data throw: the tab's own answer is then all there is.
  }
  return arm;
}

/**
 * Brings the stored answer in line with the cookie choice: only ever kept for a visitor who said
 * yes, and a no (or taking the yes back) removes it (privacy policy, section 12).
 */
export function keepLetterKeep(): void {
  try {
    if (getConsent() !== "granted") storage()?.removeItem(LETTER_KEEP_KEY);
  } catch {
    // Nothing stored to bring in line.
  }
}

/** A pay button was tapped on this version of the Letter's send screen: kept for this tab only. */
export function rememberLetterClick(arm: KeepArm): void {
  try {
    window.sessionStorage.setItem(LETTER_CLICK_KEY, arm);
  } catch {
    // No tab storage: the sale is still counted, just not to a version.
  }
}

/** The version the pay button was tapped on, once: reading it forgets it, so a reopened success page doesn't count twice. */
export function takeLetterClick(): KeepArm | null {
  try {
    const value = window.sessionStorage.getItem(LETTER_CLICK_KEY);
    window.sessionStorage.removeItem(LETTER_CLICK_KEY);
    return isArm(value) ? value : null;
  } catch {
    return null;
  }
}

/** For tests: a new tab. */
export function forgetKeep(): void {
  tab = undefined;
}

/**
 * Whether "a note with photos" can be offered for this gift as it stands: a note that holds one to
 * `max` photos and nothing else that is paid (no letter over the free length, no video, no voice
 * message, no schedule). Anything more needs "Make it special", and the offer would not send it.
 */
export function canKeepPhotos(gift: { photos: number; longLetter: boolean; others: boolean }, max: number): boolean {
  return gift.photos >= 1 && gift.photos <= max && !gift.longLetter && !gift.others;
}
