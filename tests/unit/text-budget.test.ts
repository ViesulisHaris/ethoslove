import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS } from "@/content/template-steps";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { CLOSED_BLOCK_WORDS, TAGLINE_WORDS, fitSentences, heroKeyword, heroLead, heroWords } from "@/components/templates/page/lead";
import { TEMPLATE_LEADS, templateLead } from "@/content/template-leads";
import { templateSeo } from "@/content/template-seo";

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
    // Where no dozen words fit in forty, the gift has a sentence written for its hero (content/template-leads.ts).
    expect(shown).toBeGreaterThan(TEMPLATE_MANIFESTS.length * 1.5);
    expect(none.length, none.join(", ")).toBeLessThanOrEqual(TEMPLATE_MANIFESTS.length / 2);
  });

  it("the italic line is a line: a tagline that is a paragraph gives its first sentence, and the rest stands under it", () => {
    // The deep test of 21 Nov 2026: seven gifts had 21 to 31 words of italic display type under the
    // name, four or five rows on a phone, and Light the Candles' pushed "Make this gift" off a small phone's first screen.
    // The confirming test of 22 Nov 2026: ten more had two sentences and 17 to 19 words, three or four rows on a
    // 320px phone, and the Spanish Photo Booth's button began at 567 of the first screen's 568.
    const split: string[] = [];
    for (const m of TEMPLATE_MANIFESTS) {
      const long = LOCALES.some((l) => words(m.tagline[l]) > TAGLINE_WORDS);
      for (const l of LOCALES) {
        const hero = heroWords(m.tagline, m.description[l], l);
        if (!long) {
          // Every other gift's hero is as it was: its tagline, then the description's opening.
          expect(hero, `${m.slug} ${l}`).toEqual({ line: m.tagline[l], ...heroLead(m.description[l]) });
          continue;
        }
        if (l === "en") split.push(m.slug);
        // One sentence in italics and the rest of the tagline under it, where the description's opening stood; the closed block keeps what it kept.
        expect(hero.line, `${m.slug} ${l}`).toMatch(/^[^.!?]+[.!?]$/);
        expect(words(hero.line), `${m.slug} ${l}: “${hero.line}”`).toBeLessThanOrEqual(14);
        expect(`${hero.line} ${hero.lead}`, `${m.slug} ${l}`).toBe(m.tagline[l]);
        // A whole sentence, and never a paragraph. It may be short ("Whoever gets the big half gets the
        // wish."): it follows the line it was written to follow, and the two are the tagline.
        expect(hero.lead, `${m.slug} ${l}`).toMatch(/[.!?]$/);
        expect(words(hero.lead), `${m.slug} ${l}: “${hero.lead}” is a stub`).toBeGreaterThanOrEqual(8);
        expect(words(hero.lead), `${m.slug} ${l}`).toBeLessThanOrEqual(30);
        // The whole of the hero's own words, italic line and sentence, is what the mock-up's has: forty at most.
        expect(words(hero.line) + words(hero.lead), `${m.slug} ${l}`).toBeLessThanOrEqual(40);
        expect(hero.rest, `${m.slug} ${l}`).toBe(heroLead(m.description[l]).rest);
      }
    }
    // The seventeen the two tests named, and no other: a new gift with a long tagline shows up here to be read.
    expect(split.sort()).toEqual([
      "autumn-reel",
      "be-my-boo",
      "digicam",
      "evergreen",
      "fall-for-you",
      "frosted-window",
      "gingerbread-house",
      "haunted-house",
      "keepsake",
      "light-the-candles",
      "music-box",
      "nice-list",
      "on-repeat",
      "party-animals",
      "photo-booth",
      "string-the-lights",
      "wishbone",
    ]);
    // Every one of them is two sentences in both languages, so no page keeps a paragraph because of its language.
    for (const slug of split) for (const l of LOCALES) expect(TEMPLATE_MANIFESTS.find((m) => m.slug === slug)!.tagline[l].trim().split(/(?<=[.!?])\s+/).length, `${slug} ${l}`).toBeGreaterThanOrEqual(2);
    expect(heroWords(TEMPLATE_MANIFESTS.find((m) => m.slug === "photo-booth")!.tagline, "x", "es")).toMatchObject({ line: "Corre la cortina y pulsa el botón.", lead: "Cuatro flashes, y sale una tira de fotos de los dos." });
    expect(heroWords(TEMPLATE_MANIFESTS.find((m) => m.slug === "light-the-candles")!.tagline, "x", "en").line).toBe("A Thanksgiving table at dusk, five candles unlit.");
    // No italic line on any page is a paragraph now.
    for (const m of TEMPLATE_MANIFESTS) for (const l of LOCALES) expect(words(heroWords(m.tagline, m.description[l], l).line), `${m.slug} ${l}`).toBeLessThanOrEqual(TAGLINE_WORDS);
    // A long tagline of one sentence can't be split, and is left whole.
    expect(heroWords({ en: `${"word ".repeat(25).trim()}.`, es: "Una frase." }, "The description.", "en").line.split(" ")).toHaveLength(25);
  });

  it("no hero is left with only a name and an italic line: a gift whose description gives no lead has one written", () => {
    // The test of 21 Nov 2026: eleven heroes in each language said nothing about what the gift is, XOXO's among them.
    const off: string[] = [];
    for (const m of TEMPLATE_MANIFESTS)
      for (const l of LOCALES) {
        const own = heroWords(m.tagline, m.description[l], l).lead;
        const written = templateLead(m.slug, l);
        if (!own && !written) off.push(`${m.slug} ${l}: no sentence under the name`);
        if (own && written) off.push(`${m.slug} ${l}: a lead is written, and the description already gives one`);
        if (!written) continue;
        // The hero's own limit beside the picture: a dozen to thirty words, in whole sentences.
        if (words(written) < 12 || words(written) > 30) off.push(`${m.slug} ${l}: ${words(written)} words`);
        if (!/[.]$/.test(written)) off.push(`${m.slug} ${l}: stops mid-sentence`);
        if (/[!¡]|—| – |perfect for|perfecto para|perfecta para|unforgettable|inolvidable/i.test(written)) off.push(`${m.slug} ${l}: reads like an advert`);
        // It says the gift, not the tagline over again.
        if (written.trim() === m.tagline[l].trim()) off.push(`${m.slug} ${l}: the tagline twice`);
      }
    for (const slug of Object.keys(TEMPLATE_LEADS)) if (!TEMPLATE_MANIFESTS.some((m) => m.slug === slug)) off.push(`${slug} is not a template`);
    expect(off).toEqual([]);
  });

  it("the h1 never says the same words twice: a keyword that is the gift's name is left out", () => {
    expect(heroKeyword("Cuenta atrás de medianoche", "Cuenta atrás de medianoche")).toBeNull();
    expect(heroKeyword("CUENTA  ATRÁS de medianoche ", "Cuenta atrás de medianoche")).toBeNull();
    expect(heroKeyword("Digital love letter", "The Letter")).toBe("Digital love letter");
    expect(heroKeyword(undefined, "The Letter")).toBeNull();
    // The one page it happened on, read from the page's own data.
    const midnight = TEMPLATE_MANIFESTS.find((m) => m.slug === "midnight-countdown")!;
    expect(heroKeyword(templateSeo("midnight-countdown", "es")?.keyword, midnight.name.es)).toBeNull();
    expect(heroKeyword(templateSeo("midnight-countdown", "en")?.keyword, midnight.name.en)).toBe("Midnight countdown gift");
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
        const rest = heroWords(m.tagline, m.description[l], l).rest;
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
