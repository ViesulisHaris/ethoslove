import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OCCASIONS } from "@/config/occasions";
import { SPREAD_PLACEMENTS } from "@/components/marketing/spread/placements";
import { CLOSED_BLOCK_WORDS } from "@/components/templates/page/lead";
import { digitalCardsCopy, type DigitalCardsFacts } from "@/content/digital-cards";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS } from "@/content/gift-guides";
import { CARD_LINE_WORDS, CARD_TITLE_WORDS, HAND_LINE_WORDS, handLine, kindCardLine, occasionCardLine, occasionSample, openingLine, sampleLines, taglineLine } from "@/content/idea-cards";
import { SAMPLE_FIELDS, type ListedOccasion } from "@/content/occasion-ideas";
import { OCCASION_GUIDES } from "@/content/occasions";
import { ART_IDS } from "@/content/page-art";
import { fieldLimit } from "@/lib/gift/field-limit";
import { getManifest, listManifests } from "@/templates/manifests";

/**
 * "It's SOOO MUCH TEXT… shorten the text and add more visual things, as no one's reading all that"
 * (the owner, 21 Nov 2026, on the first version of these pages). The limits /digital-cards, the
 * gift pages by kind and the occasion idea lists are written to, from docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md: the hero has one italic line and one sentence of at most thirty words, a
 * section's left column one line of at most fourteen, a card is a title of at most nine words that
 * opens to one line and one line of handwriting, and what a search still needs sits in closed
 * blocks of at most 180 words. Each failure names the entry that is too long, so the fix is to cut
 * that one. tests/e2e/spread-design.spec.ts counts the words a visitor really sees.
 */
