/**
 * Did this error come from a page that was open while we deployed?
 *
 * Every template is a lazy chunk. Skew Protection keeps a tab on the build it was loaded from, but
 * only for so long (12 hours on this project); a tab older than that asks the current build for a
 * chunk it doesn't have, the import rejects, and React unwinds to the error boundary — an error
 * screen for something that is not broken. Each browser words it differently, which is why this
 * matches on several.
 */
const STALE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export function isStaleBuild(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.name === "ChunkLoadError" || STALE.test(error.message ?? "");
}

/** A stale-build error this soon after the last automatic reload means the reload didn't help. */
export const RELOAD_LOOP_MS = 30_000;

/**
 * Should the error screen quietly reload instead? For a stale build, yes — unless the last
 * automatic reload was moments ago, because then reloading again is a loop. It used to be once
 * per tab, which left a tab that met a second deploy hours later on the error screen for good.
 * `lastReloadAt` is null when this tab has not reloaded itself; the old flag's "1" reads as long ago.
 */
export function shouldAutoReload(error: { name?: string; message?: string } | null | undefined, lastReloadAt: number | null, now: number): boolean {
  if (!isStaleBuild(error)) return false;
  if (lastReloadAt === null) return true;
  if (!Number.isFinite(lastReloadAt)) return true;
  // A clock set back since then can't be measured against; treat it as long ago.
  return now < lastReloadAt || now - lastReloadAt > RELOAD_LOOP_MS;
}

/**
 * A chunk also fails to load when the connection drops mid-download (a lift, a tunnel), and that
 * is not ours to apologise for: the screen says the connection dropped, not that something broke.
 */
export function isConnectionError(error: { name?: string; message?: string } | null | undefined, online: boolean): boolean {
  return !online || isStaleBuild(error);
}

/**
 * What "Try again" does. React keeps a rejected chunk import cached by file name, so re-rendering
 * (`reset`) throws the same error at once without asking the network again; only a reload fetches
 * the chunk anew. Any other error gets the gentler re-render, which keeps what's on the page.
 */
export function retryAction(error: { name?: string; message?: string } | null | undefined): "reload" | "reset" {
  return isStaleBuild(error) ? "reload" : "reset";
}

/** Where the tab remembers when it last reloaded itself, so both error screens share one loop guard. */
export const RELOADED_AT = "ethos:stale-chunk-reload";

/** When this tab last reloaded itself; null if never, undefined if there is no storage to ask. */
export function lastAutoReload(): number | null | undefined {
  try {
    const value = sessionStorage.getItem(RELOADED_AT);
    return value === null ? null : Number(value);
  } catch {
    return undefined;
  }
}

/** Remember this reload. Only called once storage has answered, so a failure here is not expected. */
export function markAutoReload(now = Date.now()): void {
  try {
    sessionStorage.setItem(RELOADED_AT, String(now));
  } catch {
    // Without storage the next error simply won't auto-reload: see lastAutoReload's `undefined`.
  }
}

/** For useSyncExternalStore: `navigator.onLine`, which the error screens word themselves by. */
export function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
