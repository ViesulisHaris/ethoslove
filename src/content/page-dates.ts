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
 * The day the gift finder goes live, and with it Gifts first in the rooms and the links to the
 * finder. NOT LIVE YET: this is the day the work was finished. Set it to the day it ships; every
 * page it changed reads its date from here. The template pages take GUIDES_LIVE below: who each
 * suits now sits in the redesigned page's closed block, and ships with that page.
 */
export const FINDER_LIVE = "2026-11-22";

/**
 * The day the template guides of the growth build go live (content/template-guides.ts): sixteen
 * template pages gain what people make with them, lines to borrow and their own questions, and the
 * bouquet page's Mother's Day line changes. With them goes every template's page as redesigned on
 * 21 Nov 2026 (far fewer words on show, new lines beside each section, the steps written out only
 * in a closed block), so every template page takes this date. They are not live yet, and a date
 * that runs ahead of the page is the kind search engines stop believing: whoever ships them sets
 * this to that day. It is the one line to set: tests/unit/crawl.test.ts reads it from here.
 */
export const GUIDES_LIVE = "2026-11-21";

/**
 * The day the redrawn gallery goes live: the gallery and every occasion's page show the same new
 * cards (a gift's name, a line written for the card, its price, one link to its page and one to
 * the editor, where each card had a longer line, a price and "Try the live demo"), and the row of
 * occasions over them. Every page that draws the gallery takes this date, the seven occasions with
 * a date of their own included. NOT LIVE YET: this is the day the work was finished. Whoever ships
 * it sets this to that day (tests/unit/crawl.test.ts reads it from here).
 */
export const GALLERY_LIVE = "2026-11-22";

/**
 * The day the games of the growth build go live: today's question, the games' new end screen, how
 * to play and the questions on every game's page, the hub's three tiers, and the new games.
 * NOT LIVE YET: set it to the day they ship. Every games page reads its date from here.
 */
export const GAMES_LIVE = "2026-11-23";

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
  // A row of Christmas gifts while Christmas is in season (15 Nov to 25 Dec), linked to the finder.
  "/gifts/for-boyfriend": FINDER_LIVE,
  "/gifts/for-girlfriend": FINDER_LIVE,
  // With the finder the gallery links to it; then the gallery itself was redrawn.
  "/templates": GALLERY_LIVE,
  "/templates/*": GUIDES_LIVE,
  // The two free templates, then the three pages that had a guide before the growth build (13 Nov).
  "/templates/the-letter": GUIDES_LIVE,
  "/templates/constellations": GUIDES_LIVE,
  "/templates/scratch-card": GUIDES_LIVE,
  "/templates/bouquet": GUIDES_LIVE,
  "/templates/fortune-cookie": GUIDES_LIVE,
  // A template launched after "/templates/*" was set needs its own date (crawl.test.ts checks).
  "/templates/nice-list": GUIDES_LIVE,
  "/templates/unwrapped": GUIDES_LIVE,
  "/templates/wishbone": GUIDES_LIVE,
  // The second holiday batch went live on the night of 15 Nov (UTC); their words last changed with their guides.
  "/templates/frosted-window": GUIDES_LIVE,
  "/templates/gingerbread-house": GUIDES_LIVE,
  "/templates/light-the-candles": GUIDES_LIVE,
  "/templates/string-the-lights": GUIDES_LIVE,
  // The other nine templates with a guide. The eight above that already had a date moved to GUIDES_LIVE too.
  "/templates/birthday-cinema": GUIDES_LIVE,
  "/templates/xoxo": GUIDES_LIVE,
  "/templates/the-council": GUIDES_LIVE,
  "/templates/bloom": GUIDES_LIVE,
  "/templates/halfway": GUIDES_LIVE,
  "/templates/snow-globe": GUIDES_LIVE,
  "/templates/jar-of-reasons": GUIDES_LIVE,
  "/templates/our-timeline": GUIDES_LIVE,
  "/templates/scrapbook": GUIDES_LIVE,
  // Every occasion's page draws the gallery's cards and its row of occasions, so all of them changed
  // with it. (Seven had a later date of their own than the rest, 9 to 13 Nov; the gallery's is later still.)
  "/occasions/*": GALLERY_LIVE,
  "/games": GAMES_LIVE,
  "/games/*": GAMES_LIVE,
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
