import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { stepQuote, type QuoteSource } from "@/components/templates/page/quote";
import { includedRows } from "@/components/templates/page/included";
import { choiceCheck, experienceChecks, giftChoice, moreGifts, moreLikeThis, noteLine, type ExperienceKey } from "@/components/templates/page/sections";
import { giftDataBaseSchema } from "@/lib/gift/schema";
import { premiumExtras } from "@/lib/gift/publish";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS } from "@/content/template-steps";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { TEMPLATE_MANIFESTS, getManifest, listManifests } from "@/templates/manifests";

/**
 * What a gift's page reads off the gift below its hero (components/templates/page/sections.tsx):
 * the line on each note card of "How to send", the three checks of "The experience", and the four
 * gifts of "More like this". Each was the same on every page, or unrelated to its step, before the
 * second review of 21 Nov 2026.
 */
const LOCALES = ["en", "es"] as const;

/** What the editor calls a gift's settings and their choices, in one language. */
async function metaOf(slug: string, l: (typeof LOCALES)[number]): Promise<Record<string, { label: string; options?: Record<string, string> }>> {
  return ((await import(`../../src/templates/${slug}/field-meta.ts`).catch(() => ({ fieldMeta: { en: {}, es: {} } }))) as { fieldMeta: Record<string, Record<string, { label: string; options?: Record<string, string> }>> }).fieldMeta[l];
}

/** A gift's demo, lines and choices, as the page gathers them (templateSamples). */
async function sourceOf(slug: string, l: (typeof LOCALES)[number]): Promise<QuoteSource> {
  const demo = ((await import(`../../src/templates/${slug}/demo-data.ts`)) as { demoData: Record<string, Record<string, unknown>> }).demoData[l];
  const meta = ((await import(`../../src/templates/${slug}/field-meta.ts`).catch(() => ({ fieldMeta: { en: {}, es: {} } }))) as { fieldMeta: Record<string, Record<string, { options?: Record<string, string> }>> }).fieldMeta[l];
  return {
    lent: TEMPLATE_GUIDES[slug][l].ideas.items.map((idea) => ({ field: idea.borrow.field, line: idea.borrow.line })),
    demo,
    options: Object.fromEntries(Object.entries(meta).flatMap(([key, m]) => (m.options ? [[key, m.options]] : []))),
  };
}

