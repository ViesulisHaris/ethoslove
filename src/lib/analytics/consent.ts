/**
 * Whether the visitor has agreed to analytics that set cookies.
 *
 * The privacy policy promises analytics cookies are set only after consent and that the choice
 * can be changed from the footer, so nothing that sets one may load until this reads "granted".
 * The answer lives in localStorage rather than a cookie: someone who declines should not be
 * given a cookie for having declined.
 */
export type Consent = "granted" | "denied";

const KEY = "ethos-analytics-consent";
const EVENT = "ethos:analytics-consent";

/** `undefined` means "not read yet"; the snapshot has to be stable between renders. */
let cached: Consent | null | undefined;

function read(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // Private windows and blocked site data throw. Treat it as "not asked yet": the banner
    // shows, nothing loads, and the choice simply won't persist.
    return null;
  }
}

export function getConsent(): Consent | null {
  if (cached === undefined) cached = read();
  return cached;
}

export function setConsent(value: Consent): void {
  cached = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Unpersisted is fine; the event below still switches the current page over.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

/** For `useSyncExternalStore`: same tab via our event, other tabs via `storage`. */
export function subscribeToConsent(onChange: () => void): () => void {
  const local = () => onChange();
  const remote = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = undefined;
      onChange();
    }
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", remote);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", remote);
  };
}

/** The server knows nothing about this visitor, so it renders as "not asked". */
export function serverConsent(): Consent | null {
  return null;
}

/**
 * Where session replay must not go. Clarity records the URL as it finds it, so anything with a
 * secret or an id in the path or query has to be kept off it entirely — the same rule the
 * Vercel analytics `redact()` already applies by stripping query strings.
 *
 * - `/g/…`   someone's private letter, opened at a private link, with their photos in it.
 * - `/checkout/…`  carries `?session_id=cs_…`, a Stripe checkout session.
 * - `/dashboard/…`, `/account`  signed-in pages, with gift ids in the path.
 *
 * What is left is the whole public funnel — the pages, the templates, the editor — which is
 * where the questions actually are.
 */
const OFF_LIMITS = ["/g", "/checkout", "/dashboard", "/account"];

/** Takes the path with or without a locale prefix, since callers get it from either router. */
const bare = (pathname: string) => pathname.replace(/^\/(?:en|es)(?=\/|$)/, "");
const under = (path: string, roots: readonly string[]) =>
  roots.some((p) => path === p || path.startsWith(`${p}/`));

export function isPrivatePath(pathname: string): boolean {
  return under(bare(pathname), OFF_LIMITS);
}

/**
 * Where a gift is running, and the bottom of the screen therefore belongs to the gift.
 *
 * A demo is the same gift as `/g/…`, only with the sender's words swapped for ours — the blow,
 * the pour, the shake and the tap all sit in the bottom strip, which is exactly where a banner
 * pinned to the bottom lands. So it stays off these too.
 *
 * Clarity is deliberately *not* kept off `/demo`: it sets nothing without consent, the demos are
 * the funnel, and where people stop watching one is worth knowing. Only the banner moves.
 *
 * The editor keeps the banner, except while its phone preview is up — that is a gift running
 * too, and it says so itself with `data-gift-running` on <html> (see `CookieConsent`).
 */
const NO_BANNER = ["/demo"];

export function hidesConsentBanner(pathname: string): boolean {
  return isPrivatePath(pathname) || under(bare(pathname), NO_BANNER);
}
