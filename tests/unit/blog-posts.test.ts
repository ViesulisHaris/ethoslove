import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOccasion } from "@/config/occasions";
import { BLOG_POSTS } from "@/content/blog";
import { isGiftGuide } from "@/content/gift-guides";
import { monthFromSlug } from "@/content/month-anniversaries";
import { recipientFromSlug } from "@/content/recipients";
import { GAMES } from "@/lib/games/catalogue";
import { blockTexts, contentTexts, contentWords, linksIn, plainText, wordCount } from "@/content/blog/text";
import { FILL_TOKEN, fillContent } from "@/content/blog/fill";
import { PRODUCTS, type Currency } from "@/lib/pricing/products";
import type { BlogContent, BlogPost } from "@/content/blog/types";
import { TEMPLATE_SLUGS, listManifests } from "@/templates/manifests";
import { FILLER } from "./filler";
import { SPAIN_WORDS } from "../../scripts/blog-guard.mjs";

/**
 * What a post must be before it goes live. A post is written by the daily routine
 * (docs/blog/PLAYBOOK.md) and published without anyone reading it first, so this is the editor:
 * the links work, the facts it can check are real, it's long enough to be worth finding and it
 * doesn't read like filler.
 */

const POSTS_DIR = path.join(__dirname, "../../src/content/blog/posts");
const PUBLIC_DIR = path.join(__dirname, "../../public");
const today = new Date().toISOString().slice(0, 10);

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
const STATIC_PATHS = new Set(["/", "/templates", "/occasions", "/pricing", "/blog", "/legal/terms", "/legal/privacy", "/gifts", "/games", "/long-distance", "/dates", "/trips", "/tools/how-long-have-we-been-together", "/tools/love-language-quiz", "/tools/halfway-between-two-cities"]);
/** A game's page, at the address the catalogue gives it (the old ones redirect, but a post links the page itself). */
const GAME_PATHS = new Set(GAMES.map((g) => g.href));