describe("the line on a note card of “How to send”", () => {
  it("is a value of the field its step is about", async () => {
    // Passport's "Set both cities" showed "Citizen of wherever you are", a nationality line.
    const passport = await sourceOf("passport", "en");
    expect(stepQuote("fields.fromCity+fields.toCity", passport)).toBe(`${(passport.demo!.fields as { fromCity: string }).fromCity} → ${(passport.demo!.fields as { toCity: string }).toCity}`);
    // A name: the demo's.
    const bats = await sourceOf("bat-swarm", "en");
    expect(stepQuote("recipientName", bats)).toBe(bats.demo!.recipientName);
    // A line the gift's own cards lend for that field comes before the demo's.
    expect(stepQuote("fields.line", bats)).toBe(TEMPLATE_GUIDES["bat-swarm"].en.ideas.items.find((i) => i.borrow.field === "fields.line")!.borrow.line);
    // A choice is shown by the name the editor gives it, in the page's language.
    expect(stepQuote("fields.flower", await sourceOf("bloom", "en"))).toMatch(/^(Peony|Tulip|Daisy)$/);
    expect(stepQuote("fields.flower", await sourceOf("bloom", "es"))).toMatch(/^(Peonía|Tulipán|Margarita)$/);
    // A place is shown by its name.
    const halfway = await sourceOf("halfway", "es");
    expect(stepQuote("fields.from+fields.to", halfway)).toBe(`${(halfway.demo!.fields as { from: { name: string } }).from.name} → ${(halfway.demo!.fields as { to: { name: string } }).to.name}`);
  });

  it("is never longer than the card can show, and gives way when nothing short enough is there", () => {
    const source: QuoteSource = { lent: [{ field: "fields.note", line: "x".repeat(31) }], demo: { fields: { note: "y".repeat(40), label: "short one" } }, options: {} };
    expect(stepQuote("fields.note", source)).toBeNull();
    expect(stepQuote(["fields.note", "fields.label"], source)).toBe("short one");
    expect(stepQuote("fields.missing", source)).toBeNull();
    expect(stepQuote("fields.note+fields.label", source)).toBeNull();
  });

  it("is the step's own on every note card of every gift, in both languages: its field's value or a line written for it, never another field's", async () => {
    // The deep test of 21 Nov 2026: where a step's field had nothing of thirty characters or fewer, its
    // card took a spare line of the gift. "Write the fortunes" showed the lucky numbers "14 · 06 · 21",
    // the Spanish "List the good deeds" a caption about a crime, "Escribe la carta" the pennants.
    const spain = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma|vigo)\b/i;
    const off: string[] = [];
    let steps = 0;
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS))
      for (const l of LOCALES) {
        const source = await sourceOf(slug, l);
        // Every line of the gift that belongs to some other card: none may stand in for this step's.
        for (const step of row.steps) {
          if (step.picture !== "note") continue;
          // Every note step names its field (tests/unit/template-steps.test.ts), so none falls back to "any line of the gift".
          expect(step.quote, `${slug}: ${step.en}`).toBeDefined();
          steps += 1;
          const quote = stepQuote(step.quote!, source);
          const sample = step.sample?.[l];
          const line = noteLine({ quote: step.quote, sample }, ["a spare line of the gift"], source);
          if (quote === null && !sample) off.push(`${slug} ${l}: “${step[l]}” has nothing short in its field and no sample`);
          if (quote !== null && sample) off.push(`${slug} ${l}: “${step[l]}” has a sample its field no longer needs`);
          if (line !== (quote ?? sample)) off.push(`${slug} ${l}: “${step[l]}” shows “${line}”`);
          if (line.length < 2 || line.length > 30) off.push(`${slug} ${l}: “${line}” is ${line.length} characters`);
          if (/[!¡]|—| – /.test(line)) off.push(`${slug} ${l}: “${line}” shouts or has a dash aside`);
          expect(line, `${slug} ${l}`).not.toMatch(spain);
        }
      }
    expect(steps).toBeGreaterThan(130);
    expect(off).toEqual([]);
    // The cards the test named, by what they show now.
    const shown = async (slug: string, l: (typeof LOCALES)[number], en: string) => {
      const step = TEMPLATE_STEPS[slug].steps.find((s) => s.en === en)!;
      return noteLine({ quote: step.quote, sample: step.sample?.[l] }, [], await sourceOf(slug, l));
    };
    expect(await shown("fortune-cookie", "en", "Write the fortunes")).toBe("You know more than you think.");
    expect(await shown("nice-list", "es", "List the good deeds")).toBe("compartió la última galleta");
    expect(await shown("the-council", "en", "List the findings")).toBe("a hall sock, since March");
    // Cap Toss in Spanish said only "2027": the year is not what a diploma is written with.
    expect(await shown("cap-toss", "es", "Write the diploma")).toBe("Biología Marina · 2027");
    // Front Page's card carried its demo's title, 35 and 40 characters in three rows of small handwriting.
    expect((await shown("front-page", "en", "Write the headline")).length).toBeLessThanOrEqual(30);
    expect((await shown("front-page", "es", "Write the headline")).length).toBeLessThanOrEqual(30);
  });

  it("a step that names no field shows the gift's first short line, and one that names a field never does", () => {
    const source: QuoteSource = { lent: [], demo: { fields: {} }, options: {} };
    expect(noteLine({}, ["first", "second"], source)).toBe("first");
    expect(noteLine({ quote: "fields.missing" }, ["first"], source)).toBe("");
    expect(noteLine({ quote: "fields.missing", sample: "its own" }, ["first"], source)).toBe("its own");
  });
});

