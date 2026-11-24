import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { isOccasion } from "@/config/occasions";
import { LIMITS } from "@/config/site";
import { getPost, postLocales } from "@/content/blog";
import { pricingGifts } from "@/components/pricing/free-gifts";
import { DIGITAL_CARDS_PATH, DIGITAL_CARDS_REF, DIGITAL_CARD_TEMPLATES, FINDER_LINK, digitalCardsCopy, finderIsBuilt, type DigitalCardsFacts } from "@/content/digital-cards";
import { DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, GUIDES_FOR_OCCASION, isGiftGuide, type GiftGuideSlug } from "@/content/gift-guides";
import { MONTHS, MONTH_GUIDES, monthFromSlug, monthSlug } from "@/content/month-anniversaries";
import { OCCASION_IDEAS } from "@/content/occasion-ideas";
import { pageUpdated } from "@/content/page-dates";
import { recipientFromSlug } from "@/content/recipients";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { fieldLimit } from "@/lib/gift/field-limit";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { pageMetadata } from "@/lib/seo";
import { TEMPLATE_SEO } from "@/content/template-seo";
import { getManifest, listManifests } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";
import type { TemplateManifest } from "@/templates/types";
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

/**
 * The gift finder's page. Another part of the growth build adds it, so it is in this checkout only
 * once that part is merged, and /digital-cards links to it only then.
 */
const FINDER_BUILT = existsSync(join(process.cwd(), "src/app/[currency]/[locale]/(marketing)/gifts/finder/page.tsx"));

/** Whether a site path is a page that exists, in this language. */
function resolves(href: string, locale: "en" | "es"): boolean {
  const [path, anchor] = href.split("#");
  // The one place on a page a link may point into: the row of pages by person on /gifts, which has that id.
  if (anchor !== undefined && !(path === "/gifts" && readFileSync(join(process.cwd(), "src/components/marketing/digital-gift-guide.tsx"), "utf8").includes(`id="${anchor}"`))) return false;
  const [, section, slug, ...rest] = path.split("/");
  if (rest.length > 0) return false;
  if (!slug) return ["gifts", "occasions", "templates", "pricing", "long-distance", DIGITAL_CARDS_PATH.slice(1)].includes(section);
  if (section === "blog") {
    const post = getPost(slug);
    return Boolean(post) && postLocales(post!).includes(locale);
  }
  if (section === "occasions") return isOccasion(slug);
  if (section === "templates") return getManifest(slug) !== null;
  if (section === "gifts") return (slug === "finder" && FINDER_BUILT) || isGiftGuide(slug) || recipientFromSlug(slug) !== null || monthFromSlug(slug) !== null;
  return false;
}

/** A text cut into sentences, so a claim and the exception made in the same breath are read together. */
const sentences = (s: string) => s.split(/(?<=[.?!])\s+/);

/**
 * Whether a sentence about a whole list is true of it. It is when it names the gift it means and
 * that gift has the thing (the free Letter "with a song"), or when it names every listed gift that
 * lacks it ("all but Arcade take a song").
 */
function claimHolds(sentence: string, locale: "en" | "es", lacking: TemplateManifest[], has: (m: TemplateManifest) => boolean): boolean {
  const named = listManifests().filter((m) => sentence.includes(m.name[locale]));
  return (named.length > 0 && named.every(has)) || lacking.every((m) => sentence.includes(m.name[locale]));
}

/** The templates whose own fields ask for an age (a cake's candles, the foil numbers). */
async function templatesWithAnAge(): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (const m of listManifests()) {
    const schema = (await loadFieldsSchema(m.slug)) as { shape?: Record<string, unknown> } | null;
    if (schema?.shape && Object.hasOwn(schema.shape, "age")) slugs.add(m.slug);
  }
  return slugs;
}

const SONG = { en: /\bsongs?\b/i, es: /\bcanci(ón|ones)\b/i } as const;
const AGE = { en: /\b(their|her|his) age\b/i, es: /\bsu edad\b/i } as const;

