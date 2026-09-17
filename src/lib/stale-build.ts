/**
 * Did this error come from a page that was open while we deployed?
 *
 * Every template is a lazy chunk, and a deploy renames them. A tab holding the old build asks for
 * a filename that no longer exists, the import rejects, and React unwinds to the error boundary —
 * so "I tried to open Jar of Reasons" ends on an error screen for something that is not broken.
 * Each browser words it differently, which is why this matches on several.
 */
const STALE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export function isStaleBuild(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.name === "ChunkLoadError" || STALE.test(error.message ?? "");
}
