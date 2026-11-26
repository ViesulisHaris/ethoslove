import type { Occasion } from "@/config/occasions";
import type { GiftGuide } from "@/content/gift-guides";
import type { DemoPhotoId } from "@/templates/_shared/demo-photos";

/**
 * One ecard page: a gift page by kind (content/gift-guides.ts, drawn at /gifts/<slug>) that answers a
 * search with the word "ecard" in it. People search "ecards" some forty times as often as "digital
 * gift" (DataForSEO, US, 26 Nov 2026), and the site hardly used the word.
 *
 * These pages are written by a cloud routine (docs/ecards/PLAYBOOK.md) and reach the live site with
 * nobody reading them first, the way blog posts do: scripts/blog-guard.mjs lets a page through only
 * if its file is data and nothing else, which is why a page is one literal and why what it says about
 * the free gift is a token, filled when the page is drawn (content/blog/fill.ts):
 *
 * - `{note:…|…}`: the first text while the free gift is the short note, the second otherwise;
 * - `{free:names}`: the templates that go out free, by name;
 * - `{count:templates}`: how many templates the gallery has.
 *
 * No price is written on a page, as a token or as a number: the page reads it from PRODUCTS. Every
 * rule the gift pages by kind are held to (tests/unit/gift-guides.test.ts, spread-budget.test.ts,
 * guides-claims.test.ts) holds these too, and tests/unit/ecard-pages.test.ts adds their own.
 */
export type EcardPage = {
  /** The address, /gifts/<slug>: lowercase words joined by hyphens, ending in "ecards". */
  slug: string;
  /** The day the page was added, YYYY-MM-DD: its date in the sitemap. */
  added: string;
  /** The day its words last changed, when that is later than `added`. */
  updated?: string;
  /** The occasion page that links to it, when it has one. */
  occasion?: Occasion;
  /** The sample photo in the polaroid of the page's band (templates/_shared/demo-photos.ts). */
  photo: DemoPhotoId;
  /** The gift on the phone of the page's band: a template's slug. */
  cover: string;
  en: GiftGuide;
  es: GiftGuide;
};
