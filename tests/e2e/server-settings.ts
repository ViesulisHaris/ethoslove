import type { APIRequestContext } from "@playwright/test";

/**
 * The free-note setting (NEXT_PUBLIC_FREE_NOTE_SHARE) of the server under test, as /pricing prints it on its
 * root (`data-note-share`). Read from the page, never from the shell running the tests: the two can differ,
 * and a test that took the shell's word failed on a correct page and could not catch a page that disagreed
 * with its own server (pricing-D11, 24 Nov 2026).
 */
export async function serverNoteShare(request: APIRequestContext): Promise<number> {
  const html = await (await request.get("/pricing")).text();
  const found = html.match(/data-note-share="([^"]*)"/);
  if (!found) throw new Error("/pricing does not print data-note-share: the free-note setting cannot be read");
  return Number(found[1]);
}
