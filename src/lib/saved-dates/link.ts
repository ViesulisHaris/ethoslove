import { useSyncExternalStore } from "react";

/**
 * Which saved date the plan on this device is, if any. The working plan stays where it always was
 * (`ethos.dates.plan.v1`, usePlan); opening or saving a date links it here, and while it is linked
 * every change to the plan is saved back to the account (use-saved-plan-sync). `synced` is the plan
 * as last saved, so a change is told apart from a plan that only looks different after a reload.
 * Every tab reads the same link, as every tab reads the same plan.
 */
export type SavedLink = {
  id: string;
  version: number;
  /** planKey() of the plan as last saved. */
  synced: string;
  /** Whether the date is this person's own, or their partner's. */
  mine: boolean;
  /** Whose date it is, when it isn't theirs: "Sam's date". */
  ownerName: string | null;
};

export const LINK_KEY = "ethos.dates.saved.v1";
const EVENT = "ethos:saved-link";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A stored link, or null when it isn't one (an older format, a hand edit, nothing). */
export function parseLink(raw: string | null): SavedLink | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const { id, version, synced, mine, ownerName } = value ?? {};
    if (typeof id !== "string" || !UUID.test(id) || !Number.isSafeInteger(version) || (version as number) < 1 || typeof synced !== "string" || typeof mine !== "boolean") return null;
    return { id, version: version as number, synced, mine, ownerName: typeof ownerName === "string" ? ownerName : null };
  } catch {
    return null;
  }
}

// One parse per change, and the same object back until the next one, as useSyncExternalStore needs.
let cache: { raw: string | null; link: SavedLink | null } = { raw: null, link: null };

export function readLink(): SavedLink | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LINK_KEY);
  } catch {
    // Storage off (private mode): the link lives for this page only, like the plan.
    return cache.link;
  }
  if (raw !== cache.raw) cache = { raw, link: parseLink(raw) };
  return cache.link;
}

/** Link the plan to a saved date, or unlink it (null). */
export function writeLink(link: SavedLink | null): void {
  const raw = link ? JSON.stringify(link) : null;
  cache = { raw, link };
  try {
    if (raw) window.localStorage.setItem(LINK_KEY, raw);
    else window.localStorage.removeItem(LINK_KEY);
  } catch {
    // Nowhere to keep it; it still holds for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useSavedLink(): SavedLink | null {
  return useSyncExternalStore(subscribe, readLink, () => null);
}

/**
 * "Save it once I'm signed in": set before the sign-in dialog opens, read when the page comes back.
 * In localStorage rather than sessionStorage, because a magic link opens a new tab, whose session
 * storage is empty; it only counts for half an hour, so a sign-in days later saves nothing by surprise.
 */
const SAVE_AFTER_KEY = "ethos.saveAfterSignIn";
const SAVE_AFTER_MS = 30 * 60 * 1000;

export function rememberSaveAfterSignIn(what: string): void {
  try {
    window.localStorage.setItem(SAVE_AFTER_KEY, JSON.stringify({ what, at: Date.now() }));
  } catch {
    // Without storage it can't be remembered; they save by hand once they're back.
  }
}

/** What was waiting to be saved (`"plan"`, `"trip:<id>"`), taken so it happens once. */
export function takeSaveAfterSignIn(what: (value: string) => boolean): string | null {
  try {
    const raw = window.localStorage.getItem(SAVE_AFTER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { what?: unknown; at?: unknown };
    if (typeof value.what !== "string" || !what(value.what)) return null;
    window.localStorage.removeItem(SAVE_AFTER_KEY);
    return typeof value.at === "number" && Date.now() - value.at < SAVE_AFTER_MS ? value.what : null;
  } catch {
    return null;
  }
}
