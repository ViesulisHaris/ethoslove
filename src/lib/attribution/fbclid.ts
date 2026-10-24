/**
 * The Facebook or Instagram ad click a visitor arrived through: Meta adds `?fbclid=` to every ad
 * link. Held the way `ref` is (lib/attribution/ref.ts): in memory only, never in a cookie or
 * storage, until the tab reloads. It only ever leaves the browser for a buyer who said yes to
 * advertising cookies, inside their checkout (lib/analytics/meta.ts), so the sale it led to can be
 * reported to Meta against that click.
 */
const FBCLID = /^[A-Za-z0-9_-]{1,400}$/;

let click: { id: string; at: number } | undefined;

export function rememberFbclid(search: string, now: number = Date.now()): void {
  const id = new URLSearchParams(search).get("fbclid")?.trim();
  // The same click seen again (a reload, a client-side step) keeps the time it was first seen.
  if (id && FBCLID.test(id) && id !== click?.id) click = { id, at: now };
}

/**
 * Meta's click id as its `_fbc` cookie spells it: `fb.1.<ms when first seen>.<fbclid>`, where 1
 * says the cookie belongs to the registrable domain (tryethos.io).
 */
export function currentFbc(): string | undefined {
  return click ? `fb.1.${click.at}.${click.id}` : undefined;
}
