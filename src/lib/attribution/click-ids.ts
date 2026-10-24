/**
 * The ad click a visitor arrived through: Meta adds `?fbclid=` to every Facebook and Instagram ad
 * link, TikTok adds `?ttclid=`. Held the way `ref` is (lib/attribution/ref.ts): in memory only, never
 * in a cookie or storage, until the tab reloads. They only ever leave the browser for a buyer who said
 * yes to advertising cookies, inside their checkout (lib/analytics/ads.ts), so the sale an ad led to
 * can be reported against that click.
 */
const CLICK_ID = /^[A-Za-z0-9_.-]{1,400}$/;

type Click = { id: string; at: number };
const clicks: { fbclid?: Click; ttclid?: Click } = {};

export function rememberClickIds(search: string, now: number = Date.now()): void {
  const params = new URLSearchParams(search);
  for (const key of ["fbclid", "ttclid"] as const) {
    const id = params.get(key)?.trim();
    // The same click seen again (a reload, a client-side step) keeps the time it was first seen.
    if (id && CLICK_ID.test(id) && id !== clicks[key]?.id) clicks[key] = { id, at: now };
  }
}

/**
 * Meta's click id as its `_fbc` cookie spells it: `fb.1.<ms when first seen>.<fbclid>`, where 1
 * says the cookie belongs to the registrable domain (tryethos.io).
 */
export function currentFbc(): string | undefined {
  const click = clicks.fbclid;
  return click ? `fb.1.${click.at}.${click.id}` : undefined;
}

/** TikTok's click id, as it came. */
export function currentTtclid(): string | undefined {
  return clicks.ttclid?.id;
}
