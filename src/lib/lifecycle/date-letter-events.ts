import "server-only";

import { track } from "@vercel/analytics/server";

/**
 * `letter_confirmed` and `letter_stopped` (BRIEF-letter 6), sent from the server: the confirm and stop
 * pages load no script. No property, so nothing about the person or the row. Sent only for a press on
 * the page behind the link, whose POST carries the token in a hidden field and not in its address,
 * because Vercel's server event records the request's address; and with only the user agent passed
 * on, never the cookies. A mail app's own one-click stop has the token in its address and is not sent
 * (the cron's log counts every stop). In development, without VERCEL_URL, it only logs. Never throws.
 */
export async function letterEvent(name: "letter_confirmed" | "letter_stopped", request: Request): Promise<void> {
  try {
    await track(name, undefined, { headers: { "user-agent": request.headers.get("user-agent") ?? "" } });
  } catch (error) {
    console.error(`[date-letter] ${name} not counted`, (error as Error).message);
  }
}

/** The link's token: in the address (the e-mail's link, a mail app's one-click), or the page's hidden field. */
export async function letterToken(request: Request): Promise<{ token: string | null; fromPage: boolean }> {
  const inAddress = new URL(request.url).searchParams.get("t");
  if (inAddress) return { token: inAddress, fromPage: false };
  if (request.method !== "POST") return { token: null, fromPage: false };
  const form = await request.formData().catch(() => null);
  const field = form?.get("t");
  return typeof field === "string" && field ? { token: field, fromPage: true } : { token: null, fromPage: false };
}