/** A link inside a post goes to a page that exists. Site paths are written without the locale. */
function resolves(href: string): boolean {
  if (href.startsWith("https://")) return true;
  const pathname = href.split(/[?#]/)[0] ?? "";
  if (STATIC_PATHS.has(pathname)) return true;
  const template = pathname.match(/^\/(templates|create|demo)\/([a-z0-9-]+)$/);
  if (template) return TEMPLATE_SLUGS.includes(template[2] ?? "");
  const occasion = pathname.match(/^\/occasions\/([a-z0-9-]+)$/);
  if (occasion) return isOccasion(occasion[1] ?? "");
  const post = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (post) return slugs.has(post[1] ?? "");
  // A page of gifts: by person, by kind, or an anniversary month (content/month-anniversaries.ts).
  const gifts = pathname.match(/^\/gifts\/([a-z0-9-]+)$/);
  if (gifts) return recipientFromSlug(gifts[1] ?? "") !== null || isGiftGuide(gifts[1] ?? "") || monthFromSlug(gifts[1] ?? "") !== null;
  if (pathname.startsWith("/games/")) return GAME_PATHS.has(pathname);
  return false;
}

/** The panel in docs/blog/RUBRIC.md: each reader and the criteria they score. */
const PANEL: Record<string, string[]> = {
  reader: ["answers", "usable", "trust"],
  editor: ["accuracy", "voice", "spanish"],
  search: ["better", "search"],
};
type Review = { reviewer: string; scores: Record<string, number>; overall: number; dealbreakers?: string[] };
/**
 * Posts published before the panel existed and reviewed after the fact. The five-round limit is a
 * routine's budget for one day's new post, so it doesn't apply to them; the 10/10/10 bar does.
 */
const REVIEWED_AFTER_PUBLISHING = ["long-distance-birthday-ideas-for-boyfriend"];
type ReviewRecord = { slug: string; keyword: string; rounds: { round: number; reviews: Review[] }[] };

/** Names that look like a template's but aren't one. */
const GHOST_NAMES = ["Snowglobe", "Time Line", "Front page", "Jar of reasons", "Birthday cinema", "Midnight countdown"];

function checkContent(post: BlogPost, locale: "en" | "es", c: BlogContent) {
  const label = `${post.slug} (${locale})`;
  expect(c.title.length, `${label} title: ${c.title.length} chars`).toBeGreaterThanOrEqual(20);
  expect(c.title.length, `${label} title: ${c.title.length} chars`).toBeLessThanOrEqual(60);
  expect(c.description.length, `${label} description: ${c.description.length} chars`).toBeGreaterThanOrEqual(110);
  expect(c.description.length, `${label} description: ${c.description.length} chars`).toBeLessThanOrEqual(160);

  expect(c.keyword.trim(), `${label} keyword`).toBe(c.keyword.trim().toLowerCase());
  expect(c.keyword.length, `${label} keyword`).toBeGreaterThan(3);
  // The search it answers is in the title or the opening paragraph, in so many words.
  const opening = `${c.title} ${plainText(c.lead)}`.toLowerCase();
  const keywordWords = c.keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const present = keywordWords.filter((w) => opening.includes(w.replace(/s$/, "")));
  expect(present.length / keywordWords.length, `${label}: the keyword's words belong in the title or lead`).toBeGreaterThanOrEqual(0.75);

  expect(wordCount(plainText(c.lead)), `${label} lead words`).toBeGreaterThanOrEqual(30);
  expect(wordCount(plainText(c.lead)), `${label} lead words`).toBeLessThanOrEqual(90);
  expect(c.takeaways.length, `${label} takeaways`).toBeGreaterThanOrEqual(3);
  expect(c.takeaways.length, `${label} takeaways`).toBeLessThanOrEqual(5);
  for (const t of c.takeaways) expect(wordCount(plainText(t)), `${label} takeaway: ${t}`).toBeLessThanOrEqual(30);

  const h2s = c.body.filter((b) => b.type === "h2");
  expect(h2s.length, `${label} needs at least four sections`).toBeGreaterThanOrEqual(4);
  expect(new Set(h2s.map((h) => h.text)).size, `${label} repeats a heading`).toBe(h2s.length);
  expect(contentWords(c), `${label} words`).toBeGreaterThanOrEqual(locale === "en" ? 1000 : 900);

  const templateBlocks = c.body.filter((b) => b.type === "template");
  expect(templateBlocks.length, `${label} shows no template`).toBeGreaterThan(0);
  for (const b of templateBlocks) expect(post.templates, `${label}: ${b.slug} shown but not in post.templates`).toContain(b.slug);

  expect(c.faq.length, `${label} faq`).toBeGreaterThanOrEqual(3);
  expect(c.faq.length, `${label} faq`).toBeLessThanOrEqual(6);
  for (const f of c.faq) {
    expect(f.q.trim().endsWith("?"), `${label} question: ${f.q}`).toBe(true);
    if (locale === "es") expect(f.q.trim().startsWith("¿"), `${label} question: ${f.q}`).toBe(true);
    expect(wordCount(plainText(f.a)), `${label} answer to: ${f.q}`).toBeGreaterThanOrEqual(15);
  }

  const texts = contentTexts(c);
  const links = texts.flatMap(linksIn);
  const internal = new Set(links.filter((l) => l.startsWith("/")).map((l) => l.split(/[?#]/)[0]));
  expect(internal.size, `${label} links to fewer than three pages on the site`).toBeGreaterThanOrEqual(3);
  for (const href of links) {
    expect(href.startsWith("/") || href.startsWith("https://"), `${label}: ${href} is neither a site path nor https`).toBe(true);
    expect(/^\/(en|es)(\/|$)/.test(href), `${label}: ${href} carries a locale; the Link adds it`).toBe(false);
    expect(resolves(href), `${label}: ${href} goes nowhere`).toBe(true);
  }
  expect(links.filter((l) => l.startsWith("https://")).length, `${label} external links`).toBeLessThanOrEqual(5);

  for (const block of c.body) {
    if (block.type !== "image") continue;
    expect(block.src.startsWith(`/blog/${post.slug}/`), `${label}: ${block.src} belongs under /blog/${post.slug}/`).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, block.src)), `${label}: public${block.src} is missing`).toBe(true);
    expect(wordCount(block.alt), `${label}: alt text for ${block.src}`).toBeGreaterThanOrEqual(4);
  }

  for (const text of texts) {
    const plain = plainText(text);
    // Marks that didn't parse show up as stray symbols on the page.
    expect(plain.includes("**") || plain.includes("](") || /\[[^\]]*\]/.test(plain), `${label}: broken mark-up in "${text}"`).toBe(false);
    for (const pattern of FILLER[locale]) expect(pattern.test(plain), `${label}: filler ${pattern} in "${plain}"`).toBe(false);
    for (const ghost of GHOST_NAMES) expect(plain.includes(ghost), `${label}: "${ghost}" isn't a template's name`).toBe(false);
  }
  for (const block of c.body) for (const text of blockTexts(block)) expect(text.trim().length, `${label}: empty ${block.type}`).toBeGreaterThan(0);
}

describe("blog posts", () => {
  it("every post file is listed, once", () => {
    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""));
    expect([...slugs].sort()).toEqual(files.sort());
    expect(slugs.size).toBe(BLOG_POSTS.length);
  });

  it("no two posts answer the same search", () => {
    for (const locale of ["en", "es"] as const) {
      const keywords = BLOG_POSTS.flatMap((p) => (p.content[locale] ? [p.content[locale].keyword.trim().toLowerCase()] : []));
      expect(new Set(keywords).size, `${locale} keywords repeat`).toBe(keywords.length);
      const titles = BLOG_POSTS.flatMap((p) => (p.content[locale] ? [p.content[locale].title] : []));
      expect(new Set(titles).size, `${locale} titles repeat`).toBe(titles.length);
    }
  });

  it("the queue holds only usable topics that aren't published yet", () => {
    type Entry = { slug: string; keyword: string; keyword_es: string; occasion: string; templates: string[]; angle: string };
    const queue = JSON.parse(fs.readFileSync(path.join(__dirname, "../../docs/blog/queue.json"), "utf8")) as Entry[];
    const published = new Set(BLOG_POSTS.map((p) => p.content.en.keyword.toLowerCase()));
    expect(new Set(queue.map((e) => e.slug)).size, "queue slugs repeat").toBe(queue.length);
    for (const e of queue) {
      expect(e.slug, e.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slugs.has(e.slug), `${e.slug} is already published`).toBe(false);
      expect(published.has(e.keyword.toLowerCase()), `${e.slug}: a post already answers "${e.keyword}"`).toBe(false);
      expect(e.keyword, e.slug).toBe(e.keyword.toLowerCase());
      expect(e.keyword_es.length, `${e.slug} keyword_es`).toBeGreaterThan(3);
      expect(isOccasion(e.occasion), `${e.slug} occasion ${e.occasion}`).toBe(true);
      expect(e.templates.length, `${e.slug} templates`).toBeGreaterThan(0);
      for (const t of e.templates) expect(TEMPLATE_SLUGS, `${e.slug}: ${t}`).toContain(t);
      expect(wordCount(e.angle), `${e.slug} angle`).toBeGreaterThanOrEqual(10);
    }
  });

  it("every change to a published post passed the panel at 10/10/10", () => {
    // The daily SEO routine (docs/blog/SEO-AGENT.md) records each post it improves here, one file a change.
    const dir = path.join(__dirname, "../../docs/blog/reviews/refresh");
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
    for (const file of files) {
      const record = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as ReviewRecord;
      expect(slugs.has(record.slug), `${file}: ${record.slug} is not a published post`).toBe(true);
      expect(file, `${file} is named <slug>-<YYYY-MM-DD>.json`).toMatch(new RegExp(`^${record.slug}-\\d{4}-\\d{2}-\\d{2}\\.json$`));
      expect(record.rounds.length, `${file} rounds`).toBeGreaterThanOrEqual(1);
      expect(record.rounds.length, `${file}: at most five rounds`).toBeLessThanOrEqual(5);
      const last = record.rounds[record.rounds.length - 1];
      for (const [name, criteria] of Object.entries(PANEL)) {
        const review = last?.reviews.find((r) => r.reviewer === name);
        expect(review, `${file}: the last round has no ${name} review`).toBeTruthy();
        expect(review?.overall, `${file}: ${name} overall`).toBe(10);
        for (const c of criteria) expect(review?.scores[c], `${file}: ${name}: ${c}`).toBeGreaterThanOrEqual(9);
        expect(review?.dealbreakers ?? [], `${file}: ${name} dealbreakers`).toEqual([]);
      }
    }
  });

  for (const post of BLOG_POSTS) {
    describe(post.slug, () => {
      it("has a usable slug, dates and templates", () => {
        expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(post.slug.length).toBeLessThanOrEqual(70);
        expect(isDay(post.published), `published ${post.published}`).toBe(true);
        expect(post.published <= today, `published ${post.published} is in the future`).toBe(true);
        if (post.updated) {
          expect(isDay(post.updated), `updated ${post.updated}`).toBe(true);
          expect(post.updated >= post.published && post.updated <= today, `updated ${post.updated}`).toBe(true);
        }
        if (post.occasion) expect(isOccasion(post.occasion)).toBe(true);
        expect(post.templates.length).toBeGreaterThanOrEqual(1);
        expect(post.templates.length).toBeLessThanOrEqual(4);
        for (const slug of post.templates) expect(TEMPLATE_SLUGS, slug).toContain(slug);
      });

      it("is a whole post in English", () => checkContent(post, "en", post.content.en));

      it("passed the review panel at 10/10/10", () => {
        const file = path.join(__dirname, `../../docs/blog/reviews/${post.slug}.json`);
        expect(fs.existsSync(file), `docs/blog/reviews/${post.slug}.json is missing: run the panel in docs/blog/RUBRIC.md`).toBe(true);
        const record = JSON.parse(fs.readFileSync(file, "utf8")) as ReviewRecord;
        expect(record.slug).toBe(post.slug);
        expect(record.rounds.length, "rounds").toBeGreaterThanOrEqual(1);
        if (!REVIEWED_AFTER_PUBLISHING.includes(post.slug)) expect(record.rounds.length, "at most five rounds").toBeLessThanOrEqual(5);
        const last = record.rounds[record.rounds.length - 1];
        for (const [name, criteria] of Object.entries(PANEL)) {
          const review = last?.reviews.find((r) => r.reviewer === name);
          expect(review, `the last round has no ${name} review`).toBeTruthy();
          expect(review?.overall, `${name} overall`).toBe(10);
          for (const c of criteria) expect(review?.scores[c], `${name}: ${c}`).toBeGreaterThanOrEqual(9);
          expect(review?.dealbreakers ?? [], `${name} dealbreakers`).toEqual([]);
        }
      });

      if (post.content.es) {
        const es = post.content.es;
        it("is a whole post in Spanish, matching the English", () => {
          checkContent(post, "es", es);
          // The translation is the same post: same templates in the same order, same pictures, same questions.
          const shape = (c: BlogContent) => c.body.flatMap((b) => (b.type === "template" ? [`t:${b.slug}`] : b.type === "image" ? [`i:${b.src}`] : []));
          expect(shape(es)).toEqual(shape(post.content.en));
          expect(es.faq.length).toBe(post.content.en.faq.length);
        });
      }

      if (BLOG_POSTS.length > 1) {
        it("links to at least one other post", () => {
          const links = contentTexts(post.content.en).flatMap(linksIn);
          expect(links.some((l) => l.startsWith("/blog/") && !l.startsWith(`/blog/${post.slug}`))).toBe(true);
        });
      }
    });
  }
});