/** The longest run of words two texts share, in words: how much of one paragraph was reused in another. */
function sharedRun(a: string, b: string): number {
  const tokens = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const [x, y] = [tokens(a), tokens(b)];
  let best = 0;
  let row = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const next = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        next[j] = row[j - 1] + 1;
        if (next[j] > best) best = next[j];
      }
    }
    row = next;
  }
  return best;
}

/** Short facts repeat honestly ("one bubble at a time with the typing dots"); a reused paragraph runs longer. */
const SHARED_RUN_MAX = 9;

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
        // A Spanish title runs longer for the same words, and results cut it at about sixty characters with the brand
        // after it: 67 and 68 were cut (the deep test of 23 Nov 2026).
        if (locale === "es") expect(`${guide.title} · Ethos`.length, guide.title).toBeLessThanOrEqual(60);
        expect(guide.description.length, guide.description).toBeLessThanOrEqual(160);
        expect(words(guide.h1)).toBeGreaterThanOrEqual(3);
        // One search, one page: a page by kind's h1 and title must not nearly repeat a gift page's own title. The
        // Spanish cake h1 was eight words of Birthday Cinema's ten (the deep test of 23 Nov 2026).
        const bag = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
        for (const [template, seo] of Object.entries(TEMPLATE_SEO)) {
          for (const own of [guide.h1, guide.title]) {
            const [a, b] = [bag(own), bag(seo[locale].title)];
            const shared = [...a].filter((w) => b.has(w)).length;
            expect(shared / new Set([...a, ...b]).size, `${own} / ${template}: ${seo[locale].title}`).toBeLessThan(0.6);
          }
        }
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

      // The review of 21 Nov found two pages saying every listed card takes a song, and one saying
      // every one takes their age. Arcade, on both lists, takes neither.
      it(`${slug} (${locale}) promises a song or an age only on the gifts that take one`, async () => {
        const manifests = guide.ideas.map((i) => getManifest(i.template)!);
        const withAge = await templatesWithAnAge();
        const checks = [
          { says: SONG[locale], has: (m: TemplateManifest) => m.features.music },
          { says: AGE[locale], has: (m: TemplateManifest) => withAge.has(m.slug) },
        ];
        for (const { says, has } of checks) {
          const lacking = manifests.filter((m) => !has(m));
          // An idea's own words are about its own template.
          for (const idea of guide.ideas) {
            if (!has(getManifest(idea.template)!)) expect(`${idea.heading} ${idea.body}`, idea.template).not.toMatch(says);
          }
          // The opening, the sections and the answers are about the whole list.
          for (const sentence of [...guide.lead, ...guide.sections.map((s) => s.body), ...guide.faq.map((f) => f.a)].flatMap(sentences)) {
            if (says.test(sentence)) expect(claimHolds(sentence, locale, lacking, has), sentence).toBe(true);
          }
        }
      });

      it(`${slug} (${locale}) sends people to the editor's Extras for a schedule or a password`, () => {
        // Both are set in the editor (components/editor/sections/extras.tsx), before the publish sheet.
        const messages = locale === "en" ? en : es;
        const extras = messages.editor.sections.extras.title;
        const schedule = messages.editor.extras.schedule;
        const timeZone = locale === "en" ? /time zone/i : /zona horaria/i;
        const password = locale === "en" ? /password/i : /contraseña/i;
        const atPublish = locale === "en" ? /when you publish/i : /al publicar/i;
        for (const f of guide.faq) {
          const setsATime = timeZone.test(f.a);
          const setsAPassword = password.test(f.q);
          if (!setsATime && !setsAPassword) continue;
          expect(f.a, f.q).toContain(extras);
          if (setsATime) expect(f.a, f.q).toContain(schedule);
          for (const sentence of sentences(f.a)) {
            if (timeZone.test(sentence) || password.test(sentence)) expect(sentence, f.q).not.toMatch(atPublish);
          }
        }
      });
    }
  }

  it("vary how the ideas are headed, except where the list is sorted by what the person does", () => {
    for (const slug of GIFT_GUIDE_SLUGS) {
      // The interactive cards are listed by the verb ("They blow: …"), and the opening says so.
      if (slug === "interactive-birthday-card") continue;
      for (const locale of GIFT_LOCALES) {
        const headings = GIFT_GUIDES[slug][locale].ideas.map((i) => i.heading);
        const openers = new Map<string, number>();
        for (const h of headings) {
          const opener = h.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
          openers.set(opener, (openers.get(opener) ?? 0) + 1);
        }
        const [opener, count] = [...openers.entries()].sort((a, b) => b[1] - a[1])[0];
        expect(count, `${slug} (${locale}): ${count} headings open with “${opener}”`).toBeLessThanOrEqual(Math.floor(headings.length / 2));
        const labelled = headings.filter((h) => h.includes(": ")).length;
        expect(labelled, `${slug} (${locale}): ${labelled} headings are “label: rest”`).toBeLessThanOrEqual(headings.length / 2);
      }
    }
  });

  it("describe a template afresh on each page that lists it", () => {
    // Keepsake, Music Box and Pack Your Bags had one paragraph each, reused on three pages.
    const reused: string[] = [];
    for (const locale of GIFT_LOCALES) {
      const bodies = new Map<string, { where: string; body: string }[]>();
      const add = (where: string, template: string, body: string) => bodies.set(template, [...(bodies.get(template) ?? []), { where, body }]);
      for (const slug of GIFT_GUIDE_SLUGS) for (const idea of GIFT_GUIDES[slug][locale].ideas) add(`/gifts/${slug}`, idea.template, idea.body);
      for (const [occasion, lists] of Object.entries(OCCASION_IDEAS)) for (const idea of lists[locale].items) add(`/occasions/${occasion}`, idea.template, idea.body);
      for (const n of MONTHS) for (const idea of MONTH_GUIDES[n][locale].ideas) add(`/gifts/${monthSlug(n)}`, idea.template, idea.body);
      for (const [template, uses] of bodies) {
        for (let i = 0; i < uses.length; i++) {
          for (let j = i + 1; j < uses.length; j++) {
            const run = sharedRun(uses[i].body, uses[j].body);
            if (run > SHARED_RUN_MAX) reused.push(`${template} (${locale}): ${uses[i].where} and ${uses[j].where} share ${run} words in a row`);
          }
        }
      }
    }
    expect(reused).toEqual([]);
  });

  it("say where Our Timeline's countdown and Museum's clip really are", () => {
    // Our Timeline: the closing line, the clip if any, a countdown only when one is set, then the
    // letter (its EndingSection). Museum: the clip's room is after the photos and before the wall
    // text, which is the last room.
    const all = GIFT_LOCALES.flatMap((locale) => [
      ...GIFT_GUIDE_SLUGS.flatMap((slug) => GIFT_GUIDES[slug][locale].ideas),
      ...Object.values(OCCASION_IDEAS).flatMap((lists) => lists[locale].items),
    ]);
    for (const idea of all.filter((i) => i.template === "our-timeline")) expect(idea.body, idea.heading).not.toMatch(/ends? (on|with|in) [^.]*countdown|termina (con|en) [^.]*cuenta atrás/i);
    for (const idea of all.filter((i) => i.template === "museum")) expect(idea.body, idea.heading).not.toMatch(/\blast room\b|\búltima sala\b|la última para él/i);
  });

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

  it("the Mother's Day list names every month Mothering Sunday can fall in", () => {
    // Three weeks before Easter: usually March, and early April when Easter is late.
    const easter = (year: number) => {
      const [a, b, c] = [year % 19, Math.floor(year / 100), year % 100];
      const [d, e] = [Math.floor(b / 4), b % 4];
      const g = Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const l = (32 + 2 * e + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const n = h + l - 7 * m + 114;
      return new Date(Date.UTC(year, Math.floor(n / 31) - 1, (n % 31) + 1));
    };
    expect(easter(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
    const months = new Set<string>();
    for (let year = 2027; year <= 2060; year++) months.add(new Date(easter(year).getTime() - 21 * 86_400_000).toLocaleString("en", { month: "long", timeZone: "UTC" }));
    expect([...months].sort()).toEqual(["April", "March"]);
    const bouquet = OCCASION_IDEAS["mothers-day"].en.items.find((i) => i.template === "bouquet")!.body;
    expect(bouquet).toContain("Mothering Sunday");
    for (const month of months) expect(bouquet, month).toContain(month);
  });

  it("the graduation list's sample class is one still to graduate", () => {
    // The class named on the foil is the next one after the day the page's words were last set.
    const [year, month] = pageUpdated("/occasions/graduation")!.split("-").map(Number);
    const next = month >= 7 ? year + 1 : year;
    for (const locale of GIFT_LOCALES) {
      const text = OCCASION_IDEAS.graduation[locale].items.map((i) => i.body).join(" ");
      const classes = [...text.matchAll(/(?:class of|promoción) (\d{4})/gi)].map((m) => Number(m[1]));
      expect(classes.length, locale).toBeGreaterThanOrEqual(2);
      for (const y of classes) expect(y, locale).toBeGreaterThanOrEqual(next);
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
  const facts: DigitalCardsFacts = { single: "<single>", pick3: "<pick3>", everything: "<everything>", extras: "<extras>", photos: "<photos>", notePhotos: 5, count: listManifests().length, paid: pricingGifts(listManifests(), 1).paid.length, ideas: DIGITAL_GIFT_IDEAS.length, finder: finderIsBuilt() };

  it("carries the owner's line exactly, once, as its eyebrow", () => {
    expect(digitalCardsCopy("en", facts).eyebrow).toBe("Digital cards by Tryethos");
    expect(digitalCardsCopy("es", facts).eyebrow).toBe("Tarjetas digitales de Tryethos");
    for (const locale of GIFT_LOCALES) {
      const copy = digitalCardsCopy(locale, facts);
      const all = strings(copy).join("\n");
      expect(all.split(copy.eyebrow).length - 1, locale).toBe(1);
      expect(all.split("Tryethos").length - 1, locale).toBe(1);
    }
    // The breadcrumb search engines read is the page's plain name: the line stays a maker's mark.
    expect(digitalCardsCopy("en", facts).breadcrumb).toBe("Digital cards");
    expect(digitalCardsCopy("es", facts).breadcrumb).toBe("Tarjetas digitales");
  });

  it("links to the gift finder exactly when the finder's page is in the build", () => {
    // What the page asks (does the finder have a date of its own?) against what is true (is its file here?).
    expect(finderIsBuilt(), "content/page-dates.ts and the finder's page disagree").toBe(FINDER_BUILT);
    for (const locale of GIFT_LOCALES) {
      const withIt = digitalCardsCopy(locale, { ...facts, finder: true });
      const without = digitalCardsCopy(locale, { ...facts, finder: false });
      // Every card is the hero's own button ("See all 61 cards"), so /templates is not listed a second time at the foot.
      expect(withIt.onward.links.map((l) => l.href)).toEqual(["/gifts", FINDER_LINK, "/occasions", "/gifts#by-person"]);
      expect(without.onward.links.map((l) => l.href)).toEqual(["/gifts", "/occasions", "/gifts#by-person"]);
      expect(strings(without).join(" ")).not.toMatch(/finder|buscador/i);
    }
  });

  it("reads every price from the code", () => {
    for (const locale of GIFT_LOCALES) {
      const copy = digitalCardsCopy(locale, facts);
      expect(copy.cost.rows.map((r) => r.price).slice(1)).toEqual(["<photos>", "<extras>", "<single>", "<pick3>", "<everything>"]);
      // Beside "One card", the whole set is counted: "Every card" read as a price per card (the deep test of 23 Nov 2026).
      // And counted as /pricing's Everything card counts it ("All 60 paid gifts"), one tap away: the paid list, not every template.
      expect(copy.cost.rows.at(-1)!.label).toContain(String(facts.paid));
      expect(copy.cost.rows.at(-1)!.label).not.toContain(String(facts.count));
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
        // A title that stands alone: it is also the kind's name in the page's ItemList. It begins on a noun, not on
        // "With…" or "Open…" (the deep test of 23 Nov 2026), and not every one on "Cards" (round 2, C13: spread-budget.test.ts).
        expect(kind.title, kind.title).toMatch(/^[A-ZÁÉÍÓÚ]/);
        expect(kind.title, kind.title).not.toMatch(/^(with|for|open|built|made|con|para|hechas|se) /i);
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
      expect(`${copy.title} · Ethos`.length, copy.title).toBeLessThanOrEqual(60);
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

describe("the second round of pages by kind (24 Nov 2026)", () => {
  const all = (slug: GiftGuideSlug, locale: "en" | "es") => strings(GIFT_GUIDES[slug][locale]);

  it("the two apology pages are two pages", () => {
    for (const locale of GIFT_LOCALES) {
      const [him, her] = [GIFT_GUIDES["apology-for-him"][locale], GIFT_GUIDES["apology-for-her"][locale]];
      expect(him.hero.line).not.toBe(her.hero.line);
      expect(him.hero.sentence).not.toBe(her.hero.sentence);
      expect(him.craft).not.toBe(her.craft);
      expect(him.ideasTitle).not.toBe(her.ideasTitle);
      for (const idea of him.ideas) expect(her.ideas.map((i) => i.heading), idea.heading).not.toContain(idea.heading);
      for (const f of him.faq) expect(her.faq.map((g) => g.q), f.q).not.toContain(f.q);
      const reused: string[] = [];
      for (const a of all("apology-for-him", locale)) for (const b of all("apology-for-her", locale)) if (sharedRun(a, b) > SHARED_RUN_MAX) reused.push(`${locale}: “${a.slice(0, 50)}” / “${b.slice(0, 50)}”`);
      expect(reused).toEqual([]);
      const common = him.ideas.filter((i) => her.ideas.some((j) => j.template === i.template));
      expect(common.length, locale).toBeLessThanOrEqual(1);
      expect(him.film ?? him.ideas[0].template).not.toBe(her.film ?? her.ideas[0].template);
    }
    // Spanish never genders the person the gift is for: the search phrase names "novio" or "novia" in the h1, the
    // title, the label and the description only. The related links are the names of other pages (the two posts are
    // "Cómo pedirle perdón a tu novio" and the like), not sentences about this one.
    for (const slug of ["apology-for-him", "apology-for-her"] as const) {
      const { h1, title, label, description, related, ...rest } = GIFT_GUIDES[slug].es;
      void h1;
      void title;
      void label;
      void description;
      void related;
      for (const s of strings(rest)) expect(s, `${slug}: ${s}`).not.toMatch(/\bnovi[oa]s?\b/i);
    }
  });

  it("the surprise page lists only gifts with a reveal of their own, and sends people to the editor for the day and hour", () => {
    const allowed = ["scratch-card", "midnight-countdown", "pack-your-bags", "the-letter", "fortune-cookie", "snow-globe", "jar-of-reasons"];
    for (const locale of GIFT_LOCALES) {
      const guide = GIFT_GUIDES.surprise[locale];
      for (const idea of guide.ideas) expect(allowed, idea.template).toContain(idea.template);
      const bags = guide.ideas.find((i) => i.template === "pack-your-bags")!;
      expect(`${bags.heading} ${bags.brief ?? ""} ${bags.body}`).not.toMatch(/hidden surprise|sorpresa final|sorpresa oculta/i);
      const messages = locale === "en" ? en : es;
      expect(guide.faq.some((f) => f.a.includes(messages.editor.sections.extras.title) && f.a.includes(messages.editor.extras.schedule)), locale).toBe(true);
    }
  });

  it("the care package page says nothing is posted and names the printed card as the dashboard names it", () => {
    expect(existsSync(join(process.cwd(), "src/components/dashboard/print-card.tsx"))).toBe(true);
    for (const locale of GIFT_LOCALES) {
      const guide = GIFT_GUIDES["long-distance-care-package"][locale];
      const messages = locale === "en" ? en : es;
      const text = strings(guide).join(" ");
      expect(text, locale).toContain(messages.editor.qr.printCard);
      expect(text, locale).toContain(messages.dashboard.qrCard);
      expect(`${guide.hero.sentence} ${guide.lead[0]}`, locale).toMatch(locale === "en" ? /post|ship|mail/i : /envía|correo|paquete/i);
    }
  });

  it("each new page links to the pages that own the searches beside it", () => {
    const hrefs = (slug: GiftGuideSlug) => GIFT_GUIDES[slug].en.related.map((r) => r.href);
    for (const [slug, other] of [["apology-for-him", "apology-for-her"], ["apology-for-her", "apology-for-him"]] as const) {
      for (const href of ["/occasions/apology", "/blog/how-to-apologize-to-your-boyfriend", "/blog/sorry-message-for-girlfriend", `/gifts/${other}`]) expect(hrefs(slug), slug).toContain(href);
    }
    for (const href of ["/blog/how-to-surprise-your-girlfriend", "/blog/midnight-birthday-surprise-ideas", "/blog/surprise-trip-reveal-ideas"]) expect(hrefs("surprise")).toContain(href);
    for (const href of ["/occasions/long-distance", "/blog/long-distance-relationship-gifts", "/long-distance"]) expect(hrefs("long-distance-care-package")).toContain(href);
    for (const href of ["/gifts/photo-album", "/occasions/anniversary"]) expect(hrefs("memory-book")).toContain(href);
  });

  it("the memory book and the photo album are two pages", () => {
    const bag = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    const overlap = (a: string, b: string) => {
      const [x, y] = [bag(a), bag(b)];
      return [...x].filter((w) => y.has(w)).length / new Set([...x, ...y]).size;
    };
    for (const locale of GIFT_LOCALES) {
      const [book, album] = [GIFT_GUIDES["memory-book"][locale], GIFT_GUIDES["photo-album"][locale]];
      const shared = book.ideas.filter((i) => album.ideas.some((j) => j.template === i.template));
      expect(shared.length, locale).toBeLessThanOrEqual(2);
      for (const f of book.faq) expect(album.faq.map((g) => g.q), f.q).not.toContain(f.q);
      expect(overlap(book.h1, album.h1), locale).toBeLessThan(0.6);
      expect(overlap(book.title, album.title), locale).toBeLessThan(0.6);
      expect(book.film ?? book.ideas[0].template).not.toBe(album.film ?? album.ideas[0].template);
    }
  });
});

describe("llms.txt", () => {
  it("lists every gift page by kind and /digital-cards, as it lists the pages by person", async () => {
    // It listed the seven for-* pages only (the review of 22 Nov 2026), and assistants are a measured source of visitors.
    const { GET } = await import("@/app/llms.txt/route");
    const text = await GET().text();
    const urls = sitemap().map((entry) => entry.url);
    for (const slug of GIFT_GUIDE_SLUGS) {
      const line = text.split("\n").find((l) => l.includes(`/gifts/${slug})`));
      expect(line, slug).toBeDefined();
      // By the page's own heading and description, so the brief never says something the page does not.
      expect(line, slug).toContain(`[${GIFT_GUIDES[slug].en.h1}]`);
      expect(line, slug).toContain(GIFT_GUIDES[slug].en.description);
      // And the address is one the sitemap has.
      expect(urls, slug).toContain(line!.match(/\((https?:[^)]+)\)/)![1]);
    }
    const cards = text.split("\n").find((l) => l.includes(`${DIGITAL_CARDS_PATH})`));
    expect(cards).toBeDefined();
    expect(cards).toContain(digitalCardsCopy("en", { single: "", pick3: "", everything: "", extras: "", photos: "", notePhotos: 0, count: listManifests().length, paid: 0, ideas: 0, finder: false }).description);
    // No price is typed into that line: prices have a section of their own, read from the code.
    expect(cards).not.toMatch(/[€$£]\s?\d/);
  });
});