describe("the three checks of “The experience”", () => {
  const t = (l: (typeof LOCALES)[number]) => (key: ExperienceKey, values?: Record<string, string | number>) => {
    let text: string = (l === "en" ? en : es).templates.guide[key];
    for (const [name, value] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(value));
    return text;
  };

  /** The three checks as the page builds them: the gift's own choice read from its editor's names. */
  const checksOf = async (slug: string, l: (typeof LOCALES)[number], note = false) => {
    const choice = giftChoice(await metaOf(slug, "en"), await metaOf(slug, l));
    return experienceChecks(getManifest(slug)!, TEMPLATE_STEPS[slug].line[l], note, t(l), choice ? choiceCheck(choice, l, t(l)) : null);
  };

  it("are the gift's own: what they do, how many photos it is made of, and something the first has not said", async () => {
    const of = (slug: string, note = false) => experienceChecks(getManifest(slug)!, TEMPLATE_STEPS[slug].line.en, note, t("en"));
    // The gift's own line, without the full stop it has where it is written: a check has none.
    expect(TEMPLATE_STEPS.arcade.line.en).toMatch(/\.$/);
    expect(`${of("arcade")[0]}.`).toBe(TEMPLATE_STEPS.arcade.line.en);
    // Only a full stop is taken off: a line that ends on a word keeps its last letter.
    expect(experienceChecks(getManifest("arcade")!, "They play", false, t("en"))[0]).toBe("They play");
    // Photos: none needed, one is enough, or a number to start from.
    expect(of("bloom")[1]).toBe("Works without photos, or with up to 8");
    expect(of("passport")[1]).toBe("One photo is enough; it holds 10");
    expect(of("constellations")[1]).toBe("Made from 3 to 12 of your photos");
    // A gift that listens or feels a shake says that a finger does it too, and does not name the action
    // again: Cap Toss said "cheer" in its first check and "blow" in its third, and the Jar of Reasons "shake" twice.
    expect(of("halfway")[2]).toBe("A finger does it too, where the microphone is off");
    expect(of("cap-toss")[2]).not.toMatch(/blow/);
    expect(of("jar-of-reasons")[2]).toBe("A tap does it too, where the phone can’t feel a shake");
    for (const slug of ["cap-toss", "halfway", "jar-of-reasons", "snow-globe", "birthday-cinema"]) {
      const [first, , third] = await checksOf(slug, "en");
      for (const verb of ["blow", "cheer", "tilt"]) expect(first.includes(verb) && third.includes(verb), `${slug} says “${verb}” twice`).toBe(false);
    }
    // Every other gift names something of its own to choose, by the editor's names. It was the song on 50 of 61 pages.
    expect((await checksOf("the-letter", "en"))[2]).toBe("Paper: Cream, White or Kraft");
    expect((await checksOf("the-letter", "es"))[2]).toBe("Papel: Crema, Blanco o Kraft");
    expect((await checksOf("frosted-window", "en"))[2]).toBe("The room: Cream cottage, Log cabin or Midnight blue");
    // The first setting with three or more choices: the Music Box's two figurines are passed over for its tune.
    expect((await checksOf("music-box", "en"))[2]).toBe("The tune: Swan Lake, Brahms’ Lullaby or Für Elise");
    // Spanish says "u" before "Oliva".
    expect((await checksOf("autumn-reel", "es"))[2]).toBe("El estilo: Óxido, Espresso u Oliva");
    // Ten looks are not listed: three and how many more, none of the three with an "and" of its own.
    expect((await checksOf("xoxo", "en"))[2]).toBe("The page: Blush, Lilac, Baby blue and 7 more");
    expect((await checksOf("xoxo", "es"))[2]).toBe("La página: Rosa, Lila, Azul bebé y 7 más");
    // A choice with a comma of its own is passed over for the next setting (The Garden's "Blush, at midday").
    expect((await checksOf("garden", "en"))[2]).toBe("What’s growing: Wildflowers, Roses, Peonies or Sunflowers");
    // Arcade has no music, and still has something to choose.
    expect((await checksOf("arcade", "en"))[2]).toBe("What falls: Hearts, Stars or Cake slices");
    // Without a choice a gift falls back on its song, or on a finger where it has none.
    expect(of("the-letter")[2]).toMatch(/song/);
    expect(of("arcade")[2]).toMatch(/finger/);
    expect(giftChoice({ a: { label: "Two", options: { x: "One", y: "Other" } }, b: { label: "No list" } })).toBeNull();
    // The free note has no photos: its page gives the note's length and promises none.
    expect(of("the-letter", true)[1]).toBe(`The free note holds ${FREE_NOTE_MAX_CHARS} characters`);
    expect(of("the-letter", true).join(" ")).not.toMatch(/photo/);
  });

  it("differ from gift to gift, and leave no placeholder unfilled in either language", async () => {
    for (const l of LOCALES) {
      const seen = new Set<string>();
      const thirds = new Map<string, number>();
      for (const m of TEMPLATE_MANIFESTS) {
        const checks = await checksOf(m.slug, l);
        expect(checks).toHaveLength(3);
        for (const check of checks) expect(check, `${m.slug} ${l}`).not.toMatch(/[{}]|undefined/);
        // A check is a line: a dozen words, fifteen where Spanish needs its articles (the Music Box and its three tunes).
        expect(checks[2].trim().split(/\s+/).length, `${m.slug} ${l}: ${checks[2]}`).toBeLessThanOrEqual(l === "en" ? 12 : 15);
        seen.add(checks.join(" | "));
        thirds.set(checks[2], (thirds.get(checks[2]) ?? 0) + 1);
      }
      expect(seen.size).toBe(TEMPLATE_MANIFESTS.length);
      // No third check is on more pages than the gifts that listen (six) or feel a shake: "Carries the song you choose" was on 50.
      expect(Math.max(...thirds.values()), [...thirds].filter(([, n]) => n > 6).map(([line, n]) => `${n}× ${line}`).join("; ")).toBeLessThanOrEqual(6);
    }
  });

  it("say “or tap” only of a gift whose template really takes a tap in place of the microphone or a shake", async () => {
    // Read from each template's own words: a gift that asks for the microphone or for motion offers a tap, a swipe or a button too.
    const { readFileSync } = await import("node:fs");
    for (const m of TEMPLATE_MANIFESTS) {
      const needs = m.features.needs ?? [];
      if (!needs.includes("microphone") && !needs.includes("deviceMotion")) continue;
      const code = readFileSync(`src/templates/${m.slug}/Template.tsx`, "utf8");
      expect(/or tap|tap instead|tap to|tap the|swipe|the button does it/i.test(code), `${m.slug} offers no touch in place of its sensor`).toBe(true);
    }
  });
});

