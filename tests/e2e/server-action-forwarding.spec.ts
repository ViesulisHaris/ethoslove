import { expect, test, type APIRequestContext } from "@playwright/test";
import { needProductionBuild } from "./server-state";

/**
 * The editor's autosave can go off just after the person has left the editor (its store outlives the
 * page), so it is posted from whatever page they are on; Next then passes it on to the editor's code
 * at /[currency]/[locale]/create/[templateSlug], which the proxy must serve rather than send to the
 * not-found page (src/lib/server-action-forwarding.ts). Signed out, the save only answers
 * "unauthenticated" (or "not_configured" without Supabase), so nothing is written anywhere.
 * Meaningful against a production build (`npm run start`), where each page has its own code.
 */

const SAVE = [{ giftId: "00000000-0000-0000-0000-000000000000", data: {}, expectDraft: true }];

/** The autosave's action id, read from the editor's own scripts, so the test follows any build. */
async function saveDraftId(request: APIRequestContext): Promise<string> {
  const html = await (await request.get("/create/the-letter")).text();
  const scripts = [...new Set(html.match(/\/_next\/static\/[^"']+?\.js/g) ?? [])];
  for (const src of scripts) {
    const code = await (await request.get(src)).text();
    const found = code.match(/"([0-9a-f]{42})",\s*[\w$.]*callServer,\s*void 0,\s*[\w$.]*findSourceMapURL,\s*"saveDraft"/);
    if (found) return found[1];
  }
  throw new Error(`no saveDraft reference in the editor's ${scripts.length} scripts`);
}

async function postSave(request: APIRequestContext, page: string, id: string, origin: string) {
  return request.post(page, {
    headers: { "next-action": id, accept: "text/x-component", "content-type": "text/plain;charset=UTF-8", origin },
    data: JSON.stringify(SAVE),
  });
}

test.describe("an editor save posted from another page", () => {
  // The editor's scripts carry the autosave's reference the way this test reads it in a production build only: under
  // `next dev` it is not found (the final pass of 25 Nov 2026: fails on a dev server, 2 of 2 pass against the build).
  test.beforeEach(async ({ request }) => needProductionBuild(request));
  test("reaches the editor's code from the templates page and the dashboard", async ({ request, baseURL }) => {
    const id = await saveDraftId(request);
    const origin = new URL(baseURL!).origin;
    for (const page of ["/create/the-letter", "/templates", "/dashboard"]) {
      const res = await postSave(request, page, id, origin);
      const body = await res.text();
      expect(res.status(), `${page}: ${body.slice(0, 200)}`).toBe(200);
      expect(res.headers()["x-nextjs-action-not-found"], page).toBeUndefined();
      expect(body, page).toMatch(/"ok":false,"error":"(unauthenticated|not_configured)"/);
    }
  });
});
