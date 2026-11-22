/**
 * Built, and held back until what it is sold as is on sale.
 *
 * The Advent Calendar (./advent-calendar) is the first template made for group cards, and it cannot
 * be sent without at least three notes from other people, so it is sold only as the group product
 * (docs/GROUP.md). While group cards are switched off there is no panel to collect a note with and
 * checkout refuses the product: in the gallery it would be a gift nobody could send. So it stays out
 * of every list a visitor's page is made from (TEMPLATE_MANIFESTS and TEMPLATE_SLUGS in ./manifests,
 * LOADER_SLUGS in ./registry, SCHEMA_SLUGS in ./schemas: the gallery, the sitemap, the occasion
 * pages, the app's catalogue, the llms brief, checkout), exactly as the reference template does, and
 * like it is found by its slug under `next dev` only, where it is built, tested and looked at.
 *
 * Setting this to true is what puts it on the site. Do it in the same deploy that sets
 * GROUP_GIFTS_ENABLED (docs/GROUP.md, "Going live", step 3), never before: the first template in
 * the gallery with `features.group` is also what lets that variable turn group cards on.
 */
export const ADVENT_CALENDAR_LIVE: boolean = false;
