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
 * The day the growth build's "pages" area last changed what its pages say: the six gift pages by
 * kind, /digital-cards, the eight new idea lists, and the links /gifts, the /gifts/for-* pages,
 * birthday and anniversary gained. None of it is live yet, so this is a date on a branch (22 Nov:
 * the pages were laid out again with far fewer words on show, new titles for three of them, and
 * every occasion's ideas as cards; 23 Nov: a page by kind names the price of the gift in its
 * phone, the price list runs from the least to the most, and the Spanish Christmas letter's title
 * changed). The day it ships, set this one line to that day.
 */
const GROWTH_PAGES_DAY = "2026-11-23";

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

export const PAGE_UPDATED: Readonly<Record<string, string>> = {
  // Prices went local on 25 Oct: every page showing one changed that day for US visitors and Googlebot.
  // 13 Nov: titles, descriptions and copy aimed at what people search (docs/marketing/KEYWORDS.md).
  "/": "2026-11-15",
  // The gift pages by kind (content/gift-guides.ts) and /digital-cards are new, and /gifts and every
  // /gifts/for-* page gained their links.
  "/gifts": GROWTH_PAGES_DAY,
  "/gifts/*": GROWTH_PAGES_DAY,
  "/digital-cards": GROWTH_PAGES_DAY,
  // The holiday three went live on 11 Nov, and every page that lists them gained them that day.
  "/templates": "2026-11-11",
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
  "/occasions/*": "2026-10-25",
  // Eight occasions gained their idea lists (content/occasion-ideas.ts), and birthday and
  // anniversary a row of links to the gift pages by kind.
  "/occasions/birthday": GROWTH_PAGES_DAY,
  "/occasions/anniversary": GROWTH_PAGES_DAY,
  // Their twelve ideas are cards since 22 Nov, each a title and one line where there was a paragraph.
  "/occasions/valentines": GROWTH_PAGES_DAY,
  "/occasions/christmas": GROWTH_PAGES_DAY,
  "/occasions/long-distance": GROWTH_PAGES_DAY,
  "/occasions/thanksgiving": GROWTH_PAGES_DAY,
  "/occasions/wedding": GROWTH_PAGES_DAY,
  "/occasions/graduation": GROWTH_PAGES_DAY,
  "/occasions/mothers-day": GROWTH_PAGES_DAY,
  "/occasions/fathers-day": GROWTH_PAGES_DAY,
  "/occasions/apology": GROWTH_PAGES_DAY,
  "/occasions/just-because": GROWTH_PAGES_DAY,
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
