import { getConsent } from "@/lib/analytics/consent";
import { isInApp } from "@/lib/app/bridge";
import { noteShare } from "@/lib/gift/free-tier";

export { noteShare };

/**
 * Which free version a Letter started now is held to (lib/gift/free-tier.ts): "note", the short note
 * with photos and a long letter paid, or "classic", the rules before it. A test: a share of new
 * drafts get the note (NEXT_PUBLIC_FREE_NOTE_SHARE, 0 to 1; unset is 0, so nothing changes until
 * the owner turns it on), and the gift's own data then carries the answer for good.
 *
 * One visitor should meet one version, so the answer is looked for in this order:
 *  1. `?free=note` or `?free=classic` on the editor's address: for trying a version out, and only
 *     where the build allows it (NEXT_PUBLIC_FREE_NOTE_TRYOUT=on: a local or preview build, never
 *     production, where it would be a way to pick the roomier rules).
 *  2. This tab's memory: every Letter started in one visit matches.
 *  3. The browser's storage (ethos-free-tier), only kept once the visitor allowed cookies, like the
 *     first-visit record (lib/attribution/first-visit.ts): a later visit matches too.
 *  4. A signed-in sender's account id: the same answer on every device, nothing stored.
 *  5. Otherwise the draw.
 * Inside the iPhone app the answer is always "classic": the app's own sheet sells what it lists.
 */
export const FREE_TIER_KEY = "ethos-free-tier";
export type FreeTierArm = "note" | "classic";

const isArm = (value: unknown): value is FreeTierArm => value === "note" || value === "classic";

/** Whether this build honours `?free=` on the editor's address. Off unless it says "on". */
export function tryOutAllowed(raw: string | undefined = process.env.NEXT_PUBLIC_FREE_NOTE_TRYOUT): boolean {
  return raw === "on";
}

/** A number in [0, 1) that is always the same for one account. */
export function accountDraw(userId: string): number {
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) h = Math.imul(h ^ userId.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** The version the address asks for (`?free=note`), if it asks for one. */
export function armFromSearch(search: string | null | undefined): FreeTierArm | undefined {
  const asked = new URLSearchParams(search ?? "").get("free");
  return isArm(asked) ? asked : undefined;
}

/** The version the address asks for, where this build honours the ask. */
export function askedArm(search: string | null | undefined, allowed: boolean = tryOutAllowed()): FreeTierArm | undefined {
  return allowed ? armFromSearch(search) : undefined;
}

let tab: FreeTierArm | undefined;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function stored(): FreeTierArm | undefined {
  try {
    const value = getConsent() === "granted" ? storage()?.getItem(FREE_TIER_KEY) : null;
    return isArm(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function remember(arm: FreeTierArm): void {
  tab = arm;
  try {
    if (getConsent() === "granted") storage()?.setItem(FREE_TIER_KEY, arm);
  } catch {
    // Private windows and blocked site data throw: the tab's own answer is then all there is.
  }
}

export function pickFreeTier(options: { userId: string | null; search?: string | null; share?: number; draw?: () => number; inApp?: boolean; tryOut?: boolean }): FreeTierArm {
  if (options.inApp ?? isInApp()) return "classic";
  const share = options.share ?? noteShare();
  const arm =
    askedArm(options.search, options.tryOut ?? tryOutAllowed()) ??
    tab ??
    stored() ??
    ((options.userId ? accountDraw(options.userId) : (options.draw ?? Math.random)()) < share ? "note" : "classic");
  remember(arm);
  return arm;
}

/**
 * Brings the stored answer in line with the cookie choice: it is only ever kept for a visitor who
 * said yes, and a no (or taking the yes back) removes it, as the privacy policy says (section 12).
 * Called on every change of the choice (components/shared/ref-capture.tsx).
 */
export function keepFreeTier(): void {
  try {
    if (getConsent() !== "granted") storage()?.removeItem(FREE_TIER_KEY);
    else if (tab) storage()?.setItem(FREE_TIER_KEY, tab);
  } catch {
    // Private windows and blocked site data throw: there is nothing stored to bring in line.
  }
}

/** For tests: a new tab. */
export function forgetFreeTier(): void {
  tab = undefined;
}
