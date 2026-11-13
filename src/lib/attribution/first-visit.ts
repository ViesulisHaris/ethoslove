import { getConsent } from "@/lib/analytics/consent";
import { CLICK_PLATFORMS, cleanLanding, isHost, utmValue, visitSource, type VisitSource } from "./source";

/**
 * Where this buyer came from, for their checkout (lib/attribution/source.ts says what is kept).
 *
 * Without a yes to cookies nothing is written to the device: the open tab remembers its first page
 * in memory, the way it remembers a creator's link (lib/attribution/ref.ts), and forgets it when it
 * is closed or reloaded. Only `document.referrer` is read for it, which the browser holds anyway.
 *
 * With a yes, the first visit is also kept in the browser's storage (ethos-first-visit) for 30 days,
 * so a buyer who reads a post today and comes back to pay next week is still counted to the post.
 * Saying no, or taking the yes back from the footer, removes it (privacy policy, section 12).
 */
export const FIRST_VISIT_KEY = "ethos-first-visit";
export const FIRST_VISIT_DAYS = 30;
const FIRST_VISIT_MS = FIRST_VISIT_DAYS * 86_400_000;

export type CheckoutSource = VisitSource & {
  /** True when the first visit came from the browser's storage (the buyer allowed cookies). */
  remembered: boolean;
};

let visit: VisitSource | undefined;

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Takes down this page load's first page, once: later pages of the same visit don't replace it. */
export function rememberVisit(location: { pathname: string; search: string }, referrer: string | null | undefined, now: number = Date.now()): void {
  if (visit) return;
  try {
    visit = visitSource(location, referrer, now);
  } catch {
    // Attribution never gets to break a page: this visit simply goes unrecorded.
    return;
  }
  keepFirstVisit(now);
}

/**
 * Brings the stored first visit in line with the cookie choice: kept once the visitor says yes
 * (this visit, unless an earlier one is still within 30 days), removed the moment the answer is no.
 * Called on every first page and on every change of the choice.
 */
export function keepFirstVisit(now: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    if (getConsent() !== "granted") store.removeItem(FIRST_VISIT_KEY);
    else if (visit && !storedVisit(now)) store.setItem(FIRST_VISIT_KEY, JSON.stringify(visit));
  } catch {
    // Private windows and blocked site data throw: the tab's own visit is then all there is.
  }
}

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

/** The kept first visit, checked again field by field, or nothing (and a bad or old one is removed). */
function storedVisit(now: number): VisitSource | undefined {
  if (getConsent() !== "granted") return undefined;
  const store = storage();
  try {
    const raw = store?.getItem(FIRST_VISIT_KEY);
    if (!raw) return undefined;
    const kept = JSON.parse(raw) as Record<string, unknown>;
    const at = kept.at;
    const landing = text(kept.landing) && cleanLanding(text(kept.landing)!);
    if (typeof at === "number" && now - at >= 0 && now - at < FIRST_VISIT_MS && landing) {
      const found: VisitSource = { landing, at };
      const referrer = text(kept.referrer);
      if (referrer && isHost(referrer)) found.referrer = referrer;
      const utmSource = utmValue(text(kept.utmSource));
      const utmMedium = utmValue(text(kept.utmMedium));
      const utmCampaign = utmValue(text(kept.utmCampaign));
      if (utmSource) found.utmSource = utmSource;
      if (utmMedium) found.utmMedium = utmMedium;
      if (utmCampaign) found.utmCampaign = utmCampaign;
      const click = CLICK_PLATFORMS.find((platform) => platform === kept.click);
      if (click) found.click = click;
      return found;
    }
    store?.removeItem(FIRST_VISIT_KEY);
  } catch {
    // Unreadable or blocked: nothing kept.
  }
  return undefined;
}

/** What checkout sends: the first visit of the last 30 days when kept, else this tab's. */
export function currentSource(now: number = Date.now()): CheckoutSource | undefined {
  const kept = storedVisit(now);
  if (kept) return { ...kept, remembered: true };
  return visit ? { ...visit, remembered: false } : undefined;
}
