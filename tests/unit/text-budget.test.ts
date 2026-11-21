import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS } from "@/content/template-steps";
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

const EXPERIENCE_KEYS = ["experienceOpens", "experienceNote", "experiencePhotosNone", "experiencePhotosOne", "experiencePhotosMany", "experienceMic", "experienceMotion", "experienceSong", "experienceTouch"] as const;

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
      // The checks are read off the gift (sections.tsx, experienceChecks): each wording, with the longest numbers a gift has.
      const filled = (key: (typeof EXPERIENCE_KEYS)[number]) => guide[key].replace("{min}", "3").replace("{max}", "20").replace("{chars}", "500");
      for (const key of EXPERIENCE_KEYS) if (words(filled(key)) > 12) over.push(`${l} templates.guide.${key} (${words(filled(key))})`);
      // The first check is the gift's own line on what the person who gets it does.
      for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) if (words(row.line[l]) > 12) over.push(`${slug} ${l} line (${words(row.line[l])}): ${row.line[l]}`);
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
      // "More like this" is headed by the day the four gifts are for: one heading for each day a gift can be made for.
      for (const m of TEMPLATE_MANIFESTS)
        for (const o of m.occasions) {
          const heading = (messages.templates.guide.moreFor as Record<string, string>)[o];
          if (!heading) over.push(`${l} templates.guide.moreFor.${o} is missing`);
          else if (words(heading) > 9) over.push(`${l} templates.guide.moreFor.${o}`);
        }
      for (const m of TEMPLATE_MANIFESTS) if (words(m.name[l]) > 9) over.push(`${m.slug} ${l} name`);
    }
    expect(over).toEqual([]);
  });

  it("the hero says a dozen to forty words of a description, in whole sentences, and loses none of it", () => {
    let shown = 0;
    const none: string[] = [];
    for (const m of TEMPLATE_MANIFESTS)
      for (const l of LOCALES) {
        const { lead, rest } = heroLead(m.description[l]);
        expect([lead, rest].filter(Boolean).join(" "), `${m.slug} ${l}`).toBe(m.description[l].trim().replace(/\s+/g, " "));
        if (!lead) {
          none.push(`${m.slug} ${l}`);
          continue;
        }
        shown += 1;
        // Never a stub, never past forty, and thirty unless it took a second sentence to say anything.
        expect(words(lead), `${m.slug} ${l}: “${lead}” is a stub`).toBeGreaterThanOrEqual(12);
        expect(words(lead), `${m.slug} ${l}`).toBeLessThanOrEqual(40);
        expect(lead, `${m.slug} ${l}: the lead stops mid-sentence`).toMatch(/[.!?]$/);
      }
    // Where no dozen words fit in forty, the tagline tells it. That is the exception, and it is counted.
    expect(shown).toBeGreaterThan(TEMPLATE_MANIFESTS.length * 1.5);
    expect(none.length, none.join(", ")).toBeLessThanOrEqual(TEMPLATE_MANIFESTS.length / 2);
  });

  it("La carta is not cut down to its first five words", () => {
    // The owner's example (21 Nov 2026): the Spanish Letter said only "Toca para romper el sello."
    const es = TEMPLATE_MANIFESTS.find((m) => m.slug === "the-letter")!.description.es;
    const { lead, rest } = heroLead(es);
    expect(lead).toBe(es);
    expect(rest).toBe("");
    expect(heroLead("Tap to break the seal. " + "word ".repeat(40).trim() + ".").lead).toBe("");
    expect(heroLead("One two three four five six seven eight nine ten eleven twelve. And a second sentence that would fit, but is not needed.").lead).toBe(
      "One two three four five six seven eight nine ten eleven twelve. And a second sentence that would fit, but is not needed.",
    );
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
