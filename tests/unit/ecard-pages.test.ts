import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOccasion } from "@/config/occasions";
import { ECARD_PAGES } from "@/content/ecards";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, GUIDES_FOR_OCCASION } from "@/content/gift-guides";
import { pageUpdated } from "@/content/page-dates";
import { DEMO_PHOTOS } from "@/templates/_shared/demo-photos";
import { getManifest } from "@/templates/manifests";
import { ecardIndexLineProblem, ecardProblem, pathProblem } from "../../scripts/blog-guard.mjs";

const DIR = "src/content/ecards/pages";
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));
const INDEX = readFileSync("src/content/ecards/index.ts", "utf8");
const queue = JSON.parse(readFileSync("docs/ecards/queue.json", "utf8")) as { pages: { slug: string; done?: string }[] };

/** Every string in a value, at any depth. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/**
 * The ecard pages are written by a cloud routine (docs/ecards/PLAYBOOK.md) and go live with nobody
 * reading them first. They are gift pages by kind, so tests/unit/gift-guides.test.ts,
 * spread-budget.test.ts and guides-claims.test.ts already hold every one of them to the pages' rules
 * (what each gift really does, the limits of its fields, no filler, both languages). These are the
 * rules of their own: a page is data, it is where the list says, and it says nothing about money or
 * the free gift that the code doesn't fill in.
 */
describe("ecard pages", () => {
  it("each file is one page of plain data, named by its address, and in the list once", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(ECARD_PAGES).toHaveLength(files.length);
    expect(new Set(ECARD_PAGES.map((p) => p.slug)).size).toBe(ECARD_PAGES.length);
    for (const f of files) {
      expect(ecardProblem(readFileSync(`${DIR}/${f}`, "utf8")), f).toBeNull();
      expect(pathProblem(`${DIR}/${f}`), f).toBeNull();
      const slug = f.replace(/\.ts$/, "");
      expect(ECARD_PAGES.some((p) => p.slug === slug), `${f} is in the index under its file's name`).toBe(true);
    }
    for (const line of INDEX.split(/\r?\n/).filter((l) => /^(import \{|const PAGES)/.test(l))) expect(ecardIndexLineProblem(line), line).toBeNull();
  });

  it("the guard lets the routine's files through and nothing else of the site", () => {
    for (const ok of ["src/content/ecards/pages/birthday-ecards.ts", "src/content/ecards/index.ts", "docs/ecards/queue.json", "docs/ecards/log.md", "docs/ecards/reviews/birthday-ecards.json"]) expect(pathProblem(ok), ok).toBeNull();
    for (const bad of ["src/content/ecards/types.ts", "src/content/ecards/pages/last-minute.ts", "src/content/ecards/pages/Birthday-ecards.ts", "src/content/ecards/pages/birthday-ecards.tsx", "src/content/gift-guides.ts", "docs/ecards/PLAYBOOK.md", "tests/unit/ecard-pages.test.ts"]) {
      expect(pathProblem(bad), bad).not.toBeNull();
    }
    const sample = readFileSync(`${DIR}/${files[0]}`, "utf8");
    expect(ecardProblem(sample.replace('added: "', 'added: process.env.X + "'))).not.toBeNull();
    expect(ecardProblem(sample.replace('import type { EcardPage } from "../types";', 'import type { EcardPage } from "../types";\nimport { x } from "../../x";'))).not.toBeNull();
    expect(ecardProblem(sample.replace(/"christmas-ecards"/, "`christmas-ecards`"))).not.toBeNull();
    expect(ecardIndexLineProblem('import { page as x } from "./pages/../../secrets";')).not.toBeNull();
    expect(ecardIndexLineProblem("export const leak = process.env;")).not.toBeNull();
  });

  for (const page of ECARD_PAGES) {
    describe(page.slug, () => {
      it("has an address, a date, a photo, a gift on its phone and an occasion that exist", () => {
        expect(page.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*-ecards$/);
        expect(GIFT_GUIDE_SLUGS).toContain(page.slug);
        for (const day of [page.added, ...(page.updated ? [page.updated] : [])]) {
          expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(Number.isNaN(Date.parse(day))).toBe(false);
        }
        if (page.updated) expect(page.updated >= page.added).toBe(true);
        expect(pageUpdated(`/gifts/${page.slug}`)).toBe(page.updated ?? page.added);
        expect(DEMO_PHOTOS[page.photo], page.photo).toBeTruthy();
        expect(getManifest(page.cover), page.cover).toBeTruthy();
        // The gift on the band's phone is one the page lists.
        expect(page.en.ideas.map((i) => i.template)).toContain(page.cover);
        if (page.occasion) {
          expect(isOccasion(page.occasion)).toBe(true);
          expect(GUIDES_FOR_OCCASION[page.occasion]).toContain(page.slug);
        }
      });

      it("says ecard where people look for it, and the same gifts in both languages", () => {
        expect(page.en.title).toMatch(/ecards?/i);
        expect(page.en.h1).toMatch(/ecards?/i);
        expect(page.en.description).toMatch(/ecards?/i);
        expect(`${page.es.title} ${page.es.h1}`).toMatch(/tarjetas?/i);
        expect(page.es.ideas.map((i) => i.template)).toEqual(page.en.ideas.map((i) => i.template));
        expect(page.es.ideas.map((i) => i.line.field)).toEqual(page.en.ideas.map((i) => i.line.field));
        expect(page.en.ideas.length).toBeGreaterThanOrEqual(5);
        expect(page.en.ideas.length).toBeLessThanOrEqual(9);
        expect(new Set(page.en.ideas.map((i) => i.template)).size).toBe(page.en.ideas.length);
      });

      it("writes no price, and states the free gift only through a token the code fills", () => {
        for (const locale of ["en", "es"] as const) {
          const written = strings(page[locale]);
          for (const text of written) {
            // A price is read from PRODUCTS by the page; a number typed here goes stale and is wrong in two of three currencies.
            expect(text, text.slice(0, 60)).not.toMatch(/[$€£]\s?\d|\d\s?(€|EUR|USD|GBP|dollars?|euros?|pounds?|d[oó]lares|libras)\b/i);
            for (const [token] of text.matchAll(/\{[^{}|]*[:|]?/g)) expect(token, text.slice(0, 60)).toMatch(/^\{(note:|free:names$|count:templates$)/);
          }
          // What a search result shows is read before any token is filled.
          for (const plain of [page[locale].title, page[locale].description, page[locale].h1, page[locale].label, page[locale].ideasTitle, page[locale].craft]) expect(plain).not.toMatch(/[{}]/);
          // Filled, nothing of a token is left.
          for (const text of strings(GIFT_GUIDES[page.slug][locale])) expect(text, text.slice(0, 60)).not.toMatch(/[{}]/);
        }
      });

      it("is marked done in the queue", () => {
        const entry = queue.pages.find((p) => p.slug === page.slug);
        expect(entry, `${page.slug} is in docs/ecards/queue.json`).toBeTruthy();
        expect(entry!.done).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  }

  it("the queue names each page once, and marks done only pages that exist", () => {
    expect(new Set(queue.pages.map((p) => p.slug)).size).toBe(queue.pages.length);
    for (const entry of queue.pages) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*-ecards$/);
      if (entry.done) expect(ECARD_PAGES.some((p) => p.slug === entry.slug), `${entry.slug} is marked done`).toBe(true);
    }
  });
});