/**
 * Facts about Ethos are read from the code, never typed into a post (reports/seoaudit-audit.md, B5 to
 * B10, and the lead's calls of 25 Nov 2026): a price, the number of templates and what is free all
 * change, and a post written from the mirror can't know when. A post states them with the tokens in
 * src/content/blog/fill.ts, which the page fills for its reader. See docs/blog/VOICE.md.
 */
describe("blog posts read Ethos's facts instead of typing them", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const CURRENCIES: Currency[] = ["usd", "eur", "gbp"];
  const versions = BLOG_POSTS.flatMap((post) => (["en", "es"] as const).flatMap((locale) => (post.content[locale] ? [{ post, locale, content: post.content[locale]! }] : [])));
  /**
   * A text with what the page fills taken out, the tokens inside a `{note:…|…}` first and then the note
   * itself: what is left is typed, the same whichever way the free note is set.
   */
  const typed = (t: string) => t.replace(FILL_TOKEN, "·").replace(/\{note:[^|{}]*\|[^|{}]*\}/g, " ");
  const typedTexts = (c: BlogContent) => contentTexts(c).map(typed);
  /** A post's sentences about Ethos: in its own section of a comparison, in its row of a table, or naming it, its pages or offers. */
  const aboutUs = /Ethos|\bour\b|\bnuestr|Make it special|Hazlo especial|\(\/pricing\)|\(\/templates\//i;
  function ethosPieces(content: BlogContent, take: (t: string) => string = (t) => t): string[] {
    let inOurs = false;
    const section = content.body.flatMap((b) => {
      if (b.type === "h2" || b.type === "h3") inOurs = /^Ethos\b/.test(b.text);
      return inOurs ? blockTexts(b).map(take) : [];
    });
    return [
      ...section,
      ...content.body.flatMap((b) => (b.type === "table" ? b.rows.filter((row) => /^Ethos/.test(row[0] ?? "")).flatMap((row) => row.map(take)) : [])),
      ...contentTexts(content).flatMap((text) => take(text).split(/(?<=[.;!?])\s+/).filter((sentence) => aboutUs.test(sentence))),
    ];
  }
  /**
   * How a sentence names a free-tier template (The Letter; Constellations, free only with the note off): its
   * English name, its link, or its Spanish name where that can't be the plain noun ("la carta" is any letter).
   */
  const FREE_TIER = listManifests().filter((m) => m.tier === "free");
  const namesFreeTier = (raw: string) =>
    FREE_TIER.some((m) => raw.includes(m.name.en) || raw.includes(`(/templates/${m.slug})`) || (m.name.es.toLowerCase() !== "la carta" && raw.includes(m.name.es)) || raw.includes(`${m.name.es} de Ethos`));

  it("the title, description and keyword hold no token", () => {
    for (const { post, locale, content } of versions)
      for (const text of [content.title, content.description, content.keyword]) expect.soft(/[{}]/.test(text), `${post.slug} (${locale}): "${text}"`).toBe(false);
  });

  it("every token is one the page can fill, with the free note on and off and in every currency", () => {
    for (const share of ["1", ""]) {
      vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", share);
      for (const { post, locale, content } of versions)
        for (const currency of [...CURRENCIES, undefined] as (Currency | undefined)[]) {
          const filled = fillContent(content, locale, currency);
          for (const text of contentTexts(filled)) expect.soft(/[{}|]/.test(text), `${post.slug} (${locale}, share "${share}", ${currency}): "${text}"`).toBe(false);
        }
    }
  }, 60_000);

  it("no Ethos price is typed: a post writes {price:<product>}", () => {
    // Every amount Ethos charges, in the marks a post would type it with ("$11.99", "£8.99", "9,99 €", "€9.99").
    const ours = (Object.values(PRODUCTS) as { amounts: Record<Currency, number> }[]).flatMap((p) =>
      CURRENCIES.flatMap((c) => {
        const n = (p.amounts[c] / 100).toFixed(2);
        const mark = { usd: "\\$", gbp: "£", eur: "€" }[c];
        return [new RegExp(`(?<!US)${mark}\\s?${n.replace(".", "\\.")}(?!\\d)`), new RegExp(`(?<![\\d.,])${n.replace(".", ",")}\\s?${mark}`)];
      }),
    );
    // Other makers' prices in their own sentences may equal one of ours and are theirs to state.
    for (const { post, locale, content } of versions) {
      const pieces = ethosPieces(content);
      for (const piece of pieces) for (const r of ours) expect.soft(r.test(piece), `${post.slug} (${locale}) types an Ethos price (${r}) in "${piece}"`).toBe(false);
    }
  });

  it("no count of templates or free templates is typed: a post writes {count:templates} and {free:names}", () => {
    // "61 templates" said of Ethos; another maker's count ("More than 40 templates") is theirs to state.
    const typedTotal = /\b\d{2,}\s+(?:[\p{L}-]+\s+)?(?:templates|plantillas)\b/iu;
    // "Two of the templates below are free", said of anything.
    const typedFree = /\b(?:one|two|three|una|uno|dos|tres)\b[^.;:]{0,40}\b(?:is|are|es|son)\s+(?:free|gratis)\b/i;
    for (const { post, locale, content } of versions) {
      for (const text of ethosPieces(content, typed)) expect.soft(typedTotal.test(text), `${post.slug} (${locale}) types a count of templates in "${text}"`).toBe(false);
      for (const text of typedTexts(content)) expect.soft(typedFree.test(text), `${post.slug} (${locale}) types how many are free in "${text}"`).toBe(false);
    }
  });

  it("what is free about The Letter or Constellations is never typed: a post writes it in {note:…|…} or {free:names}", () => {
    const freeWord = /\b(?:free|gratis)\b|500 (?:characters|caracteres)/i;
    for (const { post, locale, content } of versions) {
      // A template card for a free-tier template: its "Free" label is drawn from sendsFree, so its note never says it.
      for (const block of content.body)
        if (block.type === "template" && listManifests().some((m) => m.slug === block.slug && m.tier === "free"))
          expect.soft(freeWord.test(typed(block.note)), `${post.slug} (${locale}) card ${block.slug}: "${block.note}"`).toBe(false);
      // Anywhere else, a sentence that names one of them and what is free about it.
      for (const text of typedTexts(content))
        for (const sentence of text.split(/(?<=[.;!?])\s+/))
          if (namesFreeTier(sentence)) expect.soft(freeWord.test(plainText(sentence)), `${post.slug} (${locale}): "${sentence}"`).toBe(false);
    }
  });
});

describe("blog posts and the owner's rule", () => {
  // Nothing on the site names Spain or a Spanish city. The Publish blog workflow runs this file on every merge from the
  // mirror, so a new post that names one does not go live either. "Spanish", the language, is allowed (SPAIN_WORDS).
  it("no post names Spain or a Spanish city, in either language", () => {
    const named: string[] = [];
    const walk = (value: unknown, where: string) => {
      if (typeof value === "string") {
        const hit = SPAIN_WORDS.exec(value);
        if (hit) named.push(`${where}: ${hit[0]}`);
      } else if (Array.isArray(value)) value.forEach((v) => walk(v, where));
      else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v, where);
    };
    for (const post of BLOG_POSTS) for (const locale of ["en", "es"] as const) walk(post.content[locale], `${post.slug} (${locale})`);
    expect(named).toEqual([]);
  });
});
