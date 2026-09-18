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
