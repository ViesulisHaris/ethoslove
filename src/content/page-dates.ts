import { ABOUT_PATH, ABOUT_UPDATED } from "@/content/about";
import { LEGAL_UPDATED } from "@/content/legal";
import { PT_LETTER_PATH, PT_LETTER_UPDATED } from "@/content/pt-letter";

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

/**
 * The day the gift finder goes live, and with it "Who it suits" on every template page, Gifts first
 * in the rooms and the links to the finder. NOT LIVE YET: this is the day the work was finished.
 * Set it to the day it ships; every page it changed reads its date from here, and so does
 * tests/unit/crawl.test.ts.
 */
export const FINDER_LIVE = "2026-11-21";

export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  // Prices went local on 25 Oct: every page showing one changed that day for US visitors and Googlebot.
  // 13 Nov: titles, descriptions and copy aimed at what people search (docs/marketing/KEYWORDS.md).
  // With the finder: Gifts lead the rooms, and the front page, /gifts and the gallery link to it.
  "/": FINDER_LIVE,
  "/gifts": FINDER_LIVE,
  "/gifts/*": "2026-10-24",
  "/gifts/finder": FINDER_LIVE,
  // Its "Is it only for couples?" answer now says a few templates are drawn for couples.
  "/gifts/for-best-friend": FINDER_LIVE,
  // With the finder: the gallery links to it, and every template page gained "Who it suits", with
  // links to the gift-idea pages.
  "/templates": FINDER_LIVE,
  "/templates/*": FINDER_LIVE,
  // A template with a date of its own would otherwise keep the older one: the five given theirs for
  // their search phrases, the holiday three (live 11 Nov) and the second holiday four (live 15 Nov).
  // A template launched after "/templates/*" was set needs its own date too (crawl.test.ts checks).
  "/templates/the-letter": FINDER_LIVE,
  "/templates/constellations": FINDER_LIVE,
  "/templates/scratch-card": FINDER_LIVE,
  "/templates/bouquet": FINDER_LIVE,
  "/templates/fortune-cookie": FINDER_LIVE,
  "/templates/nice-list": FINDER_LIVE,
  "/templates/unwrapped": FINDER_LIVE,
  "/templates/wishbone": FINDER_LIVE,
  "/templates/frosted-window": FINDER_LIVE,
  "/templates/gingerbread-house": FINDER_LIVE,
  "/templates/light-the-candles": FINDER_LIVE,
  "/templates/string-the-lights": FINDER_LIVE,
  "/occasions/*": "2026-10-25",
  "/occasions/birthday": "2026-11-13",
  "/occasions/anniversary": "2026-11-13",
  "/occasions/valentines": "2026-11-13",
  "/occasions/christmas": "2026-11-13",
  "/occasions/long-distance": "2026-11-13",
  "/occasions/thanksgiving": "2026-11-11",
  "/occasions/wedding": "2026-11-09",
  "/games": "2026-11-13",
  "/games/rather": "2026-10-24",
  "/games/deck": "2026-11-13",
  "/games/dare": "2026-11-13",
  "/games/know": "2026-10-24",
  "/long-distance": "2026-11-13",
  "/tools/how-long-have-we-been-together": "2026-11-09",
  "/tools/love-language-quiz": "2026-11-15",
  "/pricing": "2026-10-25",
  // The date the legal pages print at the top.
  "/legal/*": LEGAL_UPDATED,
  [ABOUT_PATH]: ABOUT_UPDATED,
  [PT_LETTER_PATH]: PT_LETTER_UPDATED,
};

/** The day a page last changed (its own date, else its section's), or undefined when it isn't known. */
export function pageUpdated(path: string): string | undefined {
  const own = PAGE_UPDATED[path];
  if (own) return own;
  const parent = path.slice(0, path.lastIndexOf("/"));
  return parent ? PAGE_UPDATED[`${parent}/*`] : undefined;
}
