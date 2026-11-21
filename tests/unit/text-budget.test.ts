import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { CLOSED_BLOCK_WORDS, fitSentences, heroLead } from "@/components/templates/page/lead";

/**
 * "It's SOOO MUCH TEXT… no one's reading all that" (the owner, 21 Nov 2026). The limits a gift's
 * page is written to, from docs/marketing/growth-build/DESIGN-LESS-TEXT.md: a card is a title, a
 * section's left column has one line, and what a search still needs sits in one closed block.
 * Each failure names the entry that is too long, so the fix is to cut that one.
 */
const LOCALES = ["en", "es"] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("the text budget of a gift's page", () => {
  it("an idea is a card: a title of at most six words, one line of at most sixteen on what to do", () => {
    const over: string[] = [];
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES)
        for (const idea of guide[l].ideas.items) {
          if (words(idea.heading) > 6) over.push(`${slug} ${l} heading (${words(idea.heading)}): ${idea.heading}`);
          if (words(idea.how) > 16) over.push(`${slug} ${l} how (${words(idea.how)}): ${idea.how}`);
        }
    expect(over).toEqual([]);
  });

  it("a section's left column has one line of at most fourteen words", () => {
    const over: string[] = [];
    for (const [l, messages] of [["en", en], ["es", es]] as const) {
      const guide = messages.templates.guide;
      for (const key of ["howLine", "ideasLine", "faqLine"] as const) if (words(guide[key]) > 14) over.push(`${l} templates.guide.${key} (${words(guide[key])})`);
      // "The experience" has the mock-up's two lines beside its picture, and three short checks.
      if (words(guide.experienceBody) > 24) over.push(`${l} templates.guide.experienceBody (${words(guide.experienceBody)})`);
      for (const key of ["experienceCheck1", "experienceCheck2", "experienceCheck3"] as const) if (words(guide[key]) > 12) over.push(`${l} templates.guide.${key} (${words(guide[key])})`);
      // The line under the buttons says what it costs and no more.
      for (const key of ["pagePriceNote", "pagePriceFree", "pagePricePaid"] as const) if (words(messages.templates[key]) > 16) over.push(`${l} templates.${key} (${words(messages.templates[key])})`);
    }
    expect(over).toEqual([]);
  });

  it("a picture card has a title of at most nine words: the three steps and a gift's name", () => {
    const over: string[] = [];
    for (const [l, messages] of [["en", en], ["es", es]] as const) {
      for (const key of ["step1Title", "step2Title", "step3Title", "experienceHeading", "moreHeading"] as const)
        if (words(messages.templates.guide[key]) > 9) over.push(`${l} templates.guide.${key}`);
      for (const m of TEMPLATE_MANIFESTS) if (words(m.name[l]) > 9) over.push(`${m.slug} ${l} name`);
    }
    expect(over).toEqual([]);
  });

  it("the hero says at most thirty words of a description, in whole sentences, and loses none of it", () => {
    let shown = 0;
    for (const m of TEMPLATE_MANIFESTS)
      for (const l of LOCALES) {
        const { lead, rest } = heroLead(m.description[l]);
        expect(words(lead), `${m.slug} ${l}`).toBeLessThanOrEqual(30);
        expect([lead, rest].filter(Boolean).join(" "), `${m.slug} ${l}`).toBe(m.description[l].trim().replace(/\s+/g, " "));
        if (lead) {
          shown += 1;
          expect(lead, `${m.slug} ${l}: the lead stops mid-sentence`).toMatch(/[.!?]$/);
        }
      }
    // Most descriptions open with a sentence short enough to show; where none does, the tagline tells it.
    expect(shown).toBeGreaterThan(TEMPLATE_MANIFESTS.length);
  });

  it("the closed block under the questions holds at most 180 words, on every template's page", () => {
    // What the block says: the rest of the description, then each idea's title and its line on what
    // to do, or, on a page without a guide, the steps' sentences: of either, as many as the limit
    // leaves room for (components/templates/page/sections.tsx fits them the same way).
    const over: string[] = [];
    for (const [l, messages] of [["en", en], ["es", es]] as const) {
      const g = messages.templates.guide;
      // ICU's two wordings of the first step, counted as the longer one.
      const step1 = g.step1Body.replace(/\{min, plural, =0 \{[^}]*\{max\}[^}]*\} other \{([^}]*\{max\}[^}]*)\}\}/, "$1");
      for (const m of TEMPLATE_MANIFESTS) {
        const guide = Object.hasOwn(TEMPLATE_GUIDES, m.slug) ? TEMPLATE_GUIDES[m.slug][l] : null;
        const rest = heroLead(m.description[l]).rest;
        expect(words(rest), `${m.slug} ${l}: the description alone overruns the block`).toBeLessThanOrEqual(CLOSED_BLOCK_WORDS);
        const steps = fitSentences([step1, g.step1Music, g.step2Body, g.step2Extras, g.step3Body], [4, 0, 3, 1, 2], CLOSED_BLOCK_WORDS - (rest ? words(rest) : 0));
        // How it is sent, and how many photos it takes, are on every page whatever else is cut.
        if (!guide) expect(steps, `${m.slug} ${l}`).toEqual(expect.arrayContaining([g.step3Body, step1]));
        const ideas = guide ? fitSentences(guide.ideas.items.map((idea) => `${idea.heading}. ${idea.how}`), guide.ideas.items.map((_, i) => i), CLOSED_BLOCK_WORDS - (rest ? words(rest) : 0)) : [];
        // A long description may push the last idea's line out of the block; never more than that.
        if (guide) expect(ideas.length, `${m.slug} ${l}`).toBeGreaterThanOrEqual(guide.ideas.items.length - 1);
        const body = (guide ? ideas : steps).reduce((n, s) => n + words(s), 0);
        const count = (rest ? words(rest) : 0) + body;
        if (count > CLOSED_BLOCK_WORDS) over.push(`${m.slug} ${l}: ${count}`);
      }
    }
    expect(over).toEqual([]);
  });

  it("sentences are fitted by what a search needs most, and given back in their own order", () => {
    expect(fitSentences(["one two three", null, "four five", "six"], [3, 0, 2], 4)).toEqual(["one two three", "six"]);
    expect(fitSentences(["one two three", "four five"], [1, 0], 2)).toEqual(["four five"]);
    expect(fitSentences(["one"], [0], 0)).toEqual([]);
  });
});
