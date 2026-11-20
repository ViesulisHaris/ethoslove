import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { isOccasion } from "@/config/occasions";
import { LIMITS } from "@/config/site";
import { getPost, postLocales } from "@/content/blog";
import { DIGITAL_CARDS_PATH, DIGITAL_CARDS_REF, DIGITAL_CARD_TEMPLATES, digitalCardsCopy, type DigitalCardsFacts } from "@/content/digital-cards";
import { DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, GUIDES_FOR_OCCASION, isGiftGuide, type GiftGuideSlug } from "@/content/gift-guides";
import { pageUpdated } from "@/content/page-dates";
import { recipientFromSlug } from "@/content/recipients";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { fieldLimit } from "@/lib/gift/field-limit";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { pageMetadata } from "@/lib/seo";
import { getManifest, listManifests } from "@/templates/manifests";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

const words = (s: string) => s.trim().split(/\s+/).length;
const other = (l: "en" | "es") => (l === "en" ? "es" : "en");

/** Every string under a value. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** The owner's rule: nothing on the site mentions Spain or its cities (tests/unit/cities.test.ts has the same list). */
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;
/** A price written by hand: a currency sign beside a number. Prices come from PRODUCTS, never from copy. */
const TYPED_PRICE = /[€$£]\s?\d|\d\s?[€$£]/;

/** Whether a site path is a page that exists, in this language. /gifts/finder is another branch's page. */
function resolves(href: string, locale: "en" | "es"): boolean {
  const [, section, slug, ...rest] = href.split("/");
  if (rest.length > 0) return false;
  if (!slug) return ["gifts", "occasions", "templates", "pricing", DIGITAL_CARDS_PATH.slice(1)].includes(section);
  if (section === "blog") {
    const post = getPost(slug);
    return Boolean(post) && postLocales(post!).includes(locale);
  }
  if (section === "occasions") return isOccasion(slug);
  if (section === "templates") return getManifest(slug) !== null;
  if (section === "gifts") return slug === "finder" || isGiftGuide(slug) || recipientFromSlug(slug) !== null;
  return false;
}

/**
 * The facts the copy states in words, held to the code that decides them. If one of these changes,
 * the sentences in content/gift-guides.ts, content/digital-cards.ts and the new occasion ideas that
 * say the old number have to change with it.
 */
describe("the numbers the gift pages state", () => {
  it("are the ones in the code", () => {
    expect(FREE_NOTE_MAX_CHARS).toBe(500);
    expect(LIMITS.captionMaxChars).toBe(140);
    expect(LIMITS.messageMaxChars).toBe(4000);
    expect(LIMITS.premium.maxPhotos).toBe(20);
    expect(LIMITS.videoMaxBytes).toBe(50 * 1024 * 1024);
    expect(LIMITS.senderVoiceMaxSeconds).toBe(60);
  });
});