const LOCALES = ["en", "es"] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** A whole statement: it ends where a sentence does. */
const ends = (s: string) => /[.?!…]["”»)]?$/.test(s.trim());
/** Every figure a text states. */
const figures = (s: string) => s.match(/\d[\d.,:]*/g) ?? [];

const HERO_LINE_WORDS = 16;
const HERO_SENTENCE_WORDS = 30;
const SECTION_LINE_WORDS = 14;

describe("the text budget of the gift pages by kind", () => {
  it("the hero says one italic line and one sentence", () => {
    const over: string[] = [];
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES) {
        const guide = GIFT_GUIDES[slug][l];
        if (words(guide.hero.line) > HERO_LINE_WORDS) over.push(`${slug} ${l} hero.line (${words(guide.hero.line)})`);
        if (words(guide.hero.sentence) > HERO_SENTENCE_WORDS) over.push(`${slug} ${l} hero.sentence (${words(guide.hero.sentence)})`);
        if (!ends(guide.hero.line) || !ends(guide.hero.sentence)) over.push(`${slug} ${l}: the hero's words are not whole sentences`);
        if (words(guide.h1) > 11) over.push(`${slug} ${l} h1 (${words(guide.h1)})`);
        if (words(guide.ideasTitle) > CARD_TITLE_WORDS) over.push(`${slug} ${l} ideasTitle (${words(guide.ideasTitle)})`);
      }
    expect(over).toEqual([]);
  });

  it("the hero's film is a gift the page lists, the same one in both languages", () => {
    for (const slug of GIFT_GUIDE_SLUGS) {
      const film = GIFT_GUIDES[slug].en.film;
      expect(GIFT_GUIDES[slug].es.film, slug).toBe(film);
      if (film) expect(GIFT_GUIDES[slug].en.ideas.map((i) => i.template), slug).toContain(film);
      expect(getManifest(film ?? GIFT_GUIDES[slug].en.ideas[0].template)?.thumbnail.webm, `${slug}: the gift in the hero has no film`).toBeTruthy();
    }
    // No two pages open on the same gift's film.
    const leads = GIFT_GUIDE_SLUGS.map((slug) => GIFT_GUIDES[slug].en.film ?? GIFT_GUIDES[slug].en.ideas[0].template);
    expect(new Set(leads).size).toBe(leads.length);
  });

  it("an idea is a card: a title of at most nine words, one line, and one line of handwriting", () => {
    const over: string[] = [];
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES)
        for (const idea of GIFT_GUIDES[slug][l].ideas) {
          const at = `${slug} ${l} ${idea.template}`;
          if (words(idea.heading) > CARD_TITLE_WORDS) over.push(`${at} heading (${words(idea.heading)}): ${idea.heading}`);
          const line = kindCardLine(idea);
          if (!line) over.push(`${at}: no line for its card (its opening sentence is too long: give it a brief)`);
          else if (words(line) > CARD_LINE_WORDS) over.push(`${at} line (${words(line)}): ${line}`);
          else if (!ends(line)) over.push(`${at}: its card's line is not a whole sentence: ${line}`);
          const hand = handLine(idea.line.text);
          if (words(hand) > HAND_LINE_WORDS) over.push(`${at} handwriting (${words(hand)}): ${hand}`);
          // What is shown of a line to borrow is its own opening, so it fits the field the whole line fits.
          if (!idea.line.text.startsWith(hand)) over.push(`${at}: the handwriting is not the opening of its line`);
          if (words(idea.line.where) > 9) over.push(`${at} where (${words(idea.line.where)}): ${idea.line.where}`);
        }
    expect(over).toEqual([]);
  });

  it("a card's own short line states no figure the idea in full does not", () => {
    // A brief is cut from an idea whose every fact was checked against the template: it may not bring a number of its own.
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES)
        for (const idea of GIFT_GUIDES[slug][l].ideas) {
          if (!idea.brief) continue;
          for (const figure of figures(idea.brief)) expect(idea.body, `${slug} ${l} ${idea.template}: “${figure}” is in the brief and not in the idea`).toContain(figure);
          // The same card has a brief in both languages, or in neither.
          const twin = GIFT_GUIDES[slug][l === "en" ? "es" : "en"].ideas.find((i) => i.template === idea.template);
          expect(twin?.brief, `${slug} ${idea.template}: a brief in ${l} only`).toBeTruthy();
        }
  });

  it("what the page keeps closed is at most 180 words a block", () => {
    const over: string[] = [];
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES) {
        const guide = GIFT_GUIDES[slug][l];
        for (const section of guide.sections) if (words(section.body) > CLOSED_BLOCK_WORDS) over.push(`${slug} ${l} ${section.heading} (${words(section.body)})`);
        for (const f of guide.faq) if (words(f.a) > CLOSED_BLOCK_WORDS) over.push(`${slug} ${l} ${f.q} (${words(f.a)})`);
        const lead = words(guide.lead.join(" "));
        if (lead > CLOSED_BLOCK_WORDS) over.push(`${slug} ${l} lead (${lead})`);
        // A closed row's summary is a line, not a paragraph.
        for (const row of [...guide.sections.map((s) => s.heading), ...guide.faq.map((f) => f.q)]) if (words(row) > SECTION_LINE_WORDS) over.push(`${slug} ${l} row (${words(row)}): ${row}`);
      }
    expect(over).toEqual([]);
  });

  it("a section's left column has one line of at most fourteen words", () => {
    const over: string[] = [];
    for (const [l, messages] of [["en", en], ["es", es]] as const) {
      for (const key of ["ideasLine", "faqLine", "inPhone"] as const) if (words(messages.recipients[key]) > SECTION_LINE_WORDS) over.push(`${l} recipients.${key}`);
      for (const key of ["ideasLine", "guideLine"] as const) if (words(messages.occasions[key]) > SECTION_LINE_WORDS) over.push(`${l} occasions.${key}`);
    }
    expect(over).toEqual([]);
  });
});

