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
 * A gift page is someone's private letter, opened at a private link. We run no analytics there
 * and so have nothing to ask about — which also keeps the banner away from the one moment the
 * product is trying to be good at.
 *
 * Takes the path with or without a locale prefix, since callers get it from either Next's
 * `usePathname` (`/es/g/abc`) or next-intl's (`/g/abc`).
 */
export function isPrivatePath(pathname: string): boolean {
  const path = pathname.replace(/^\/(?:en|es)(?=\/|$)/, "");
  return path === "/g" || path.startsWith("/g/");
}