describe("gift pages by kind", () => {
  it("have addresses that are theirs alone", () => {
    for (const slug of GIFT_GUIDE_SLUGS) {
      expect(slug, slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(recipientFromSlug(slug), slug).toBeNull();
      expect(`gifts-${slug}`, slug).toMatch(REF_PATTERN);
    }
    expect(isGiftGuide("for-boyfriend")).toBe(false);
    expect(isGiftGuide("constructor")).toBe(false);
    expect(new Set(GIFT_GUIDE_SLUGS).size).toBe(GIFT_GUIDE_SLUGS.length);
  });

  for (const slug of GIFT_GUIDE_SLUGS) {
    for (const locale of GIFT_LOCALES) {
      const guide = GIFT_GUIDES[slug][locale];
      const twin = GIFT_GUIDES[slug][other(locale)];

      it(`${slug} (${locale}) is a whole page`, () => {
        expect(guide.title.length, guide.title).toBeLessThanOrEqual(65);
        expect(guide.description.length, guide.description).toBeLessThanOrEqual(160);
        expect(words(guide.h1)).toBeGreaterThanOrEqual(3);
        expect(guide.label.length).toBeLessThanOrEqual(40);
        expect(guide.lead).toHaveLength(2);
        for (const p of guide.lead) expect(words(p), p.slice(0, 40)).toBeGreaterThanOrEqual(45);
        expect(guide.sections).toHaveLength(3);
        expect(new Set(guide.sections.map((s) => s.heading)).size).toBe(3);
        for (const s of guide.sections) expect(words(s.body), s.heading).toBeGreaterThanOrEqual(40);
        expect(guide.faq.length).toBeGreaterThanOrEqual(4);
        expect(guide.faq.length).toBe(twin.faq.length);
        for (const f of guide.faq) {
          expect(f.q.trim().endsWith("?"), f.q).toBe(true);
          if (locale === "es") expect(f.q.trim().startsWith("¿"), f.q).toBe(true);
          expect(words(f.a), f.q).toBeGreaterThanOrEqual(15);
        }
      });

      it(`${slug} (${locale}) lists ideas that can be made, each with a line that fits`, async () => {
        // The same gifts in both languages and in the same order, each one a template that exists.
        expect(twin.ideas.map((i) => i.template)).toEqual(guide.ideas.map((i) => i.template));
        expect(twin.ideas.map((i) => i.line.field)).toEqual(guide.ideas.map((i) => i.line.field));
        expect(new Set(guide.ideas.map((i) => i.template)).size).toBe(guide.ideas.length);
        // Six to nine; the cake page stops at five, because five templates have a cake in them.
        expect(guide.ideas.length).toBeGreaterThanOrEqual(slug === "virtual-birthday-cake" ? 5 : 6);
        expect(guide.ideas.length).toBeLessThanOrEqual(9);
        for (const idea of guide.ideas) {
          expect(getManifest(idea.template), idea.template).not.toBeNull();
          expect(words(idea.heading), idea.template).toBeGreaterThanOrEqual(3);
          expect(words(idea.body), idea.template).toBeGreaterThanOrEqual(40);
          // The line to borrow goes in a real field of that template, and is short enough for it.
          const limit = await fieldLimit(idea.template, idea.line.field);
          expect(limit, `${idea.template}.${idea.line.field} is not a text field`).not.toBeNull();
          expect(idea.line.text.trim().length, idea.line.text).toBeGreaterThan(0);
          expect(idea.line.text.length, `${idea.template}.${idea.line.field}: “${idea.line.text}”`).toBeLessThanOrEqual(limit!);
          expect(words(idea.line.where), idea.template).toBeGreaterThanOrEqual(2);
        }
      });

      it(`${slug} (${locale}) links to pages that exist`, () => {
        expect(guide.related.length).toBeGreaterThanOrEqual(3);
        expect(twin.related.map((r) => r.href)).toEqual(guide.related.map((r) => r.href));
        for (const link of guide.related) {
          expect(link.href, link.label).not.toBe(`/gifts/${slug}`);
          expect(resolves(link.href, locale), `${link.href} (${locale})`).toBe(true);
        }
      });

      it(`${slug} (${locale}) keeps to the house rules`, () => {
        for (const s of strings(guide)) {
          expect(s, s).not.toMatch(SPAIN);
          expect(s, s).not.toMatch(TYPED_PRICE);
          expect(s, s).not.toContain("—");
          expect(s, s).not.toContain("!");
          expect(s.toLowerCase(), s).not.toContain("digital gift card");
        }
      });
    }
  }

  it("don't share a title or an h1 with each other", () => {
    for (const locale of GIFT_LOCALES) {
      const guides = GIFT_GUIDE_SLUGS.map((s) => GIFT_GUIDES[s][locale]);
      expect(new Set(guides.map((g) => g.title.toLowerCase())).size).toBe(guides.length);
      expect(new Set(guides.map((g) => g.h1.toLowerCase())).size).toBe(guides.length);
    }
  });

  it("are linked from the occasion pages they sit beside, and link back", () => {
    for (const [occasion, kinds] of Object.entries(GUIDES_FOR_OCCASION)) {
      expect(isOccasion(occasion), occasion).toBe(true);
      for (const kind of kinds) {
        expect(isGiftGuide(kind), kind).toBe(true);
        expect(GIFT_GUIDES[kind].en.related.map((r) => r.href), `${kind} → ${occasion}`).toContain(`/occasions/${occasion}`);
      }
    }
  });

  it("the video page lists every template that takes a video, and says how many", () => {
    const takesVideo = listManifests().filter((m) => m.features.video).map((m) => m.slug).sort();
    const listed = GIFT_GUIDES["video-message"].en.ideas.map((i) => i.template);
    // The first five ideas are the video ones; the rest use a voice message, which every template takes.
    expect(takesVideo).toHaveLength(5);
    expect(listed.slice(0, 5).sort()).toEqual(takesVideo);
    for (const slug of listed.slice(5)) expect(getManifest(slug)?.features.video, slug).toBe(false);
  });

  it("the cake page's blowable cakes really listen", () => {
    const blowable = GIFT_GUIDES["virtual-birthday-cake"].en.ideas.slice(0, 3).map((i) => i.template);
    for (const slug of blowable) expect(getManifest(slug)?.features.needs, slug).toContain("microphone");
    for (const slug of GIFT_GUIDES["virtual-birthday-cake"].en.ideas.slice(3).map((i) => i.template)) expect(getManifest(slug)?.features.needs ?? [], slug).not.toContain("microphone");
  });

  it("the album page states each album's real photo limit", () => {
    for (const locale of GIFT_LOCALES) {
      const guide = GIFT_GUIDES["photo-album"][locale];
      const howMany = guide.faq[0].a;
      for (const idea of guide.ideas) {
        const manifest = getManifest(idea.template)!;
        expect(howMany, `${idea.template} holds ${manifest.features.photos.max}`).toContain(String(manifest.features.photos.max));
        expect(howMany, idea.template).toContain(manifest.name[locale]);
      }
      // "most hold 8 to 12, and two hold 20"
      const maxes = guide.ideas.map((i) => getManifest(i.template)!.features.photos.max);
      expect(maxes.filter((m) => m === 20)).toHaveLength(2);
      expect(maxes.filter((m) => m !== 20).every((m) => m >= 8 && m <= 12)).toBe(true);
    }
  });

  it("are in the sitemap, in both languages, with a date", () => {
    const urls = sitemap().map((p) => new URL(p.url).pathname);
    for (const slug of [...GIFT_GUIDE_SLUGS.map((s) => `/gifts/${s}`), DIGITAL_CARDS_PATH]) {
      expect(urls, slug).toContain(slug);
      expect(urls, slug).toContain(`/es${slug}`);
      expect(pageUpdated(slug), slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("have titles the brand still fits beside", () => {
    for (const slug of GIFT_GUIDE_SLUGS as readonly GiftGuideSlug[]) {
      for (const locale of GIFT_LOCALES) {
        const guide = GIFT_GUIDES[slug][locale];
        const m = pageMetadata({ locale, path: `/gifts/${slug}`, title: guide.title, description: guide.description });
        const shown = typeof m.title === "string" ? `${m.title} · Ethos` : (m.title as { absolute: string }).absolute;
        expect(shown.length, shown).toBeLessThanOrEqual(70);
      }
    }
  });
});

describe("/digital-cards", () => {
  // Markers instead of prices: any price left in the copy would then be one typed by hand.
  const facts: DigitalCardsFacts = { single: "<single>", pick3: "<pick3>", everything: "<everything>", extras: "<extras>", count: listManifests().length, ideas: DIGITAL_GIFT_IDEAS.length };

  it("carries the owner's line exactly, once, as its eyebrow", () => {
    expect(digitalCardsCopy("en", facts).eyebrow).toBe("Digital cards by Tryethos");
    expect(digitalCardsCopy("es", facts).eyebrow).toBe("Tarjetas digitales de Tryethos");
    for (const locale of GIFT_LOCALES) {
      const copy = digitalCardsCopy(locale, facts);
      const all = strings(copy).join("\n");
      expect(all.split(copy.eyebrow).length - 1, locale).toBe(1);
      expect(all.split("Tryethos").length - 1, locale).toBe(1);
    }
  });

  it("reads every price from the code", () => {
    for (const locale of GIFT_LOCALES) {
      const copy = digitalCardsCopy(locale, facts);
      expect(copy.cost.rows.map((r) => r.price).slice(1)).toEqual(["<single>", "<pick3>", "<everything>", "<extras>"]);
      for (const s of strings(copy)) expect(s, s).not.toMatch(TYPED_PRICE);
      expect(strings(copy).join(" ")).toContain(String(facts.count));
    }
  });

  it("shows five kinds, each a real card with real neighbours", () => {
    expect(new Set(DIGITAL_CARD_TEMPLATES).size).toBe(DIGITAL_CARD_TEMPLATES.length);
    for (const slug of DIGITAL_CARD_TEMPLATES) expect(getManifest(slug), slug).not.toBeNull();
    for (const locale of GIFT_LOCALES) {
      const copy = digitalCardsCopy(locale, facts);
      expect(copy.kinds.items).toHaveLength(5);
      for (const kind of copy.kinds.items) {
        expect(kind.also.length, kind.title).toBeGreaterThanOrEqual(2);
        expect(words(kind.body), kind.title).toBeGreaterThanOrEqual(45);
        // The card shown is named in the words beside it.
        expect(kind.body, kind.title).toContain(getManifest(kind.template)!.name[locale]);
      }
    }
    expect(DIGITAL_CARDS_REF).toMatch(REF_PATTERN);
  });

  it("says the same in both languages, in a title and description that fit a result", () => {
    const [a, b] = [digitalCardsCopy("en", facts), digitalCardsCopy("es", facts)];
    expect(b.faq.items.length).toBe(a.faq.items.length);
    expect(b.steps.items.length).toBe(a.steps.items.length);
    expect(b.cost.rows.length).toBe(a.cost.rows.length);
    expect(b.compare.rows.length).toBe(a.compare.rows.length);
    expect(b.onward.links.map((l) => l.href)).toEqual(a.onward.links.map((l) => l.href));
    for (const [locale, copy] of [["en", a], ["es", b]] as const) {
      expect(copy.title.length, copy.title).toBeLessThanOrEqual(60);
      expect(copy.description.length, copy.description).toBeLessThanOrEqual(160);
      for (const f of copy.faq.items) {
        expect(f.q.trim().endsWith("?"), f.q).toBe(true);
        if (locale === "es") expect(f.q.trim().startsWith("¿"), f.q).toBe(true);
        expect(words(f.a), f.q).toBeGreaterThanOrEqual(12);
      }
      for (const link of copy.onward.links) expect(resolves(link.href, locale), link.href).toBe(true);
      for (const s of strings(copy)) {
        expect(s, s).not.toMatch(SPAIN);
        expect(s, s).not.toContain("—");
        expect(s, s).not.toContain("!");
      }
    }
  });

  it("is not the /gifts page under another address", () => {
    // /gifts owns "digital gift"; this page owns "digital card". Different titles, and it links there.
    expect(digitalCardsCopy("en", facts).title).not.toBe(en.meta.giftsTitle);
    expect(digitalCardsCopy("es", facts).title).not.toBe(es.meta.giftsTitle);
    expect(digitalCardsCopy("en", facts).title.toLowerCase()).toContain("digital cards");
    expect(digitalCardsCopy("es", facts).title.toLowerCase()).toContain("tarjetas digitales");
    expect(digitalCardsCopy("en", facts).onward.links.map((l) => l.href)).toContain("/gifts");
  });

  it("names the voucher once, to say it is something else", () => {
    const all = strings(digitalCardsCopy("en", facts)).join("\n").toLowerCase();
    expect(all.split("digital gift card").length - 1).toBe(1);
  });
});
