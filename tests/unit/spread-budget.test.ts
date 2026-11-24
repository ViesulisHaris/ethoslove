import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OCCASIONS } from "@/config/occasions";
import { SPREAD_PLACEMENTS } from "@/components/marketing/spread/placements";
import { CLOSED_BLOCK_WORDS } from "@/components/templates/page/lead";
import { DIGITAL_CARDS_BAND_PHOTO, DIGITAL_CARDS_LEAD, digitalCardsCopy, type DigitalCardsFacts } from "@/content/digital-cards";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, GUIDE_BAND_PHOTOS, guideBandPhoto } from "@/content/gift-guides";
import { CARD_LINE_MIN_WORDS, CARD_LINE_WORDS, CARD_TITLE_WORDS, HAND_LINE_WORDS, handLine, kindCardLine, kindIdeaIsFree, occasionCardLine, occasionSample, openingLine, sampleHand, sampleLines } from "@/content/idea-cards";
import { sampleFieldsOf } from "@/content/occasion-ideas";
import { OCCASION_GUIDES } from "@/content/occasions";
import { ART_IDS } from "@/content/page-art";
import { fieldLimit } from "@/lib/gift/field-limit";
import { sendsFree } from "@/lib/gift/free-tier";
import { PRODUCTS } from "@/lib/pricing/products";
import { templateOfferAmount } from "@/lib/seo";
import { DEMO_PHOTOS } from "@/templates/_shared/demo-photos";
import { getManifest, listManifests } from "@/templates/manifests";
import { fieldMeta as councilFields } from "@/templates/the-council/field-meta";
import { fieldMeta as countdownFields } from "@/templates/midnight-countdown/field-meta";

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
/** Every figure a text states: "500", "00:00", "4,000", without the comma or full stop that follows it. */
const figures = (s: string) => (s.match(/\d[\d.,:]*/g) ?? []).map((figure) => figure.replace(/[.,:]+$/, ""));
/** Every gift's slogan, in both languages: what a card's line must never be (it says the same on every page the gift is on). */
const TAGLINES = new Set(listManifests().flatMap((m) => LOCALES.flatMap((l) => [m.tagline[l], ...m.tagline[l].split(/(?<=[.!?])\s+/)])).map((s) => s.trim()));

