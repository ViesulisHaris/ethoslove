import { getConsent } from "@/lib/analytics/consent";

/**
 * The link a visitor arrived through: `?ref=tt-couple` from a TikTok bio, or a gift's short id
 * from the "make your own" button at the end of every gift. It rides along to Stripe Checkout as
 * metadata, so revenue can be split by where people came from (scripts/revenue-by-ref.mjs).
 *
 * Held in memory, never in a cookie, so it needs no consent. It lasts until the tab reloads, which
 * covers the usual landing → editor → checkout visit. One exception: one of our ads' refs (`ad-…`),
 * for a visitor who allowed advertising cookies, is also kept in their browser for as long as Meta
 * counts an ad click (7 days), so a buyer who leaves and comes back to pay is still counted to the
 * ad. The 26 Oct bouquet sale came back four hours after its ad click and arrived with no ref.
 * Saying no, or taking the yes back from the footer, removes it (privacy policy, section 12).
 */
export const REF_PATTERN = /^[a-z0-9-]{1,40}$/;

export const AD_REF_KEY = "ethos-ref";
export const AD_REF_DAYS = 7;
const AD_REF_MS = AD_REF_DAYS * 86_400_000;

let current: string | undefined;

const isAdRef = (ref: string): boolean => ref.startsWith("ad-");

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function rememberRef(search: string, now: number = Date.now()): void {
  const ref = new URLSearchParams(search).get("ref")?.trim().toLowerCase();
  if (!ref || !REF_PATTERN.test(ref)) return;
  current = ref;
  keepAdRef(now);
}

/**
 * Brings the stored ad ref in line with the visitor's cookie choice: the ad they arrived through is
 * kept once they say yes (from the moment they do, if they land first and answer after), and
 * removed the moment the answer is no. Called on every ref and on every change of the choice.
 */
export function keepAdRef(now: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    if (getConsent() !== "granted") store.removeItem(AD_REF_KEY);
    else if (current && isAdRef(current)) store.setItem(AD_REF_KEY, JSON.stringify({ ref: current, at: now }));
  } catch {
    // Private windows and blocked site data throw: the ref then lasts for the tab, as before.
  }
}

function storedAdRef(now: number): string | undefined {
  if (getConsent() !== "granted") return undefined;
  const store = storage();
  try {
    const raw = store?.getItem(AD_REF_KEY);
    if (!raw) return undefined;
    const kept = JSON.parse(raw) as { ref?: unknown; at?: unknown };
    const fresh = typeof kept.at === "number" && now - kept.at >= 0 && now - kept.at < AD_REF_MS;
    if (typeof kept.ref === "string" && REF_PATTERN.test(kept.ref) && isAdRef(kept.ref) && fresh) return kept.ref;
    store?.removeItem(AD_REF_KEY);
  } catch {
    // Unreadable or blocked: no stored ref.
  }
  return undefined;
}

/** The link this visit came through or, failing that, an ad clicked in the last 7 days (see above). */
export function currentRef(now: number = Date.now()): string | undefined {
  return current ?? storedAdRef(now);
}