describe("the checklist under the hero", () => {
  const letter = getManifest("the-letter")!;

  it("lists what the template has, under “What's included”", () => {
    expect(includedRows(letter, false).map((r) => r.key)).toEqual(["featurePhotos", "featureMusic", "featureCaptions", "featureCountdown", "featureSurprise", "featureVideo"]);
    expect(includedRows(letter, false)[0].values).toEqual({ max: letter.features.photos.max });
    // Only what a gift has: Arcade has no music and takes no video.
    expect(includedRows(getManifest("arcade")!, false).map((r) => r.key)).toEqual(["featurePhotos", "featureCaptions", "featureCountdown", "featureSurprise"]);
  });

  it("under “With Make it special” lists only what the unlock adds to the free note", () => {
    // The test of 21 Nov 2026: music, a countdown and the hidden surprise stood under that heading,
    // and the free note has all three. A visitor read them as costing the unlock's price.
    const keys = includedRows(letter, true).map((r) => r.key);
    expect(keys).toEqual(["featurePhotos", "featureCaptions", "featureFullLetter", "featureVideo", "featureVoice"]);
    for (const free of ["featureMusic", "featureCountdown", "featureSurprise"]) expect(keys).not.toContain(free);
    // Each row is something the publish rules ask an unlock for on a note, and what they let through free is not listed.
    const base = { music: undefined, video: undefined, voiceNote: undefined, photos: [], unwrap: undefined, message: "" };
    const note = { note: true };
    expect(premiumExtras({ ...base, photos: [{ url: "a.jpg" }] } as never, note)).toEqual(["photos"]);
    expect(premiumExtras({ ...base, video: { url: "a.mp4" } } as never, note)).toEqual(["video"]);
    expect(premiumExtras({ ...base, voiceNote: { url: "a.webm" } } as never, note)).toEqual(["voiceNote"]);
    expect(premiumExtras({ ...base, message: "x".repeat(FREE_NOTE_MAX_CHARS + 1) }, note)).toEqual(["longLetter"]);
    expect(premiumExtras({ ...base, music: { source: "library", url: "/audio/library/a.mp3" }, message: "x".repeat(FREE_NOTE_MAX_CHARS) } as never, note)).toEqual([]);
  });

  it("gives the full letter's length as the schema has it, in both languages", () => {
    const max = (giftDataBaseSchema.shape.message.unwrap() as { maxLength: number | null }).maxLength;
    expect(max).toBe(4000);
    expect(en.templates.featureFullLetter).toContain("4,000");
    expect(es.templates.featureFullLetter).toContain("4.000");
    // One kind of quotation mark for the heading in each language.
    expect(en.templates.includedSpecial).toMatch(/“.+”/);
    expect(es.templates.includedSpecial).toMatch(/«.+»/);
    expect(es.templates.pagePriceNote).toMatch(/«Hazlo especial»/);
    expect(JSON.stringify(es.templates)).not.toMatch(/[“”]/);
  });
});