/** What a Text Thread's card shows by hand is more than its first bubble: under this it is a fragment. */
const THREAD_HAND_MIN_WORDS = 6;
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
    // No two pages open on the same gift's film: the six by kind, and /digital-cards, whose first screen is the same hero.
    const leads = [DIGITAL_CARDS_LEAD, ...GIFT_GUIDE_SLUGS.map((slug) => GIFT_GUIDES[slug].en.film ?? GIFT_GUIDES[slug].en.ideas[0].template)];
    expect(new Set(leads).size, leads.join(", ")).toBe(leads.length);
  });

  it("each page has a photo of its own in the polaroid of its band", () => {
    // Seven pages had two photos between them: the lead gift's first sample, the same hands and coffee on four pages.
    const photos = [DIGITAL_CARDS_BAND_PHOTO.src, ...GIFT_GUIDE_SLUGS.map((slug) => guideBandPhoto(slug).src)];
    expect(new Set(photos).size, photos.join(", ")).toBe(photos.length);
    const samples = Object.values(DEMO_PHOTOS).map((photo) => photo.url as string);
    for (const photo of photos) expect(samples, photo).toContain(photo);
    for (const slug of GIFT_GUIDE_SLUGS) {
      const sample = DEMO_PHOTOS[GUIDE_BAND_PHOTOS[slug]];
      expect(guideBandPhoto(slug), slug).toEqual({ src: sample.url, width: sample.width, height: sample.height });
    }
    // The cake page shows the cake.
    expect(DEMO_PHOTOS[GUIDE_BAND_PHOTOS["virtual-birthday-cake"]].alt).toMatch(/cake/i);
  });

  it("the line under the hero's button says what the gift in the phone costs", () => {
    // A page by kind named no price: the button opens a paid gift's editor (the test of 23 Nov 2026).
    for (const messages of [en, es]) {
      expect(messages.recipients.inPhone).toContain("{name}");
      expect(messages.recipients.inPhone).toContain("{price}");
      expect(messages.recipients.inPhoneFree).toContain("{name}");
      // No amount is typed into the sentence: the page reads it from the catalogue.
      expect(messages.recipients.inPhone).not.toMatch(/\d/);
    }
    // Every page's lead gift is one whose own page gives a price: the amount the line shows is that one (lib/seo.ts).
    for (const slug of GIFT_GUIDE_SLUGS) {
      const lead = getManifest(GIFT_GUIDES[slug].en.film ?? GIFT_GUIDES[slug].en.ideas[0].template)!;
      for (const currency of ["usd", "eur", "gbp"] as const) expect(templateOfferAmount(lead, currency), `${slug} ${currency}`).toBe(sendsFree(lead) ? 0 : PRODUCTS[lead.tier === "free" ? "extras" : "single"].amounts[currency]);
    }
  });

  it("no card's handwriting ends on a comma, but a greeting's", () => {
    // "Now play the video. I practised," was a sign-off waiting for its name: alone on a card it read as cut off.
    const cut: string[] = [];
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES)
        for (const idea of GIFT_GUIDES[slug][l].ideas) {
          const hand = handLine(idea.line.text);
          if (/[,;]$/.test(hand) && idea.line.field !== "greeting") cut.push(`${slug} ${l} ${idea.template} (${idea.line.field}): ${hand}`);
        }
    expect(cut).toEqual([]);
  });

  it("a page whose title promises a kind of gift opens on that gift", () => {
    // "Video Birthday Cards and Video Gifts": the film in the phone and the first card are the birthday card that takes a video.
    for (const l of LOCALES) {
      expect(GIFT_GUIDES["video-message"][l].film).toBe("birthday-cinema");
      expect(GIFT_GUIDES["video-message"][l].ideas[0].template).toBe("birthday-cinema");
    }
    expect(getManifest("birthday-cinema")?.features.video).toBe(true);
  });

  it("the band over the three how-tos has a heading of the page's own", () => {
    // "How to make it land" stood over all six, a display heading that said the same of six different sets of advice.
    for (const l of LOCALES) {
      const headings = GIFT_GUIDE_SLUGS.map((slug) => GIFT_GUIDES[slug][l].craft);
      expect(new Set(headings).size, headings.join(" | ")).toBe(headings.length);
      for (const slug of GIFT_GUIDE_SLUGS) {
        const guide = GIFT_GUIDES[slug][l];
        expect(words(guide.craft), `${slug} ${l}: ${guide.craft}`).toBeLessThanOrEqual(6);
        expect(words(guide.craft), `${slug} ${l}: ${guide.craft}`).toBeGreaterThanOrEqual(3);
        // It heads the three rows, so it is none of them.
        expect(guide.sections.map((s) => s.heading), `${slug} ${l}`).not.toContain(guide.craft);
      }
      expect(headings).not.toContain(l === "en" ? en.recipients.guideTitle : es.recipients.guideTitle);
    }
  });

  it("a card says Free only when the idea itself goes out free: its line to borrow is the free note", () => {
    // With the note for everyone (the live site), as lib/gift/free-tier.ts decides it.
    const tagged: string[] = [];
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES)
        for (const idea of GIFT_GUIDES[slug][l].ideas) {
          const manifest = getManifest(idea.template)!;
          const free = kindIdeaIsFree(idea, manifest);
          if (free) tagged.push(`${slug} ${l} ${idea.template}`);
          expect(free, `${slug} ${l} ${idea.template}`).toBe(idea.line.field === "freeNote" && manifest.slug === "the-letter");
          // An idea that puts a clip, a voice or a long letter in a gift is paid, whatever its template.
          if (free) expect(`${idea.heading} ${idea.brief ?? ""}`, `${slug} ${l}`).not.toMatch(/\b(clip|video|vídeo|voice|voz)\b/i);
        }
    // The video page's "A letter with you in it" needs "Make it special" for its clip: it was tagged free.
    for (const l of LOCALES) {
      const letter = GIFT_GUIDES["video-message"][l].ideas.find((i) => i.template === "the-letter")!;
      expect(kindIdeaIsFree(letter, getManifest("the-letter")!), `video-message ${l}`).toBe(false);
    }
    // The one free idea there is, in both languages: the five-minute note of the last-minute page.
    expect(tagged).toEqual(["last-minute en the-letter", "last-minute es the-letter"]);
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
          else if (words(line) < CARD_LINE_MIN_WORDS) over.push(`${at}: its card's line is a fragment (${words(line)} words: give it a brief): ${line}`);
          else if (!ends(line)) over.push(`${at}: its card's line is not a whole sentence: ${line}`);
          if (TAGLINES.has(line)) over.push(`${at}: its card's line is the gift's slogan: ${line}`);
          const hand = handLine(idea.line.text);
          if (words(hand) > HAND_LINE_WORDS) over.push(`${at} handwriting (${words(hand)}): ${hand}`);
          // What is shown of a line to borrow is its own opening, so it fits the field the whole line fits.
          if (!idea.line.text.startsWith(hand)) over.push(`${at}: the handwriting is not the opening of its line`);
          if (words(idea.line.where) > 9) over.push(`${at} where (${words(idea.line.where)}): ${idea.line.where}`);
        }
    expect(over).toEqual([]);
  });

  it("names a field as the editor names it, where an occasion's card names the same field", () => {
    // An occasion's card takes the field's name from the editor ("El cargo", "Titular sobre el reloj"); the pages by
    // kind typed theirs by hand, and the same field of the same gift had two names on two pages.
    const named = { "the-council": { field: "charge", meta: councilFields }, "midnight-countdown": { field: "headline", meta: countdownFields } } as const;
    let checked = 0;
    for (const slug of GIFT_GUIDE_SLUGS)
      for (const l of LOCALES)
        for (const idea of GIFT_GUIDES[slug][l].ideas) {
          const known = named[idea.template as keyof typeof named];
          if (!known || idea.line.field !== known.field) continue;
          expect(idea.line.where, `${slug} ${l} ${idea.template}`).toBe(known.meta[l][known.field].label);
          checked += 1;
        }
    expect(checked).toBeGreaterThanOrEqual(6);
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
          if (words(idea.heading) > CARD_TITLE_WORDS) over.push(`${at} heading (${words(idea.heading)}): ${idea.heading}`);
          const line = occasionCardLine(idea);
          if (!line) over.push(`${at}: no line for its card (its opening is not one line: give it a brief)`);
          else if (words(line) > CARD_LINE_WORDS) over.push(`${at} line (${words(line)}): ${line}`);
          else if (words(line) < CARD_LINE_MIN_WORDS) over.push(`${at}: its card's line is a fragment (${words(line)} words: give it a brief): ${line}`);
          else if (!ends(line)) over.push(`${at}: its card's line is not a whole sentence: ${line}`);
        }
    expect(over).toEqual([]);
  });

  it("a card's line is the idea's own: its opening, or a brief that brings no figure the idea does not state", () => {
    for (const occasion of listed)
      for (const l of LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) {
          const at = `${occasion} ${l} ${idea.template}`;
          const line = occasionCardLine(idea);
          if (idea.brief) {
            expect(line, at).toBe(idea.brief);
            for (const figure of figures(idea.brief)) expect(idea.body, `${at}: “${figure}” is in the brief and not in the idea`).toContain(figure);
            expect(idea.brief, at).not.toMatch(/[—!]/);
          } else expect(idea.body.startsWith(line.replace(/\.$/, "")), `${at}: ${line}`).toBe(true);
        }
  });

  it("no card opens onto a gift's slogan, and no two cards of a page onto the same line", () => {
    // The first version fell back on the tagline: "You're invited." under a card about hamsters, and "A conversation that
    // arrives one bubble at a time." on three pages (the review of 22 Nov 2026).
    const bad: string[] = [];
    for (const occasion of listed)
      for (const l of LOCALES) {
        const lines = OCCASION_GUIDES[occasion][l].ideas!.items.map((idea) => occasionCardLine(idea));
        for (const [i, line] of lines.entries()) {
          if (TAGLINES.has(line)) bad.push(`${occasion} ${l}: a slogan: ${line}`);
          if (lines.indexOf(line) !== i) bad.push(`${occasion} ${l}: twice: ${line}`);
        }
      }
    expect(bad).toEqual([]);
  });

  // Every template's schema is loaded once here: slow on a busy machine, so it has more than the default five seconds.
  it("the handwriting on a card is a sample the list records a field for, and fits that field", { timeout: 60_000 }, async () => {
    const over: string[] = [];
    const shown: Record<string, number> = {};
    for (const occasion of listed)
      for (const l of LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) {
          const sample = occasionSample(occasion, idea, l);
          const at = `${occasion} ${l} ${idea.template}`;
          const fields = sampleFieldsOf(occasion, idea.template, l);
          expect(fields, `${at}: no row in SAMPLE_FIELDS`).toBeDefined();
          if (!sample) {
            // No handwriting only where the idea quotes nothing that goes in a field.
            expect(fields!.filter((field) => field !== "-"), at).toEqual([]);
            continue;
          }
          shown[`${occasion} ${l}`] = (shown[`${occasion} ${l}`] ?? 0) + 1;
          // The one the table marks with "+", or the first that is a line for a field.
          const marked = fields!.find((field) => field.startsWith("+"));
          expect(sample.field, at).toBe(marked ? marked.slice(1) : fields!.find((field) => field !== "-"));
          expect(sampleLines(idea.body), at).toContain(sample.text);
          const limit = await fieldLimit(idea.template, sample.field);
          expect(limit, `${at}: ${sample.field} is not a text field`).not.toBeNull();
          // What the card writes by hand: the one line, or a run of bubbles one to a row. Each row is a line of the field's own.
          const hand = sampleHand(sample);
          for (const row of hand.split("\n")) {
            expect(row.length, at).toBeLessThanOrEqual(limit!);
            expect(sampleLines(idea.body), at).toContain(sample.rows.length > 1 ? row : sample.text);
          }
          if (words(hand) > HAND_LINE_WORDS) over.push(`${at} handwriting (${words(hand)}): ${hand}`);
          // A conversation is not its first bubble: "Dad." and "You're asleep." stood alone on a card (the test of 23 Nov 2026).
          if (idea.template === "text-thread" && words(hand) < THREAD_HAND_MIN_WORDS) over.push(`${at}: a thread shown by ${words(hand)} words: ${hand}`);
        }
    expect(over).toEqual([]);
    // The cards that stood on a fragment now show two bubbles, in both languages.
    for (const [occasion, l, rows] of [["fathers-day", "en", ["Dad.", "I know you’d answer this with a thumbs up."]], ["long-distance", "es", ["Estás durmiendo.", "He pasado por el café malo y te he echado de menos igual."]], ["apology", "en", ["You said you were tired.", "I heard ‘I don’t care’. You meant ‘I’m tired’."]]] as const) {
      const idea = OCCASION_GUIDES[occasion][l].ideas!.items.find((item) => item.template === "text-thread")!;
      expect(occasionSample(occasion, idea, l)!.rows, `${occasion} ${l}`).toEqual(rows);
    }
    // Every list shows a line to borrow on most of its cards, the four older ones too (Christmas had none).
    for (const occasion of listed) for (const l of LOCALES) expect(shown[`${occasion} ${l}`] ?? 0, `${occasion} ${l}`).toBeGreaterThanOrEqual(Math.ceil(OCCASION_GUIDES[occasion][l].ideas!.items.length * 0.7));
  });

  it("the idea in full, kept closed inside its card, is at most 180 words", () => {
    const over: string[] = [];
    for (const occasion of listed) for (const l of LOCALES) for (const idea of OCCASION_GUIDES[occasion][l].ideas!.items) if (words(idea.body) > CLOSED_BLOCK_WORDS) over.push(`${occasion} ${l} ${idea.template} (${words(idea.body)})`);
    for (const slug of GIFT_GUIDE_SLUGS) for (const l of LOCALES) for (const idea of GIFT_GUIDES[slug][l].ideas) if (words(idea.body) > CLOSED_BLOCK_WORDS) over.push(`${slug} ${l} ${idea.template} (${words(idea.body)})`);
    expect(over).toEqual([]);
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
  const facts: DigitalCardsFacts = { single: "€9.99", pick3: "€14.99", everything: "€24.99", extras: "€7.49", photos: "€3.99", notePhotos: 5, count: listManifests().length, ideas: 30, finder: true };

  it("keeps the hero, the cards, the band and the prices to a line each", () => {
    const over: string[] = [];
    for (const l of LOCALES) {
      const copy = digitalCardsCopy(l, facts);
      if (words(copy.hero.line) > HERO_LINE_WORDS) over.push(`${l} hero.line`);
      if (words(copy.hero.sentence) > HERO_SENTENCE_WORDS) over.push(`${l} hero.sentence`);
      for (const kind of copy.kinds.items) {
        if (words(kind.title) > CARD_TITLE_WORDS) over.push(`${l} ${kind.template} title`);
        // A title stands alone, and is the kind's name in the page's structured data too: "With a game in them" named
        // nothing, and none of the five names in the ItemList was on the page (the deep test of 23 Nov 2026).
        if (/^(with|for|open|built|made|con|para|hechas|se) /i.test(kind.title)) over.push(`${l} ${kind.template}: its title does not stand alone: ${kind.title}`);
        if (words(kind.brief) > CARD_LINE_WORDS || words(kind.brief) < CARD_LINE_MIN_WORDS || !ends(kind.brief)) over.push(`${l} ${kind.template} brief (${words(kind.brief)})`);
        if (words(kind.body) > CLOSED_BLOCK_WORDS) over.push(`${l} ${kind.template} body (${words(kind.body)})`);
        // The card's line is cut from the kind in full: no figure of its own, and the same card named.
        for (const figure of figures(kind.brief)) expect(kind.body, `${l} ${kind.template}: “${figure}”`).toContain(figure);
      }
      if (words(copy.band.line) > SECTION_LINE_WORDS) over.push(`${l} band.line (${words(copy.band.line)})`);
      for (const check of copy.band.checks) if (words(check) > 12) over.push(`${l} band check (${words(check)}): ${check}`);
      if (words(copy.cost.line) > SECTION_LINE_WORDS) over.push(`${l} cost.line`);
      // Three prices as cards, each a row of the full list, none of them the free one's.
      expect(copy.cost.shown.map((row) => copy.cost.rows[row].price), l).toEqual([facts.single, facts.pick3, facts.everything]);
      // The full list has every way to pay for a card, from the least to the most: the free note, a note with photos
      // (PRODUCTS.photos), the full Letter, then the cards. It ran Free, 9.99, 14.99, 24.99, 3.99, 7.49 (the test of 23 Nov 2026).
      expect(copy.cost.rows.map((row) => row.price), l).toEqual([l === "en" ? "Free" : "Gratis", facts.photos, facts.extras, facts.single, facts.pick3, facts.everything]);
      expect(copy.cost.rows[1].note, l).toContain(String(facts.notePhotos));
      // And the answer about free cards prices photos at what photos cost, not at a whole card's price.
      const free = copy.faq.items.find((item) => /free|gratis/i.test(item.q))!.a;
      for (const price of [facts.photos, facts.extras, facts.single]) expect(free, l).toContain(price);
      expect(free.indexOf(facts.photos), l).toBeLessThan(free.indexOf(facts.single));
      // Midnight Countdown opens at the minute the sender sets, and an e-card is not only a picture.
      expect(copy.kinds.items[4].body, l).toMatch(l === "en" ? /until the minute you set, in their time zone/ : /hasta el minuto que elijas, en su zona horaria/);
      expect(copy.band.line, l).toMatch(l === "en" ? /a picture or a clip/ : /una imagen o un clip/);
      for (const row of copy.cost.shown) if (words(copy.cost.rows[row].label) > 4) over.push(`${l} price card: ${copy.cost.rows[row].label}`);
      // Five titles of one shape ("Cards that…", "Cards with…", "Cards for…" under "The five kinds of card") read as a
      // template (round 2, C13): no more than two begin with the same word.
      const firsts = copy.kinds.items.map((kind) => kind.title.split(" ")[0].toLowerCase());
      for (const first of new Set(firsts)) if (firsts.filter((f) => f === first).length > 2) over.push(`${l} kind titles: ${firsts.filter((f) => f === first).length} begin “${first}”`);
    }
    expect(over).toEqual([]);
  });

  it("lists its prices from the least to the most in every currency it is sold in", () => {
    // The rows' order is written once (content/digital-cards.ts); the amounts are the catalogue's, and differ by currency.
    const order = ["photos", "extras", "single", "pick3", "everything"] as const;
    for (const currency of ["usd", "eur", "gbp"] as const) {
      const amounts = order.map((id) => PRODUCTS[id].amounts[currency]);
      expect(amounts, currency).toEqual([...amounts].sort((a, b) => a - b));
      // And the copy's rows are those five, in that order, after the free one.
      const named = Object.fromEntries(order.map((id) => [id, `<${id}>`])) as Record<(typeof order)[number], string>;
      for (const l of LOCALES) expect(digitalCardsCopy(l, { ...facts, ...named }).cost.rows.slice(1).map((row) => row.price), `${currency} ${l}`).toEqual(order.map((id) => `<${id}>`));
    }
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

/**
 * One hand for the type (the test of 23 Nov 2026). English titles and samples had the typewriter's
 * apostrophe beside interface strings with the printer's; Spanish quoted with «…» on the pages by
 * kind and with “…” and ‘…’ on the occasion lists.
 */
describe("the type of these pages' words", () => {
  const facts: DigitalCardsFacts = { single: "€9.99", pick3: "€14.99", everything: "€24.99", extras: "€7.49", photos: "€3.99", notePhotos: 5, count: 61, ideas: 30, finder: true };
  const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
  const all = (l: (typeof LOCALES)[number]) => [...GIFT_GUIDE_SLUGS.flatMap((slug) => strings(GIFT_GUIDES[slug][l])), ...OCCASIONS.flatMap((occasion) => strings(OCCASION_GUIDES[occasion][l])), ...strings(digitalCardsCopy(l, facts))];

  it("English has the typographic apostrophe everywhere", () => {
    expect(all("en").filter((s) => s.includes("'")).map((s) => s.slice(0, 70))).toEqual([]);
  });

  it("Spanish quotes with «…», and with “…” only inside one", () => {
    const bad: string[] = [];
    for (const s of all("es")) {
      if (/['‘’]/.test(s)) bad.push(`a single mark: ${s.slice(0, 70)}`);
      if ((s.match(/«/g) ?? []).length !== (s.match(/»/g) ?? []).length) bad.push(`an open quotation: ${s.slice(0, 70)}`);
      if (/[“”]/.test(s.replace(/«[^»]*»/g, ""))) bad.push(`“…” outside «…»: ${s.slice(0, 70)}`);
    }
    expect(bad).toEqual([]);
  });

  it("the Spanish Christmas letter is not named by one country's word for a card", () => {
    expect(strings(OCCASION_GUIDES.christmas.es).filter((s) => /\bchristmas\b/.test(s))).toEqual([]);
  });
});
