import { test, type APIRequestContext } from "@playwright/test";

/**
 * What the server under test can show, for tests that need one state of it. A development server
 * shows either state of the subscriptions switch for ?subscriptions=on|off, and draws the
 * development-only previews (/for-two/preview…); a production build ignores the query, shows what
 * STRIPE_SUBSCRIPTIONS_ENABLED says, and answers the previews 404. Tests that need what the server
 * can't show skip, and say why, rather than fail. (Not a spec file: Playwright doesn't run it.)
 */

/** Skips the running test unless the server sells Ethos for Two the way `wanted` says. */
export async function needSubscriptions(request: APIRequestContext, wanted: "on" | "off") {
  // A visitor's /pricing carries the Monthly/Yearly toggle exactly when subscriptions are sold.
  const html = await (await request.get(`/pricing?subscriptions=${wanted}`)).text();
  const on = html.includes('data-testid="plan-toggle"');
  test.skip(on !== (wanted === "on"), `this server sells Ethos for Two ${on ? "as a subscription" : "as the one-time year"} and ignores ?subscriptions=${wanted} (a production build)`);
}

/** Skips the running test where the development-only previews are a 404 (a production build). */
export async function needPreviews(request: APIRequestContext) {
  const status = (await request.get("/for-two/preview?state=none")).status();
  test.skip(status === 404, "/for-two/preview is development-only: a production build answers 404");
}
