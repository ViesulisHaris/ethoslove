import { getConsent } from "@/lib/analytics/consent";
import { isInApp } from "@/lib/app/bridge";
import { accountDraw, tryOutAllowed } from "./free-tier-split";

/**
 * Which pay panel a premium gift's send screen shows: "one", the gift named with one price and one
 * button, the other plans folded under "More options"; or "classic", the panel with every plan and
 * add-on in view. A share of visitors get "one" (NEXT_PUBLIC_PAY_SHEET_ONE_SHARE, 0 to 1; unset is
 * 0, so nothing changes until the owner turns it on; 1 is everyone).
 *
 * One visitor meets one panel, found in this order: `?pay=one` or `?pay=classic` on the editor's
 * address where the build allows trying things out (never production); this tab's memory; the
 * browser's storage (ethos-pay-sheet), only kept once the visitor allowed cookies; a signed-in
 * sender's account id; otherwise the draw. Inside the iPhone app the App Store's own sheet sells,
 * so the answer there is always "classic".
 */
export const PAY_SHEET_KEY = "ethos-pay-sheet";
/** Tab-only: which panel the pay button was tapped on, read back on the success page to count the sale to it. */
export const PAY_CLICK_KEY = "ethos-pay-click";
export type PayArm = "one" | "classic";

const isArm = (value: unknown): value is PayArm => value === "one" || value === "classic";

/** The share of visitors who get the one-button panel: 0 when unset or unreadable. */
export function paySheetShare(raw: string | undefined = process.env.NEXT_PUBLIC_PAY_SHEET_ONE_SHARE): number {
  const n = Number(raw);
  return raw !== undefined && raw !== "" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** The panel the address asks for (`?pay=one`), where this build honours the ask. */
export function askedPayArm(search: string | null | undefined, allowed: boolean = tryOutAllowed()): PayArm | undefined {
  if (!allowed) return undefined;
  const asked = new URLSearchParams(search ?? "").get("pay");
  return isArm(asked) ? asked : undefined;
}

let tab: PayArm | undefined;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function stored(): PayArm | undefined {
  try {
    const value = getConsent() === "granted" ? storage()?.getItem(PAY_SHEET_KEY) : null;
    return isArm(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function pickPaySheet(options: { userId: string | null; search?: string | null; share?: number; draw?: () => number; inApp?: boolean; tryOut?: boolean }): PayArm {
  if (options.inApp ?? isInApp()) return "classic";
  const share = options.share ?? paySheetShare();
  const arm =
    askedPayArm(options.search, options.tryOut ?? tryOutAllowed()) ??
    // Everyone or no one: no draw to remember, and an old answer in the tab or the browser doesn't hold.
    (share >= 1 ? "one" : share <= 0 ? "classic" : undefined) ??
    tab ??
    stored() ??
    ((options.userId ? accountDraw(options.userId) : (options.draw ?? Math.random)()) < share ? "one" : "classic");
  tab = arm;
  try {
    if (share > 0 && share < 1 && getConsent() === "granted") storage()?.setItem(PAY_SHEET_KEY, arm);
  } catch {
    // Private windows and blocked site data throw: the tab's own answer is then all there is.
  }
  return arm;
}

/**
 * Brings the stored answer in line with the cookie choice: only ever kept for a visitor who said
 * yes, and a no (or taking the yes back) removes it (privacy policy, section 12).
 */
export function keepPaySheet(): void {
  try {
    if (getConsent() !== "granted") storage()?.removeItem(PAY_SHEET_KEY);
  } catch {
    // Nothing stored to bring in line.
  }
}

/** The pay button was tapped on this panel: kept for this tab only, so the success page can count the sale to it. */
export function rememberPayClick(arm: PayArm): void {
  try {
    window.sessionStorage.setItem(PAY_CLICK_KEY, arm);
  } catch {
    // No tab storage: the sale is still counted, just not to a panel.
  }
}

/** The panel the pay button was tapped on, once: reading it forgets it, so a reopened success page doesn't count twice. */
export function takePayClick(): PayArm | null {
  try {
    const value = window.sessionStorage.getItem(PAY_CLICK_KEY);
    window.sessionStorage.removeItem(PAY_CLICK_KEY);
    return isArm(value) ? value : null;
  } catch {
    return null;
  }
}

/** For tests: a new tab. */
export function forgetPaySheet(): void {
  tab = undefined;
}
