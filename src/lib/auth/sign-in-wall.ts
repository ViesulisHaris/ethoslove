/**
 * The app's sign-in wall remembers where the person was going (walk-make-4, 23 Nov 2026): a signed-out
 * tap on /account/reminders from a reminder e-mail lands on /login?next=%2Faccount%2Freminders, and
 * signing in carries on there instead of to the dashboard.
 *
 * A layout is not told its path, so the proxy hands it over in a request header, without the locale
 * prefix (/es/account → /account: the login page's own router adds the locale back).
 */
export const ASKED_PATH_HEADER = "x-ethos-asked-path";

/** The pages behind the wall: src/app/[currency]/[locale]/(app). */
export function isBehindWall(path: string): boolean {
  return /^\/(account|dashboard|my-dates)(\/|$)/.test(path);
}

/** Only a same-site path with one leading slash is ever a `next`; anything else is dropped. */
export function wallNext(asked: string | null | undefined): string | null {
  if (!asked || !asked.startsWith("/") || asked.startsWith("//") || asked.startsWith("/\\")) return null;
  if ([...asked].some((c) => c.charCodeAt(0) < 32)) return null;
  return isBehindWall(asked) ? asked : null;
}
