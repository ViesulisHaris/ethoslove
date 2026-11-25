import type { GiftLocale } from "@/lib/gift/schema";
import { noteForEveryone, sendsFree } from "@/lib/gift/free-tier";
import { CHARGED_CURRENCIES, PRODUCTS, formatAmount, type Currency, type ProductId } from "@/lib/pricing/products";
import { getManifest, listManifests } from "@/templates/manifests";
import type { BlogBlock, BlogContent, RichText } from "./types";

/**
 * The facts a post states about Ethos itself, read from the code when the page is drawn instead of
 * typed into the post, so the next price, template or free-tier change can't leave a post behind
 * (reports/seoaudit-audit.md, B5 to B10). A post writes:
 *
 * - `{price:single}`: that product's price in the page's currency (lib/pricing/products.ts), the way
 *   every other page shows a price. Any product id works: single, pick3, everything, extras, photos…
 * - `{count:templates}`: how many templates the gallery has.
 * - `{free:names}`: the templates that go out free (`sendsFree`), as a list: "The Letter", or "The
 *   Letter and Constellations".
 * - `{free:<template slug>}`: "free" while that template goes out free, "paid once" when it doesn't
 *   (Spanish "gratis", "de pago único"): "[The Letter](/templates/the-letter) is {free:the-letter}".
 * - `{note:…|…}`: the first text while the free gift is the short note (the free note for everyone,
 *   as the live site has it), the second otherwise. Each side is plain post text and may hold links,
 *   marks and the tokens above, but no `|`, `{` or `}` of its own.
 *
 * Titles, descriptions and keywords hold no token (tests/unit/blog-posts.test.ts).
 */
export const FILL_TOKEN = /\{(price|count|free):([a-z0-9-]+)\}/g;
const NOTE_TOKEN = /\{note:([^|{}]*)\|([^|{}]*)\}/g;

const PRODUCT_IDS = new Set(Object.keys(PRODUCTS));

/** The template names in the language's own list: "The Letter and Constellations", "La carta y Constelaciones". */
function names(locale: GiftLocale): string {
  const free = listManifests().filter((m) => sendsFree(m));
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(free.map((m) => m.name[locale]));
}

/** One product's price in the page's currency, or in every charged currency when the reader has none (llms.txt). */
function price(id: ProductId, locale: GiftLocale, currency: Currency | undefined): string {
  const amounts = PRODUCTS[id].amounts;
  return currency ? formatAmount(amounts[currency], currency, locale) : CHARGED_CURRENCIES.map((c) => formatAmount(amounts[c], c, locale)).join(" / ");
}

/** A post's text with every fact token filled in for this reader. An unknown token is left as it is, for the test to catch. */
export function fillText(text: RichText, locale: GiftLocale, currency?: Currency): RichText {
  const simple = text.replace(FILL_TOKEN, (whole, kind: string, key: string) => {
    if (kind === "price" && PRODUCT_IDS.has(key)) return price(key as ProductId, locale, currency);
    if (kind === "count" && key === "templates") return String(listManifests().length);
    if (kind === "free" && key === "names") return names(locale);
    if (kind === "free") {
      const manifest = getManifest(key);
      if (manifest) return sendsFree(manifest) ? (locale === "es" ? "gratis" : "free") : locale === "es" ? "de pago único" : "paid once";
    }
    return whole;
  });
  const note = noteForEveryone();
  return simple.replace(NOTE_TOKEN, (_whole, on: string, off: string) => (note ? on : off));
}

function fillBlock(block: BlogBlock, fill: (t: RichText) => RichText): BlogBlock {
  switch (block.type) {
    case "p":
    case "h2":
    case "h3":
      return { ...block, text: fill(block.text) };
    case "list":
      return { ...block, items: block.items.map(fill) };
    case "quote":
      return { ...block, text: fill(block.text), cite: block.cite === undefined ? undefined : fill(block.cite) };
    case "tip":
      return { ...block, title: fill(block.title), text: fill(block.text) };
    case "template":
      return { ...block, note: fill(block.note) };
    case "image":
      return { ...block, alt: fill(block.alt), caption: block.caption === undefined ? undefined : fill(block.caption) };
    case "table":
      return { ...block, head: block.head.map(fill), rows: block.rows.map((row) => row.map(fill)) };
  }
}

/** The whole post with its facts filled in, for a reader in this language and currency. */
export function fillContent(content: BlogContent, locale: GiftLocale, currency?: Currency): BlogContent {
  const fill = (t: RichText) => fillText(t, locale, currency);
  return {
    ...content,
    title: fill(content.title),
    description: fill(content.description),
    lead: fill(content.lead),
    takeaways: content.takeaways.map(fill),
    body: content.body.map((b) => fillBlock(b, fill)),
    faq: content.faq.map((f) => ({ q: fill(f.q), a: fill(f.a) })),
  };
}
