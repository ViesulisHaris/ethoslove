/**
 * Built, and held back until what it is sold as is on sale.
 *
 * The Advent Calendar (./advent-calendar) is the first template made for group cards, and it cannot
 * be sent without at least three notes from other people, so it is sold only as the group product
 * (docs/GROUP.md). While group cards are switched off there is no panel to collect a note with and
 * checkout refuses the product: in the gallery it would be a gift nobody could send. So it stays out
 * of every list a visitor's page is made from (TEMPLATE_MANIFESTS and TEMPLATE_SLUGS in ./manifests,
 * LOADER_SLUGS in ./registry, SCHEMA_SLUGS in ./schemas: the gallery, the sitemap, the occasion
 * pages, the app's catalogue, the llms brief, checkout, and every table that reads this switch),
 * exactly as the reference template does, and like it is found by its slug under `next dev` only,
 * where it is built, tested and looked at.
 *
 * Two things must both hold for it to be in them, and this is the one place they are put together:
 *
 * 1. ADVENT_CALENDAR_SHIPS below: the code's half, the owner's decision (24 Nov 2026: first on, then held back for its own
 *    release).
 * 2. GROUP_GIFTS_ENABLED is "true" for the build. It is the same server variable that turns group
 *    cards on (lib/group/flag.ts); next.config.ts copies it into the build (`env`), so the browser's
 *    lists and the server's agree. Setting or clearing it in Vercel takes a redeploy, as any variable
 *    does: until then the running deployment keeps the state it was built with, calendar and group
 *    cards together, never one without the other.
 *
 * So with the code's half on and the variable off the site is exactly as it was before the calendar
 * existed, and the variable alone (with the template in the gallery, which is what makes
 * groupGiftsEnabled() true) puts the calendar on sale together with group cards. Apply migration
 * 0023 before setting the variable (docs/GROUP.md, "Going live").
 */
// Held back by the owner, 24 Nov 2026: its own release.
export const ADVENT_CALENDAR_SHIPS: boolean = false;

/** The rule, on its own so a test can play all four states. */
export function adventCalendarLive(ships: boolean, groupGiftsEnabled: string | undefined): boolean {
  return ships && groupGiftsEnabled === "true";
}

/** In the gallery, and in every list and table that reads this, exactly when both halves hold. */
export const ADVENT_CALENDAR_LIVE: boolean = adventCalendarLive(ADVENT_CALENDAR_SHIPS, process.env.GROUP_GIFTS_ENABLED);
