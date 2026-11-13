import { LEGAL_UPDATED } from "@/content/legal";

/**
 * When each page's own words last changed, for the sitemap's <lastmod>. Search engines believe
 * lastmod only while it proves true. Until 9 Nov 2026 the sitemap gave 276 of its 340 pages the
 * build time, so every deploy said they had all just changed, and Google stopped trusting our
 * dates (blog posts' real ones too): it had not recrawled the Spanish template pages since 12 Sep.
 *
 * So a date moves only when what the page says moves: its copy, title, questions, links or a
 * price on it. Never for a redeploy, a style change or a fix somewhere else. When you change what
 * a page says, set its date here; one date covers both languages. "/x/*" dates every page under
 * /x that has none of its own. A page without a date sends none, which is honest too. Blog posts
 * carry their own dates (content/blog).
 */
export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  // Prices went local on 25 Oct: every page showing one changed that day for US visitors and Googlebot.
  "/": "2026-10-25",
  "/gifts": "2026-11-09",
  "/gifts/*": "2026-10-24",
  // The holiday three went live on 11 Nov, and every page that lists them gained them that day.
  "/templates": "2026-11-11",
  "/templates/*": "2026-10-25",
  // Free templates show no price, so their last change was the search phrases of 24 Oct.
  "/templates/the-letter": "2026-10-24",
  "/templates/constellations": "2026-10-24",
  "/templates/scratch-card": "2026-11-09",
  "/templates/bouquet": "2026-11-09",
  "/templates/fortune-cookie": "2026-11-09",
  // A template launched after "/templates/*" was set needs its own date (crawl.test.ts checks).
  "/templates/nice-list": "2026-11-11",
  "/templates/unwrapped": "2026-11-11",
  "/templates/wishbone": "2026-11-11",
  "/occasions/*": "2026-10-25",
  "/occasions/birthday": "2026-11-09",
  "/occasions/anniversary": "2026-11-11",
  "/occasions/valentines": "2026-11-09",
  "/occasions/christmas": "2026-11-11",
  "/occasions/thanksgiving": "2026-11-11",
  "/occasions/wedding": "2026-11-09",
  "/games/rather": "2026-10-24",
  "/games/deck": "2026-10-24",
  "/games/dare": "2026-10-24",
  "/games/know": "2026-10-24",
  "/long-distance": "2026-10-25",
  "/tools/how-long-have-we-been-together": "2026-11-09",
  "/pricing": "2026-10-25",
  // The date the legal pages print at the top.
  "/legal/*": LEGAL_UPDATED,
};

/** The day a page last changed (its own date, else its section's), or undefined when it isn't known. */
export function pageUpdated(path: string): string | undefined {
  const own = PAGE_UPDATED[path];
  if (own) return own;
  const parent = path.slice(0, path.lastIndexOf("/"));
  return parent ? PAGE_UPDATED[`${parent}/*`] : undefined;
}