describe("the four gifts of “More like this”", () => {
  it("are four on every gift's page: a day with few gifts is topped up from the gift's other days, then from all of them", () => {
    // The test of 21 Nov 2026: one card in a row of four on the two Thanksgiving gifts, three on Cap Toss.
    for (const m of TEMPLATE_MANIFESTS) {
      const { gifts, full } = moreGifts(m);
      expect(gifts.map((x) => x.slug), m.slug).toHaveLength(4);
      expect(new Set(gifts.map((x) => x.slug)).size, m.slug).toBe(4);
      expect(gifts.map((x) => x.slug), m.slug).not.toContain(m.slug);
      // The row is headed by the gift's first day only when that day fills it.
      const sameDay = listManifests({ occasion: m.occasions[0] }).filter((x) => x.slug !== m.slug).length;
      expect(full, m.slug).toBe(sameDay >= 4);
      // The gifts of its own day come first, however few.
      for (const g of gifts.slice(0, Math.min(4, sameDay))) expect(g.occasions, `${m.slug} → ${g.slug}`).toContain(m.occasions[0]);
    }
    const candles = moreGifts(getManifest("light-the-candles")!);
    expect(candles.gifts[0].slug).toBe("wishbone");
    expect(candles.full).toBe(false);
    expect(moreGifts(getManifest("the-letter")!).full).toBe(true);
  });

  it("are the next four made for the same day, counted on from the gift itself", () => {
    const list = listManifests({ occasion: "anniversary" }).map((m) => m.slug);
    const letter = getManifest("the-letter")!;
    expect(letter.occasions[0]).toBe("anniversary");
    const at = list.indexOf("the-letter");
    expect(moreLikeThis(letter).map((m) => m.slug)).toEqual([1, 2, 3, 4].map((step) => list[(at + step) % list.length]));
  });

  it("never include the gift itself or one gift twice, and wrap round the end of the list", () => {
    for (const m of TEMPLATE_MANIFESTS) {
      const more = moreLikeThis(m).map((x) => x.slug);
      expect(more, m.slug).not.toContain(m.slug);
      expect(new Set(more).size, m.slug).toBe(more.length);
      expect(more.length, m.slug).toBeGreaterThan(0);
    }
    const list = listManifests({ occasion: "anniversary" });
    const last = list[list.length - 1];
    if (last.occasions[0] === "anniversary") expect(moreLikeThis(last)[0].slug).toBe(list[0].slug);
  });

  it("differ between two gifts of one day: The Letter and Constellations no longer link to the same four", () => {
    const a = moreLikeThis(getManifest("the-letter")!).map((m) => m.slug);
    const b = moreLikeThis(getManifest("constellations")!).map((m) => m.slug);
    expect(a).not.toEqual(b);
    // Before, an occasion page set linked to its first four gifts only; now most of a list is reached from some gift.
    const linked = new Set(TEMPLATE_MANIFESTS.flatMap((m) => moreLikeThis(m).map((x) => x.slug)));
    expect(linked.size).toBeGreaterThan(40);
  });
});
