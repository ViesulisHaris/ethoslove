/**
 * Server Action requests as the proxy (src/proxy.ts) sees them.
 *
 * A page whose code doesn't have the action it was sent hands it to the page that does: Next posts it
 * again, to that route's own pattern on this host, marked `x-action-forwarded`
 * (next/dist/server/app-render/action-handler.js, createForwardedActionResponse). The editor's store
 * outlives the editor, and its autosave goes off up to 1.8 s after the last keystroke, so tapping back
 * to /templates sent the save from /templates, and Next passed it on as POST
 * /[currency]/[locale]/create/[templateSlug]. Rewritten like a visitor's address, that landed on the
 * not-found catch-all, and the save failed ("Server Action … was not found"): 55 times for about 25
 * signed-in people in the week to 18 Nov 2026, most of them seconds after leaving the editor.
 */

/** The route's own first two segments, as Next writes them; no visitor's address has brackets. */
const ROUTE_ROOT = /^\/(?:\[|%5B)currency(?:\]|%5D)\/(?:\[|%5B)locale(?:\]|%5D)(?=\/|$)/i;

type ActionRequest = { method: string; headers: Pick<Headers, "has">; nextUrl: { pathname: string } };

/**
 * Where a passed-on Server Action is served from: the route's pattern with the hidden currency and
 * language segments filled in, as for any visitor (/[currency]/[locale]/create/[templateSlug] becomes
 * /usd/en/create/[templateSlug], the editor's code). Null for every other request. Next renders no
 * page for a passed-on action, only its result, so the slug standing in brackets is never looked up.
 */
export function forwardedActionPath(request: ActionRequest, currency: string, locale: string): string | null {
  if (request.method !== "POST" || !request.headers.has("x-action-forwarded") || !request.headers.has("next-action")) return null;
  const { pathname } = request.nextUrl;
  const root = ROUTE_ROOT.exec(pathname);
  return root ? `/${currency}/${locale}${pathname.slice(root[0].length)}` : null;
}

/**
 * A Server Action call from the browser: the router posts it with the action's id in `next-action`.
 * Its sign-in session is refreshed here before the action runs, whatever page it came from. Should
 * Next have to pass the action on, it drops the passed-on answer's Set-Cookie, so a session refreshed
 * only there would never reach the browser, and Supabase would then refuse the browser's refresh
 * token, which that refresh had already used up.
 */
export function isServerActionPost(request: Pick<ActionRequest, "method" | "headers">): boolean {
  return request.method === "POST" && request.headers.has("next-action");
}
