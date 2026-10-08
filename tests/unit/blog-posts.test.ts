import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isOccasion } from "@/config/occasions";
import { BLOG_POSTS } from "@/content/blog";
import { blockTexts, contentTexts, contentWords, linksIn, plainText, wordCount } from "@/content/blog/text";
import type { BlogContent, BlogPost } from "@/content/blog/types";
import { TEMPLATE_SLUGS } from "@/templates/manifests";

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
const STATIC_PATHS = new Set(["/", "/templates", "/occasions", "/pricing", "/blog", "/legal/terms", "/legal/privacy"]);

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
  return false;
}

/** Filler that marks text nobody would say out loud. */
const FILLER: Record<"en" | "es", RegExp[]> = {
  en: [
    /\bdelve\b/i,
    /in today'?s (fast-paced|digital|modern) world/i,
    /\bgame[- ]changer\b/i,
    /\belevate (your|the)\b/i,
    /\bunlock the (power|secret)/i,
    /look no further/i,
    /\btapestry\b/i,
    /\bembark on\b/i,
    /\bin the realm of\b/i,
    /\ba testament to\b/i,
    /it'?s (important|worth) to note/i,
    /\bin conclusion\b/i,
    /\bnavigat(e|ing) the (complexities|world|waters)\b/i,
    /\bwhether you'?re a\b/i,
    /\bseamless(ly)?\b/i,
    /\bunforgettable\b/i,
    /\bcherished memories\b/i,
  ],
  es: [/en el mundo (actual|de hoy)/i, /\bsumérgete\b/i, /\bdesbloquea(r)? (el poder|los secretos)\b/i, /\ben conclusión\b/i, /\binolvidable\b/i, /\bun testimonio de\b/i],
};

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