describe("the text budget of an occasion's idea list", () => {
  const listed = OCCASIONS.filter((occasion) => OCCASION_GUIDES[occasion].en.ideas);

  it("an idea is a card: a title of at most nine words and one line", () => {
    const over: string[] = [];
    for (const occasion of listed)
      for (const l of LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) {
          const at = `${occasion} ${l} ${idea.template}`;
          const manifest = getManifest(idea.template)!;
          if (words(idea.heading) > CARD_TITLE_WORDS) over.push(`${at} heading (${words(idea.heading)}): ${idea.heading}`);
          const line = occasionCardLine(idea, manifest, l);
          if (!line) over.push(`${at}: no line for its card`);
          else if (words(line) > CARD_LINE_WORDS) over.push(`${at} line (${words(line)}): ${line}`);
          else if (!ends(line)) over.push(`${at}: its card's line is not a whole sentence: ${line}`);
        }
    expect(over).toEqual([]);
  });

  it("a card's line is the idea's own opening, or the gift's own tagline", () => {
    for (const occasion of listed)
      for (const l of LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) {
          const manifest = getManifest(idea.template)!;
          const line = occasionCardLine(idea, manifest, l);
          const own = idea.body.startsWith(line.replace(/\.$/, ""));
          expect(own || line === taglineLine(manifest, l), `${occasion} ${l} ${idea.template}: ${line}`).toBe(true);
        }
  });

  it("every gift's tagline opens on a sentence short enough to be a card's line", () => {
    const over: string[] = [];
    for (const manifest of listManifests()) for (const l of LOCALES) if (words(taglineLine(manifest, l)) > CARD_LINE_WORDS || !taglineLine(manifest, l)) over.push(`${manifest.slug} ${l} (${words(taglineLine(manifest, l))}): ${taglineLine(manifest, l)}`);
    expect(over).toEqual([]);
  });

  it("the handwriting on a card is a sample the list records a field for, and fits that field", async () => {
    const over: string[] = [];
    let shown = 0;
    for (const occasion of listed)
      for (const l of LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) {
          const sample = occasionSample(occasion, idea);
          const at = `${occasion} ${l} ${idea.template}`;
          // Only the lists that record their samples' fields show one; the four older lists show none.
          if (!Object.hasOwn(SAMPLE_FIELDS, occasion)) {
            expect(sample, at).toBeNull();
            continue;
          }
          if (!sample) continue;
          shown += 1;
          const fields = SAMPLE_FIELDS[occasion as ListedOccasion][idea.template];
          expect(sample.field, at).toBe(fields.find((field) => field !== "-"));
          expect(sampleLines(idea.body), at).toContain(sample.text);
          const limit = await fieldLimit(idea.template, sample.field);
          expect(limit, `${at}: ${sample.field} is not a text field`).not.toBeNull();
          const hand = handLine(sample.text);
          expect(hand.length, at).toBeLessThanOrEqual(limit!);
          if (words(hand) > HAND_LINE_WORDS) over.push(`${at} handwriting (${words(hand)}): ${hand}`);
        }
    expect(over).toEqual([]);
    // Most cards of the eight lists have one: the check has something to check.
    expect(shown).toBeGreaterThan(100);
  });

  it("the guide's rows are closed blocks of at most 180 words", () => {
    const over: string[] = [];
    for (const occasion of OCCASIONS)
      for (const l of LOCALES) {
        const guide = OCCASION_GUIDES[occasion][l];
        for (const section of guide.sections) if (words(section.body) > CLOSED_BLOCK_WORDS) over.push(`${occasion} ${l} ${section.heading}`);
        for (const f of guide.faq) if (words(f.a) > CLOSED_BLOCK_WORDS) over.push(`${occasion} ${l} ${f.q}`);
        if (words(guide.lead) > CLOSED_BLOCK_WORDS) over.push(`${occasion} ${l} lead`);
        if (words(guide.title) > 13) over.push(`${occasion} ${l} title (${words(guide.title)})`);
      }
    expect(over).toEqual([]);
  });
});

describe("the text budget of /digital-cards", () => {
  const facts: DigitalCardsFacts = { single: "€9.99", pick3: "€14.99", everything: "€24.99", extras: "€7.49", count: listManifests().length, ideas: 30, finder: true };

  it("keeps the hero, the cards, the band and the prices to a line each", () => {
    const over: string[] = [];
    for (const l of LOCALES) {
      const copy = digitalCardsCopy(l, facts);
      if (words(copy.hero.line) > HERO_LINE_WORDS) over.push(`${l} hero.line`);
      if (words(copy.hero.sentence) > HERO_SENTENCE_WORDS) over.push(`${l} hero.sentence`);
      for (const kind of copy.kinds.items) {
        if (words(kind.title) > CARD_TITLE_WORDS) over.push(`${l} ${kind.template} title`);
        if (words(kind.brief) > CARD_LINE_WORDS || !ends(kind.brief)) over.push(`${l} ${kind.template} brief (${words(kind.brief)})`);
        // The card's line is cut from the kind in full: no figure of its own, and the same card named.
        for (const figure of figures(kind.brief)) expect(kind.body, `${l} ${kind.template}: “${figure}”`).toContain(figure);
      }
      if (words(copy.band.line) > SECTION_LINE_WORDS) over.push(`${l} band.line (${words(copy.band.line)})`);
      for (const check of copy.band.checks) if (words(check) > 12) over.push(`${l} band check (${words(check)}): ${check}`);
      if (words(copy.cost.line) > SECTION_LINE_WORDS) over.push(`${l} cost.line`);
      // Three prices as cards, each a row of the full list, none of them the free one's.
      expect(copy.cost.shown.map((row) => copy.cost.rows[row].price), l).toEqual([facts.single, facts.pick3, facts.everything]);
      for (const row of copy.cost.shown) if (words(copy.cost.rows[row].label) > 4) over.push(`${l} price card: ${copy.cost.rows[row].label}`);
    }
    expect(over).toEqual([]);
  });

  it("names the e-card in one heading, as people search for it", () => {
    // docs/marketing/growth-build/SEO-PICTURE.md: "ecards" is what most people type.
    expect(digitalCardsCopy("en", facts).band.heading.toLowerCase()).toContain("ecard");
    expect(digitalCardsCopy("en", facts).description.toLowerCase()).toContain("ecards");
    expect(digitalCardsCopy("es", facts).band.heading.toLowerCase()).toContain("e-card");
  });

  it("what it keeps closed is at most 180 words a block", () => {
    for (const l of LOCALES) {
      const copy = digitalCardsCopy(l, facts);
      const steps = words(copy.steps.items.map((step) => `${step.title}. ${step.body}`).join(" "));
      expect(steps, `${l}: the four steps`).toBeLessThanOrEqual(CLOSED_BLOCK_WORDS);
      const prices = words([copy.cost.lead, ...copy.cost.rows.map((row) => `${row.label}, ${row.price}. ${row.note}`)].join(" "));
      expect(prices, `${l}: what each price includes`).toBeLessThanOrEqual(CLOSED_BLOCK_WORDS);
      const about = words([copy.definition, copy.kinds.lead, copy.compare.heading, ...copy.compare.rows.map((row) => `${row.term}. ${row.is}`)].join(" "));
      expect(about, `${l}: more about digital cards`).toBeLessThanOrEqual(CLOSED_BLOCK_WORDS);
      for (const f of copy.faq.items) expect(words(f.a), f.q).toBeLessThanOrEqual(CLOSED_BLOCK_WORDS);
    }
  });
});

