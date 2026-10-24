import { describe, expect, it } from "vitest";
import { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { TEMPLATE_SEO } from "@/content/template-seo";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug } from "@/content/recipients";
import { getManifest } from "@/templates/manifests";

const LOCALES = ["en", "es"] as const;

/**
 * The words the template and gift-idea pages are found by. Google cuts a title at about 60
 * characters and a snippet at about 160, so the part that says what the page is has to fit; and an
 * entry for a template that no longer exists would put a dead page in the results.
 */
describe("template search entries", () => {
  it("belong to real templates, in both languages", () => {
    for (const [slug, entry] of Object.entries(TEMPLATE_SEO)) {
      expect(getManifest(slug), slug).not.toBeNull();
      for (const l of LOCALES) {
        const e = entry[l];
        expect(e.keyword.trim(), `${slug} ${l} keyword`).not.toBe("");
        expect(e.howTo.trim(), `${slug} ${l} howTo`).not.toBe("");
        expect(e.title.length, `${slug} ${l} title: ${e.title}`).toBeLessThanOrEqual(60);
        expect(e.description.length, `${slug} ${l} description`).toBeLessThanOrEqual(170);
      }
    }
  });

  it("don't give two templates the same title", () => {
    for (const l of LOCALES) {
      const titles = Object.values(TEMPLATE_SEO).map((e) => e[l].title.toLowerCase());
      expect(new Set(titles).size, l).toBe(titles.length);
    }
  });
});

describe("the digital gift guide on /gifts", () => {
  it("lists real templates, once each, the same in both languages", () => {
    expect(new Set(DIGITAL_GIFT_IDEAS).size).toBe(DIGITAL_GIFT_IDEAS.length);
    for (const slug of DIGITAL_GIFT_IDEAS) expect(getManifest(slug), slug).not.toBeNull();
    const [en, es] = LOCALES.map((l) => DIGITAL_GIFT_GUIDE[l]);
    expect(es.groups.map((g) => g.templates)).toEqual(en.groups.map((g) => g.templates));
    expect(es.faq.length).toBe(en.faq.length);
  });

  it("says how many ideas it has, and has that many", () => {
    for (const l of LOCALES) expect(DIGITAL_GIFT_GUIDE[l].ideasTitle).toContain(String(DIGITAL_GIFT_IDEAS.length));
  });
});

describe("gift ideas by who it's for", () => {
  it("round-trips its path segment", () => {
    for (const r of RECIPIENTS) expect(recipientFromSlug(recipientSlug(r))).toBe(r);
    expect(recipientFromSlug("for-nobody")).toBeNull();
    expect(recipientFromSlug("boyfriend")).toBeNull();
  });

  it("suggests real templates, the same ones in both languages", () => {
    for (const r of RECIPIENTS) {
      const [en, es] = LOCALES.map((l) => RECIPIENT_GUIDES[r][l]);
      expect(es.ideas.map((i) => i.template), r).toEqual(en.ideas.map((i) => i.template));
      expect(new Set(en.ideas.map((i) => i.template)).size, `${r} repeats a template`).toBe(en.ideas.length);
      for (const idea of en.ideas) expect(getManifest(idea.template), `${r}: ${idea.template}`).not.toBeNull();
      for (const g of [en, es]) {
        expect(g.title.length, `${r}: ${g.title}`).toBeLessThanOrEqual(65);
        expect(g.description.length, `${r}: description`).toBeLessThanOrEqual(170);
        expect(g.ideas.length, r).toBeGreaterThanOrEqual(6);
        expect(g.faq.length, r).toBe(3);
        expect(g.sections.length, r).toBe(2);
      }
    }
  });

  it("is mentioned by name in its own h1 and title", () => {
    const words: Record<(typeof RECIPIENTS)[number], [string, string]> = {
      boyfriend: ["boyfriend", "novio"],
      girlfriend: ["girlfriend", "novia"],
      husband: ["husband", "marido"],
      wife: ["wife", "esposa"],
      "best-friend": ["best friend", "mejor amiga"],
      mom: ["mom", "mamá"],
      dad: ["dad", "papá"],
    };
    for (const r of RECIPIENTS) {
      LOCALES.forEach((l, i) => {
        const g = RECIPIENT_GUIDES[r][l];
        expect(g.h1.toLowerCase(), `${r} ${l}`).toContain(words[r][i]);
        expect(g.title.toLowerCase(), `${r} ${l}`).toContain(words[r][i]);
      });
    }
  });
});