describe("how a card's line is drawn from an idea", () => {
  it("takes the opening sentence where it is one line", () => {
    expect(openingLine("A jar of folded notes she shakes out one at a time. Write one for each year.")).toBe("A jar of folded notes she shakes out one at a time.");
  });

  it("stops a long opening at its colon, where the statement ends and the examples begin", () => {
    const body = "Choose every stem yourself, up to 24: tulips, peonies, ranunculus, lilies, in the colours of the ones she grows or the ones she buys for herself. The card holds 30 characters.";
    expect(openingLine(body)).toBe("Choose every stem yourself, up to 24.");
  });

  it("never cuts inside a quoted sample, and gives nothing where no whole statement is short enough", () => {
    expect(openingLine("Red curtains part on a marquee with their name, or your own words: “SAM TURNS 30. ONE NIGHT ONLY.” Then a cake.")).toBe("Red curtains part on a marquee with their name, or your own words.");
    expect(openingLine("Write the chat the way you two actually text, typos and in-jokes included, and it arrives bubble by bubble with the typing dots, one after another, until the last.")).toBeNull();
    expect(openingLine("“Sorry” is where it starts. The rest is yours.")).toBe("“Sorry” is where it starts.");
  });

  it("shows a long line to borrow by its opening sentences, within sixteen words", () => {
    const note = "My plan for today fell apart, so here is the part that mattered. You make ordinary days better than I make plans. Dinner is on me.";
    expect(handLine(note)).toBe("My plan for today fell apart, so here is the part that mattered.");
    expect(handLine("Late, but I picked every one.")).toBe("Late, but I picked every one.");
    expect(handLine("It's officially your day. I got here first.")).toBe("It's officially your day. I got here first.");
  });
});

describe("the loose art of these pages", () => {
  it("is placed by the art's own rules: never mirrored, never turned past 25 degrees, no picture strewn about", () => {
    for (const piece of SPREAD_PLACEMENTS) {
      expect(ART_IDS, piece.art).toContain(piece.art);
      expect(Math.abs(piece.rot), `${piece.art} is turned ${piece.rot} degrees`).toBeLessThanOrEqual(25);
      expect(piece.size, piece.art).toBeGreaterThan(0);
      expect(["lily-footer", "hero-flatlay", "experience-flatlay", "step-photo", "step-note", "step-send", "step-phone"]).not.toContain(piece.art);
      // A placement has no way to flip a piece.
      expect(Object.keys(piece).filter((k) => !["art", "x", "y", "size", "rot", "blur", "opacity", "phone", "eager", "from", "until", "top"].includes(k))).toEqual([]);
    }
    // A few pieces, composed: one stem (drawn at two sizes), the gift page's lily by the questions (and its phone's), and petals and a leaf in the gaps.
    expect(SPREAD_PLACEMENTS.filter((p) => p.art.startsWith("lily-") && p.until === undefined && p.phone !== "only").length).toBeLessThanOrEqual(2);
    expect(SPREAD_PLACEMENTS.length).toBeLessThanOrEqual(12);
  });
});
