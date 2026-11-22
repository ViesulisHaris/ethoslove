import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import { FINDER_COPY, FINDER_FITS, FINDER_SHORT, christmasPicks, finderGifts, finderPicks, shortLine, suitedRecipients } from "@/content/finder";
import { RECIPIENTS, RECIPIENT_GUIDES } from "@/content/recipients";
import { sendsFree } from "@/lib/gift/free-tier";
import {
  ANY,
  BEST_SELLERS,
  FINDER_FEELS,
  FINDER_PARTNERS,
  FINDER_RECIPIENTS,
  FINDER_STEPS,
  NO_ANSWERS,
  OCCASIONS_FOR,
  OCCASIONS_SHOWN,
  PICKS_PER_PAGE,
  REASON_WORDS,
  answerGifts,
  answersQuery,
  askedStep,
  chosenFeel,
  countWords,
  finderWaitScript,
  fits,
  occasionsFor,
  occasionsInSeason,
  openStep,
  parseAnswers,
  pickReason,
  rankGifts,
  reasonKey,
  score,
  shortReason,
  type FinderAnswers,
  type FinderFeel,
  type FinderGift,
  type FinderRecipient,
} from "@/lib/gift/finder";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { fillerIn } from "./filler";

const GIFTS = finderGifts();

/**
 * Every result there is: the two questions answered every way, "Not sure" included, and over each
 * no feeling's pill (null), one of the four, or the "any" an old three-question link carries: 9 × 14 × 6.
 */
const COMBINATIONS: FinderAnswers[] = [...FINDER_RECIPIENTS, ANY].flatMap((who) =>
  [...OCCASIONS, ANY].flatMap((occasion) => [null, ...FINDER_FEELS, ANY].map((feel) => ({ for: who, occasion, feel }) as FinderAnswers)),
);
const said = (a: FinderAnswers) => `${a.for} / ${a.occasion} / ${a.feel}`;

/** The templates that belong to one season, listed here by hand so the table can be checked against something. */
const SEASONAL: Record<string, { slugs: string[]; when: Occasion[] }> = {
  halloween: { slugs: ["trick-or-treat", "spooky-season", "be-my-boo", "seance", "bat-swarm", "cauldron", "jack-o-lantern", "haunted-house"], when: ["halloween"] },
  autumn: { slugs: ["fall-for-you", "autumn-reel"], when: ["halloween", "thanksgiving"] },
  thanksgiving: { slugs: ["wishbone", "light-the-candles"], when: ["thanksgiving"] },
  christmas: { slugs: ["nice-list", "frosted-window", "string-the-lights", "gingerbread-house"], when: ["christmas"] },
};
/** Drawn around a birthday cake, a mortarboard or two towns: offered for that and nothing else. */
const ONE_DAY: Record<string, Occasion[]> = {
  "birthday-cinema": ["birthday"],
  balloons: ["birthday"],
  "party-animals": ["birthday"],
  sketchbook: ["birthday"],
  "cap-toss": ["graduation"],
  passport: ["long-distance"],
  halfway: ["long-distance"],
};
/** Lipstick kisses, two figures holding hands, "recipe for us": for a partner and nobody else. */
const COUPLES_ONLY = ["xoxo", "coquette", "dark-romance", "evergreen", "snow-globe", "be-my-boo", "fall-for-you", "autumn-reel"];
const PARTNERS: readonly FinderRecipient[] = FINDER_PARTNERS;

describe("the fit table", () => {
  it("has an entry for every template, and for nothing else", () => {
    expect(Object.keys(FINDER_FITS).sort()).toEqual([...TEMPLATE_SLUGS].sort());
    expect(GIFTS).toHaveLength(TEMPLATE_SLUGS.length);
  });

  it("names real people, feelings and occasions, each once", () => {
    for (const [slug, fit] of Object.entries(FINDER_FITS)) {
      expect(fit.for.length, slug).toBeGreaterThan(0);
      expect(new Set(fit.for).size, slug).toBe(fit.for.length);
      for (const who of fit.for) expect(FINDER_RECIPIENTS, slug).toContain(who);
      expect(fit.feels.length, slug).toBeGreaterThan(0);
      expect(new Set(fit.feels).size, slug).toBe(fit.feels.length);
      for (const feel of fit.feels) expect(FINDER_FEELS, slug).toContain(feel);
      for (const occasion of fit.only ?? []) expect(OCCASIONS, slug).toContain(occasion);
    }
  });

  it("keeps a template that is only offered for some occasions reachable through one its manifest lists", () => {
    for (const [slug, fit] of Object.entries(FINDER_FITS)) {
      if (!fit.only) continue;
      const listed = getManifest(slug)!.occasions;
      expect(fit.only.some((o) => listed.includes(o)), slug).toBe(true);
    }
  });

  it("offers a couples' template to partners only", () => {
    for (const slug of COUPLES_ONLY) {
      expect(FINDER_FITS[slug].for.every((who) => PARTNERS.includes(who)), slug).toBe(true);
    }
  });

  it("keeps nobody from flowers, a music box, a locket or a recipe card for being a man", () => {
    // Only a template drawn for a couple, or for a girlfriend or a wife (a satin bow, a pastel plush), leaves anyone out by who they are.
    for (const slug of ["bouquet", "bloom", "garden", "music-box", "favorite-person", "recipe-box"]) expect([...FINDER_FITS[slug].for].sort(), slug).toEqual([...FINDER_RECIPIENTS].sort());
    for (const who of ["boyfriend", "husband", "dad"] as const) expect(FINDER_FITS.keepsake.for, who).toContain(who);
    for (const [slug, fit] of Object.entries(FINDER_FITS)) {
      const women = fit.for.includes("girlfriend") && fit.for.includes("wife");
      const men = fit.for.includes("boyfriend") && fit.for.includes("husband");
      if (women !== men) expect(["coquette", "kawaii"], slug).toContain(slug);
    }
  });

  it("offers for a person every template that person's gift-ideas page already recommends", () => {
    for (const r of RECIPIENTS) {
      for (const idea of RECIPIENT_GUIDES[r].en.ideas) {
        expect(FINDER_FITS[idea.template]?.for, `${idea.template} on /gifts/for-${r}`).toContain(r);
      }
    }
  });

  it("writes a reason for a feeling or a person only where the template has that feeling or suits that person", () => {
    for (const [slug, fit] of Object.entries(FINDER_FITS)) {
      for (const key of Object.keys(fit.why)) {
        if (key === "base") continue;
        const known = (FINDER_FEELS as readonly string[]).includes(key) ? (fit.feels as readonly string[]).includes(key) : (fit.for as readonly string[]).includes(key);
        expect(known, `${slug}.why.${key}`).toBe(true);
      }
    }
  });
});

describe("the reasons", () => {
  const reasons = Object.entries(FINDER_FITS).flatMap(([slug, fit]) =>
    Object.entries(fit.why).flatMap(([key, words]) => (["en", "es"] as const).map((locale) => ({ where: `${slug}.why.${key}.${locale}`, slug, locale, text: words?.[locale] ?? "" }))),
  );

  it("exist in both languages, as one or two plain sentences", () => {
    for (const { where, text } of reasons) {
      expect(text.trim().length, where).toBeGreaterThan(60);
      expect(text.length, where).toBeLessThanOrEqual(200);
      expect(text, where).toMatch(/[.»"]$/);
      expect(text, where).not.toMatch(/[!¡—–]/);
      expect(text, where).not.toMatch(/\bperfect for\b|\bperfect[oa] para\b/i);
    }
  });

  it("carry no filler", () => {
    expect(reasons.flatMap(({ where, text, locale }) => fillerIn(text, locale).map((f) => `${where}: “${f}”`))).toEqual([]);
  });

  it("are not the manifest's tagline over again", () => {
    for (const { where, slug, locale, text } of reasons) expect(text, where).not.toBe(getManifest(slug)!.tagline[locale]);
  });

  it("say the same thing only once per template", () => {
    for (const [slug, fit] of Object.entries(FINDER_FITS)) {
      // The same sentence may serve two people (a mother and a father); never two feelings, or a feeling and the general case.
      const general = [fit.why.base, ...FINDER_FEELS.flatMap((f) => fit.why[f] ?? [])].map((w) => w.en);
      expect(new Set(general).size, slug).toBe(general.length);
    }
  });

  it("quote a character limit only when it is the length of a text field in the template's own schema", () => {
    const schema = (slug: string) => fs.readFileSync(path.join(__dirname, "../../src/templates", slug, "schema.ts"), "utf8");
    let quoted = 0;
    for (const { where, slug, text } of reasons) {
      for (const match of text.matchAll(/(\d+) (?:characters|caracteres|letters|letras)/g)) {
        quoted += 1;
        // A string's own `.max(60)`, or a named length it is held to (`LABEL_MAX = 48`): not a photo count, a colour or a year that happens to be the same number.
        const asLength = new RegExp(`string\\(\\)[^;\\n]*\\.max\\(${match[1]}\\)|_MAX = ${match[1]};`);
        expect(schema(slug), `${where} says ${match[0]}`).toMatch(asLength);
      }
    }
    expect(quoted).toBeGreaterThan(80);
  });

  it("promise for The Letter only what its free version sends: words and a song, never photos", () => {
    // Live, a free Letter is a 500-character note with a song; photos are paid (lib/gift/free-tier.ts).
    // The pick shows "Free" beside these sentences, so none of them may count on a photo.
    const letter = getManifest("the-letter")!;
    expect(sendsFree(letter, 1)).toBe(true);
    for (const { where, slug, text } of reasons) {
      if (slug === "the-letter") expect(text, where).not.toMatch(/photo|picture|polaroid|foto|imagen/i);
    }
    // And the mark beside each pick follows the same rule the gallery does: Constellations is not free once the note is for everyone.
    expect(sendsFree(getManifest("constellations")!, 1)).toBe(false);
    expect(sendsFree(getManifest("constellations")!, 0)).toBe(true);
    for (const pick of finderPicks("en")) expect(pick.free, pick.slug).toBe(sendsFree(getManifest(pick.slug)!));
  });

  it("go to the browser in one language, with the person's sentence ahead of the feeling's", () => {
    const picks = finderPicks("es");
    const letter = picks.find((p) => p.slug === "the-letter")!;
    expect(letter.why.base).toBe(FINDER_FITS["the-letter"].why.base.es);
    expect(letter.name).toBe(getManifest("the-letter")!.name.es);
    expect(pickReason(letter.why, { for: "mom", occasion: "birthday", feel: "romantic" })).toBe(FINDER_FITS["the-letter"].why.mom!.es);
    expect(pickReason(letter.why, { for: "girlfriend", occasion: "birthday", feel: "romantic" })).toBe(FINDER_FITS["the-letter"].why.romantic!.es);
    expect(pickReason(letter.why, { for: "girlfriend", occasion: "birthday", feel: "funny" })).toBe(letter.why.base);
    expect(pickReason(letter.why, { for: ANY, occasion: ANY, feel: ANY })).toBe(letter.why.base);
    // Two answers and no pill: the person's sentence where the template has one, else the general one.
    expect(pickReason(letter.why, { for: "mom", occasion: "birthday", feel: null })).toBe(FINDER_FITS["the-letter"].why.mom!.es);
    expect(pickReason(letter.why, { for: "girlfriend", occasion: "birthday", feel: null })).toBe(letter.why.base);
  });

  it("keep the romantic sentence for a partner: nobody else is told about the two of you", () => {
    // What "romantic" may say and a mother must never read. "Will you marry me?" reached one in the first draft.
    const COUPLE = {
      en: /marry|two of you|day you met|both your names|your (?:wedding|anniversary)/i,
      es: /cas(?:as|arte|aros) conmigo|os conocisteis|vuestros dos nombres|solo habéis estado vosotros|para los dos|vuestr[oa] (?:boda|aniversario)/i,
    };
    const scratch = FINDER_FITS["scratch-card"].why;
    expect(scratch.romantic!.en).toMatch(COUPLE.en);
    expect(scratch.romantic!.es).toMatch(COUPLE.es);
    expect(pickReason(scratch, { for: "wife", occasion: "wedding", feel: "romantic" })).toBe(scratch.romantic);
    for (const who of ["mom", "dad", "best-friend", "someone", ANY] as const) {
      expect(pickReason(scratch, { for: who, occasion: "wedding", feel: "romantic" }), who).toBe(scratch.base);
    }

    let shown = 0;
    for (const locale of ["en", "es"] as const) {
      const picks = finderPicks(locale);
      for (const answers of COMBINATIONS) {
        if ((PARTNERS as readonly unknown[]).includes(answers.for)) continue;
        for (const pick of rankGifts(picks, answers)) {
          const where = `${pick.slug} for ${said(answers)} (${locale})`;
          const sentence = pickReason(pick.why, answers);
          shown += 1;
          const own = answers.for !== ANY && answers.for !== null && sentence === pick.why[answers.for];
          // The feeling's sentence is used only when it is not the romantic one.
          if (!own) expect([pick.why.base, pick.why.funny, pick.why.sentimental, pick.why.unusual], where).toContain(sentence);
          // "Not sure" about the person still shows the couples' templates, whose own words are a couple's; a named person never gets one.
          if (answers.for === ANY && COUPLES_ONLY.includes(pick.slug)) continue;
          // Two friends are "the two of you" too, in the sentences written for a best friend.
          if (own && answers.for === "best-friend" && !/marry|day you met|both your names/i.test(sentence)) continue;
          expect(sentence, where).not.toMatch(COUPLE[locale]);
        }
      }
    }
    expect(shown).toBeGreaterThan(10_000);
  });

  it("open three ways in every first three, in both languages", () => {
    // A result whose three sentences all start "They …" reads as a list from one mould.
    for (const locale of ["en", "es"] as const) {
      const picks = finderPicks(locale);
      for (const answers of COMBINATIONS) {
        const firsts = rankGifts(picks, answers).slice(0, PICKS_PER_PAGE).map((pick) => pickReason(pick.why, answers).split(" ")[0]);
        expect(new Set(firsts).size, `${said(answers)} (${locale}): ${firsts.join(", ")}`).toBeGreaterThan(1);
      }
      // And no opener carries more than a quarter of the general sentences.
      const general = picks.map((pick) => pick.why.base.split(" ")[0]);
      for (const word of new Set(general)) expect(general.filter((w) => w === word).length, `“${word} …” (${locale})`).toBeLessThanOrEqual(Math.floor(picks.length / 4));
    }
  });
});

describe("reading the answers from an address", () => {
  it("reads a full answer, in any case and with spaces", () => {
    expect(parseAnswers("?for=mom&occasion=birthday&feel=funny")).toEqual({ for: "mom", occasion: "birthday", feel: "funny" });
    expect(parseAnswers("for=Best-Friend&occasion=%20long-distance&feel=ANY")).toEqual({ for: "best-friend", occasion: "long-distance", feel: "any" });
    expect(parseAnswers(new URLSearchParams({ for: "any", occasion: "any", feel: "any" }))).toEqual({ for: "any", occasion: "any", feel: "any" });
  });

  it("treats anything it does not know as an open question, never an error", () => {
    expect(parseAnswers("")).toEqual(NO_ANSWERS);
    expect(parseAnswers("?for=grandma&occasion=tuesday&feel=")).toEqual(NO_ANSWERS);
    expect(parseAnswers("?for=mom&for=dad&occasion=<script>&feel=funny&ref=finder")).toEqual({ for: "mom", occasion: null, feel: "funny" });
    expect(parseAnswers("?%E0%A4%A=1&feel=unusual")).toEqual({ for: null, occasion: null, feel: "unusual" });
  });

  it("asks two questions, and never the feeling", () => {
    expect(FINDER_STEPS).toEqual(["for", "occasion"]);
    expect(openStep(NO_ANSWERS)).toBe("for");
    expect(openStep(parseAnswers("?occasion=birthday&feel=funny"))).toBe("for");
    expect(openStep(parseAnswers("?for=dad&feel=funny"))).toBe("occasion");
    // Two answers are a result: the third question of the first version is gone.
    expect(openStep(parseAnswers("?for=dad&occasion=christmas"))).toBeNull();
    expect(openStep(parseAnswers("?for=any&occasion=any"))).toBeNull();
  });

  it("still opens the result of an old three-question link, with its feeling's pill on", () => {
    const old = parseAnswers("?for=girlfriend&occasion=anniversary&feel=romantic");
    expect(openStep(old)).toBeNull();
    expect(chosenFeel(old)).toBe("romantic");
    // "Not sure" was an answer to the third question: the link opens its result with no pill on.
    const unsure = parseAnswers("?for=dad&occasion=christmas&feel=any");
    expect(openStep(unsure)).toBeNull();
    expect(chosenFeel(unsure)).toBeNull();
    expect(chosenFeel(parseAnswers("?for=dad&occasion=christmas"))).toBeNull();
    // And the same picks, in the same order, as that link gave before.
    expect(rankGifts(GIFTS, unsure).map((g) => g.slug)).toEqual(rankGifts(GIFTS, { for: "dad", occasion: "christmas", feel: null }).map((g) => g.slug));
  });

  it("reads who as for, where an address has no for", () => {
    expect(parseAnswers("?who=mom&occasion=birthday&feel=funny")).toEqual({ for: "mom", occasion: "birthday", feel: "funny" });
    expect(parseAnswers("?who=mom&for=dad")).toEqual({ for: "dad", occasion: null, feel: null });
    expect(parseAnswers("?who=grandma")).toEqual(NO_ANSWERS);
  });

  it("asks a question again only when the address says so, and only one of the two", () => {
    expect(askedStep("?for=mom&occasion=birthday&ask=for")).toBe("for");
    expect(askedStep("?for=mom&occasion=birthday&ask=Occasion")).toBe("occasion");
    expect(askedStep("?for=mom&occasion=birthday")).toBeNull();
    expect(askedStep("?ask=feel")).toBeNull();
    expect(askedStep("?ask=<script>")).toBeNull();
  });

  it("holds a shared result back until it is read, whichever way the address names the person", () => {
    const script = finderWaitScript();
    expect(script).toContain('q.get("for")');
    expect(script).toContain('q.get("who")');
    expect(script).toContain("data-finder-wait");
  });

  it("writes the answers back in the order they are asked", () => {
    expect(answersQuery(NO_ANSWERS)).toBe("");
    expect(answersQuery({ for: null, occasion: "apology", feel: null })).toBe("?occasion=apology");
    for (const answers of COMBINATIONS) expect(parseAnswers(answersQuery(answers)), said(answers)).toEqual(answers);
    expect(answersQuery({ for: "best-friend", occasion: "mothers-day", feel: null })).toBe("?for=best-friend&occasion=mothers-day");
    expect(answersQuery({ for: "best-friend", occasion: "mothers-day", feel: "funny" })).toBe("?for=best-friend&occasion=mothers-day&feel=funny");
  });
});

describe("the second question", () => {
  const people = [...FINDER_RECIPIENTS, ANY] as const;

  it("shows each person the six occasions that matter most to them, and keeps every other one a tap away", () => {
    expect(OCCASIONS_SHOWN).toBe(6);
    for (const who of people) {
      const own = OCCASIONS_FOR[who];
      expect(own, who).toHaveLength(6);
      expect(new Set(own).size, who).toBe(6);
      for (const o of own) expect(OCCASIONS, who).toContain(o);
      const { first, more } = occasionsFor(who, "2026-07-01");
      expect(first, who).toEqual(own);
      expect([...first, ...more].sort(), who).toEqual([...OCCASIONS].sort());
    }
    // A mother is asked about Mother's Day and never, up front, about Valentine's; a friend about a graduation.
    expect(OCCASIONS_FOR.mom).toContain("mothers-day");
    expect(OCCASIONS_FOR.mom).not.toContain("valentines");
    expect(OCCASIONS_FOR.dad).toContain("fathers-day");
    expect(OCCASIONS_FOR["best-friend"]).toContain("graduation");
    for (const who of FINDER_PARTNERS) expect(OCCASIONS_FOR[who].slice(0, 3), who).toEqual(["birthday", "anniversary", "valentines"]);
    // Nobody has answered yet: the general six.
    expect(occasionsFor(null, "2026-07-01").first).toEqual(OCCASIONS_FOR[ANY]);
  });

  it("leads with Christmas from 15 Nov to 25 Dec, by the day the page was rendered with", () => {
    expect(occasionsInSeason("2026-11-14")).toEqual([]);
    expect(occasionsInSeason("2026-11-15")).toEqual(["christmas"]);
    expect(occasionsInSeason("2026-12-25")).toEqual(["christmas"]);
    expect(occasionsInSeason("2026-12-26")).toEqual([]);
    expect(occasionsInSeason("2027-02-14")).toEqual(["valentines"]);
    expect(occasionsInSeason("2027-02-15")).toEqual([]);
    expect(occasionsInSeason("not a day")).toEqual([]);
    for (const who of people) {
      const inSeason = occasionsFor(who, "2026-11-22").first;
      expect(inSeason[0], who).toBe("christmas");
      // The same six, reordered: nothing is pushed out by the season.
      expect([...inSeason].sort(), who).toEqual([...OCCASIONS_FOR[who]].sort());
      expect(occasionsFor(who, "2026-07-01").first[0], who).toBe("birthday");
    }
    // A season only reorders a person's own six: a mother is not asked about Valentine's in February.
    expect(occasionsFor("mom", "2027-02-10").first).toEqual(OCCASIONS_FOR.mom);
    expect(occasionsFor("girlfriend", "2027-02-10").first[0]).toBe("valentines");
  });

  it("has three gifts, and three more, behind every answer it shows up front", () => {
    for (const who of people)
      for (const occasion of [...OCCASIONS_FOR[who], ANY] as const) expect(rankGifts(GIFTS, { for: who, occasion, feel: null }).length, `${who} / ${occasion}`).toBeGreaterThanOrEqual(6);
  });
});

describe("the picture on an answer", () => {
  const people = [...FINDER_RECIPIENTS, ANY];

  it("is a different gift on every card of the first question, each one that person can be offered", () => {
    const cards = answerGifts(GIFTS, NO_ANSWERS, "for", people);
    expect([...cards.keys()]).toEqual(people);
    expect(new Set([...cards.values()].map((g) => g.slug)).size).toBe(people.length);
    for (const [who, gift] of cards) {
      expect(fits(gift, { for: who as FinderAnswers["for"], occasion: null, feel: null }), `${gift.slug} for ${who}`).toBe(true);
      // Nothing tied to one day or one season stands for a person: no occasion has been named yet.
      expect(gift.only, gift.slug).toBeUndefined();
      // Nor a trip's reveal, which only makes sense when the present is a trip.
      expect(gift.conditional, gift.slug).toBeFalsy();
    }
    // The first card is that answer's own first pick.
    expect(cards.get("girlfriend")!.slug).toBe(rankGifts(GIFTS, { for: "girlfriend", occasion: null, feel: null })[0].slug);
  });

  it("is a different gift on every card of the second question, for every person, each made for or suited to that day", () => {
    for (const who of people as FinderAnswers["for"][]) {
      const { first, more } = occasionsFor(who, "2026-11-22");
      const options = [...first, ANY, ...more];
      const cards = answerGifts(GIFTS, { for: who, occasion: null, feel: null }, "occasion", options);
      expect([...cards.keys()], String(who)).toEqual(options);
      // Thirteen occasions and "Not sure": a person with few gifts for some day may see one picture twice, never on the cards shown first.
      const shownFirst = [...first, ANY].map((o) => cards.get(o)!.slug);
      expect(new Set(shownFirst).size, String(who)).toBe(shownFirst.length);
      for (const [occasion, gift] of cards) expect(fits(gift, { for: who, occasion: occasion as FinderAnswers["occasion"], feel: null }), `${gift.slug} for ${who} / ${occasion}`).toBe(true);
      // Christmas shows a Christmas gift, not the best seller.
      expect(getManifest(cards.get("christmas")!.slug)!.occasions, String(who)).toContain("christmas");
    }
  });

  it("is drawn from a poster that exists", () => {
    const posters = new Map(finderPicks("en").map((p) => [p.slug, p.poster]));
    for (const gift of answerGifts(GIFTS, NO_ANSWERS, "for", people).values()) {
      const poster = posters.get(gift.slug)!;
      expect(fs.existsSync(path.join(__dirname, "../../public", poster)), poster).toBe(true);
    }
  });
});

describe("the line under a pick", () => {
  const sentences = (["en", "es"] as const).flatMap((locale) =>
    Object.entries(FINDER_FITS).flatMap(([slug, fit]) => Object.entries(fit.why).map(([key, words]) => ({ where: `${slug}.${key}.${locale}`, slug, key, locale, whole: words![locale] }))),
  );

  it("is fourteen words at most, for every sentence of every template, in both languages", () => {
    expect(REASON_WORDS).toBe(14);
    const over: string[] = [];
    for (const { where, slug, key, locale, whole } of sentences) {
      const line = shortLine(slug, key, locale, whole);
      // A sentence the rule cannot cut needs a line written by hand in FINDER_SHORT.
      if (line === null) over.push(`${where}: no line, write one`);
      else if (countWords(line) > REASON_WORDS) over.push(`${where}: ${countWords(line)} words: ${line}`);
      else if (countWords(line) < 4) over.push(`${where}: too thin to say anything: ${line}`);
    }
    expect(over).toEqual([]);
    expect(sentences.length).toBeGreaterThan(290);
  });

  it("is a whole clause that ends like a sentence, with no filler", () => {
    for (const { where, slug, key, locale, whole } of sentences) {
      const line = shortLine(slug, key, locale, whole)!;
      expect(line, where).toMatch(/[.?»"”]$/);
      expect(line, where).not.toMatch(/[,;:]\.$/);
      expect(line, where).not.toMatch(/[!¡—–]/);
      expect(fillerIn(line, locale), where).toEqual([]);
    }
  });

  it("cuts a sentence only where a thought ends", () => {
    expect(shortReason("It opens on a wax seal they break with a tap, then your words write themselves out by hand on a candle-lit desk. It is the plainest gift here.")).toBe("It opens on a wax seal they break with a tap.");
    // As many whole sentences as fit.
    expect(shortReason("One short sentence. And a second one. Then a third that goes on for a good deal longer than the limit allows it to.")).toBe("One short sentence. And a second one.");
    // A colon before a comma: the list after it is what gets cut.
    expect(shortReason("Every page draws itself in ink as they turn to it: a cake, their age circled twice, a party hat.")).toBe("Every page draws itself in ink as they turn to it.");
    // A question mark inside a quotation does not end the sentence.
    expect(shortReason('It asks "be my boo?" unless you write your own, which takes 24 characters at most and not one more than that.')).toBe('It asks "be my boo?" unless you write your own.');
    // Nothing to cut at: it says so, and a line is written by hand.
    expect(shortReason("Change the shape from a heart to a star and fill the sky with family photos of every single one of you.")).toBeNull();
  });

  it("where it was written by hand, says nothing its sentence does not: the same numbers, and a real sentence to shorten", () => {
    let written = 0;
    for (const [slug, keys] of Object.entries(FINDER_SHORT)) {
      for (const [key, words] of Object.entries(keys)) {
        for (const [locale, line] of Object.entries(words!) as ["en" | "es", string][]) {
          written += 1;
          const whole = FINDER_FITS[slug]?.why[key as "base"]?.[locale];
          expect(whole, `${slug}.${key}.${locale} shortens a sentence that does not exist`).toBeDefined();
          // Every number a line quotes (18 characters, 2006) is in the sentence it shortens.
          for (const n of line.match(/\d+/g) ?? []) expect(whole, `${slug}.${key}.${locale} says ${n}`).toContain(n);
          expect(line.length, `${slug}.${key}.${locale}`).toBeLessThan(whole!.length);
        }
      }
    }
    expect(written).toBeGreaterThan(40);
  });

  it("goes to the browser beside the whole sentence, under the same key", () => {
    for (const locale of ["en", "es"] as const) {
      for (const pick of finderPicks(locale)) {
        expect(Object.keys(pick.line).sort(), pick.slug).toEqual(Object.keys(pick.why).sort());
        for (const answers of [{ for: "mom", occasion: "birthday", feel: null }, { for: "girlfriend", occasion: "anniversary", feel: "romantic" }, { for: ANY, occasion: ANY, feel: null }] as FinderAnswers[]) {
          const key = reasonKey(pick.why, answers);
          expect(pick.why[key], pick.slug).toBe(pickReason(pick.why, answers));
          expect(countWords(pick.line[key] as string), `${pick.slug}.${String(key)}`).toBeLessThanOrEqual(REASON_WORDS);
        }
      }
    }
    // The Letter is free, its line promises no photo either, and its film starts past the recording's opening.
    const letter = finderPicks("en").find((p) => p.slug === "the-letter")!;
    for (const line of Object.values(letter.line)) expect(line).not.toMatch(/photo|picture|polaroid/i);
    expect(letter.film).toBe("/templates/the-letter/preview.webm");
    expect(letter.filmFrom).toBeGreaterThan(0);
  });
});

describe("the Christmas gifts for one person", () => {
  it("are the finder's own first four for that person at Christmas, and Christmas gifts lead them", () => {
    for (const who of ["boyfriend", "girlfriend"] as const) {
      const picks = christmasPicks(who);
      expect(picks, who).toHaveLength(4);
      expect(new Set(picks).size, who).toBe(4);
      expect(picks, who).toEqual(rankGifts(GIFTS, { for: who, occasion: "christmas", feel: null }).slice(0, 4).map((g) => g.slug));
      for (const slug of picks) expect(TEMPLATE_SLUGS, who).toContain(slug);
      expect(getManifest(picks[0])!.occasions, who).toContain("christmas");
    }
  });
});

describe("the picks", () => {
  it(`gives every one of the ${COMBINATIONS.length} answers three different, registered templates`, () => {
    expect(COMBINATIONS).toHaveLength(756);
    for (const answers of COMBINATIONS) {
      const ranked = rankGifts(GIFTS, answers);
      const top = ranked.slice(0, PICKS_PER_PAGE).map((g) => g.slug);
      expect(top, said(answers)).toHaveLength(3);
      expect(new Set(ranked.map((g) => g.slug)).size, said(answers)).toBe(ranked.length);
      for (const slug of top) expect(TEMPLATE_SLUGS, said(answers)).toContain(slug);
    }
  });

  it("has three more to show for every answer", () => {
    for (const answers of COMBINATIONS) expect(rankGifts(GIFTS, answers).length, said(answers)).toBeGreaterThanOrEqual(6);
  });

  it("never offers a seasonal template outside its season", () => {
    for (const answers of COMBINATIONS) {
      const offered = new Set(rankGifts(GIFTS, answers).map((g) => g.slug));
      for (const [season, { slugs, when }] of Object.entries(SEASONAL)) {
        if (when.includes(answers.occasion as Occasion)) continue;
        for (const slug of slugs) expect(offered.has(slug), `${slug} (${season}) for ${said(answers)}`).toBe(false);
      }
    }
  });

  it("offers a seasonal template when its season is asked for", () => {
    for (const { slugs, when } of Object.values(SEASONAL)) {
      for (const occasion of when) {
        const offered = rankGifts(GIFTS, { for: ANY, occasion, feel: ANY }).map((g) => g.slug);
        for (const slug of slugs) expect(offered, `${slug} for ${occasion}`).toContain(slug);
      }
    }
  });

  it("leads a seasonal answer with that season's own templates", () => {
    for (const occasion of ["halloween", "christmas", "thanksgiving"] as const) {
      for (const who of [...FINDER_RECIPIENTS, ANY] as const) {
        const first = rankGifts(GIFTS, { for: who, occasion, feel: ANY })[0].slug;
        expect(getManifest(first)!.occasions, `${first} for ${who} at ${occasion}`).toContain(occasion);
      }
    }
  });

  it("keeps a template drawn around one day to that day", () => {
    for (const answers of COMBINATIONS) {
      const offered = new Set(rankGifts(GIFTS, answers).map((g) => g.slug));
      for (const [slug, days] of Object.entries(ONE_DAY)) {
        if (!days.includes(answers.occasion as Occasion)) expect(offered.has(slug), `${slug} for ${said(answers)}`).toBe(false);
      }
    }
  });

  it("never offers anyone a template that does not suit them", () => {
    for (const answers of COMBINATIONS) {
      if (answers.for === ANY || answers.for === null) continue;
      for (const gift of rankGifts(GIFTS, answers)) expect(gift.for, `${gift.slug} for ${said(answers)}`).toContain(answers.for);
    }
    for (const who of ["mom", "dad", "best-friend", "someone"] as const) {
      for (const occasion of [...OCCASIONS, ANY] as const) {
        const offered = rankGifts(GIFTS, { for: who, occasion, feel: "romantic" }).map((g) => g.slug);
        for (const slug of COUPLES_ONLY) expect(offered, `${slug} for ${who}`).not.toContain(slug);
      }
    }
  });

  it("puts every template in the first three of at least one answer", () => {
    const seen = new Set(COMBINATIONS.flatMap((answers) => rankGifts(GIFTS, answers).slice(0, PICKS_PER_PAGE).map((g) => g.slug)));
    expect(TEMPLATE_SLUGS.filter((slug) => !seen.has(slug))).toEqual([]);
  });

  it("counts the occasion most, then the feeling, then the person", () => {
    const gift = (over: Partial<FinderGift>): FinderGift => ({ slug: "x", occasions: ["birthday", "anniversary"], sortOrder: 1, for: ["mom", "dad"], feels: ["funny", "romantic"], ...over });
    const answers: FinderAnswers = { for: "mom", occasion: "birthday", feel: "funny" };
    expect(score(gift({}), answers)).toBeGreaterThan(score(gift({ occasions: ["anniversary", "birthday"] }), answers));
    expect(score(gift({ feels: ["romantic"] }), answers)).toBeGreaterThan(score(gift({ occasions: ["wedding"] }), answers));
    expect(score(gift({}), answers)).toBeGreaterThan(score(gift({ feels: ["romantic", "funny"] }), answers));
    expect(score(gift({ listedFor: ["mom"] }), answers)).toBeGreaterThan(score(gift({}), answers));
    // The feeling outweighs being on the person's page; "Not sure" adds nothing for anyone.
    expect(score(gift({ feels: ["funny"] }), answers)).toBeGreaterThan(score(gift({ feels: ["romantic"], listedFor: ["mom"] }), answers));
    expect(score(gift({ listedFor: ["mom"] }), { for: ANY, occasion: ANY, feel: ANY })).toBe(0);
    expect(fits(gift({}), { ...answers, for: "wife" })).toBe(false);
    expect(fits(gift({ only: ["birthday"] }), { ...answers, occasion: ANY })).toBe(false);
    expect(fits(gift({ only: ["birthday"] }), answers)).toBe(true);
  });

  it("breaks ties with the best sellers, in their order", () => {
    const tied = [...BEST_SELLERS].reverse().map((slug, i): FinderGift => ({ slug, occasions: [], sortOrder: i, for: ["someone"], feels: ["funny"] }));
    const other: FinderGift = { slug: "aaa", occasions: [], sortOrder: 0, for: ["someone"], feels: ["funny"] };
    expect(rankGifts([other, ...tied], { for: "someone", occasion: ANY, feel: ANY }).map((g) => g.slug)).toEqual([...BEST_SELLERS, "aaa"]);
    // With nothing narrowed, the widest answer is the best sellers that suit any day.
    expect(rankGifts(GIFTS, { for: ANY, occasion: ANY, feel: ANY }).slice(0, 3).map((g) => g.slug)).toEqual(["the-letter", "bouquet", "constellations"]);
  });

  it("never leads with a gift that needs something nobody was asked about", () => {
    // Pack Your Bags reveals a trip. The finder never asks whether the present is one, so it may be offered, never first.
    expect(GIFTS.filter((g) => g.conditional).map((g) => g.slug)).toEqual(["pack-your-bags"]);
    let offered = 0;
    for (const answers of COMBINATIONS) {
      const ranked = rankGifts(GIFTS, answers);
      expect(ranked[0].conditional, said(answers)).toBeFalsy();
      if (ranked.some((g) => g.slug === "pack-your-bags")) offered += 1;
    }
    expect(offered).toBeGreaterThan(0);
    // Whoever reads its sentence is told the condition first, in both languages.
    for (const words of Object.values(FINDER_FITS["pack-your-bags"].why)) {
      expect(words!.en).toMatch(/^For when the gift is a trip/);
      expect(words!.es).toMatch(/^Para cuando el regalo es un viaje/);
    }
    // The rule itself: the best template that needs nothing steps ahead, and the rest keep their order.
    const gift = (slug: string, feels: FinderFeel[], conditional?: boolean): FinderGift => ({ slug, occasions: [], sortOrder: 1, for: ["someone"], feels, conditional });
    const answers: FinderAnswers = { for: "someone", occasion: ANY, feel: "funny" };
    expect(rankGifts([gift("trip", ["funny"], true), gift("b", ["romantic", "funny"]), gift("c", ["romantic"])], answers).map((g) => g.slug)).toEqual(["b", "trip", "c"]);
    expect(rankGifts([gift("trip", ["funny"], true)], answers).map((g) => g.slug)).toEqual(["trip"]);
  });

  it("gives the same answers the same list every time", () => {
    const answers: FinderAnswers = { for: "girlfriend", occasion: "anniversary", feel: "romantic" };
    const once = rankGifts(GIFTS, answers).map((g) => g.slug);
    expect(rankGifts([...GIFTS].reverse(), answers).map((g) => g.slug)).toEqual(once);
  });

  it("answers the obvious questions the obvious way", () => {
    const top = (who: FinderAnswers["for"], occasion: FinderAnswers["occasion"], feel: FinderFeel | typeof ANY) => rankGifts(GIFTS, { for: who, occasion, feel }).slice(0, 3).map((g) => g.slug);
    expect(top("mom", "mothers-day", "sentimental")).toContain("recipe-box");
    expect(top("dad", "fathers-day", "funny")).toContain("front-page");
    expect(top("best-friend", "birthday", "funny")).toContain("party-animals");
    expect(top("girlfriend", "valentines", "romantic")).toContain("xoxo");
    expect(top("boyfriend", "long-distance", "unusual")).toEqual(expect.arrayContaining(["passport", "halfway"]));
    expect(top("someone", "graduation", ANY)).toContain("cap-toss");
    expect(top("wife", "apology", "sentimental")).toContain("paper-crane");
  });
});

describe("who it suits, on a template's page", () => {
  it("lists the people with a gift-ideas page, in the site's order, and never the catch-all", () => {
    expect(suitedRecipients("xoxo")).toEqual(["boyfriend", "girlfriend", "husband", "wife"]);
    // A locket of kept things: for a partner or a parent, and not on the best friend's page.
    expect(suitedRecipients("keepsake")).toEqual(["boyfriend", "girlfriend", "husband", "wife", "mom", "dad"]);
    expect(suitedRecipients("coquette")).toEqual(["girlfriend", "wife"]);
    expect(suitedRecipients("the-letter")).toEqual([...RECIPIENTS]);
    expect(suitedRecipients("no-such-template")).toEqual([]);
    for (const slug of TEMPLATE_SLUGS) expect(suitedRecipients(slug).length, slug).toBeGreaterThan(0);
  });
});

describe("the page's words", () => {
  it("say the same things in both languages", () => {
    const shape = (value: unknown): unknown =>
      Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])) : typeof value;
    expect(shape(FINDER_COPY.es)).toEqual(shape(FINDER_COPY.en));
  });

  it("fit a search result", () => {
    for (const locale of ["en", "es"] as const) {
      expect(FINDER_COPY[locale].title.length, locale).toBeLessThanOrEqual(60);
      expect(FINDER_COPY[locale].description.length, locale).toBeGreaterThanOrEqual(110);
      expect(FINDER_COPY[locale].description.length, locale).toBeLessThanOrEqual(160);
    }
  });

  it("name the Gift Finder in the search result's headline, in the words people search", () => {
    // docs/marketing/growth-build/SEO-PICTURE.md: "gift finder" 1,600 a month; the title says it first.
    expect(FINDER_COPY.en.title).toMatch(/^Gift Finder\b/);
    expect(FINDER_COPY.es.title).toMatch(/^Buscador de regalos\b/);
    for (const locale of ["en", "es"] as const) expect(FINDER_COPY[locale].description, locale).not.toMatch(/three questions|tres preguntas/i);
  });

  it("keep to the limits of a designed page: one line of fourteen words, short labels, a card's few words", () => {
    // DESIGN-LESS-TEXT.md, "Limits": a section's left column is a label, a heading and one line of at
    // most fourteen words; a card is a title of at most nine. Every entry is named when it is over.
    const over: string[] = [];
    const hold = (where: string, text: string, max: number) => {
      if (countWords(text) > max) over.push(`${where}: ${countWords(text)} words, ${max} at most: ${text}`);
    };
    for (const locale of ["en", "es"] as const) {
      const copy = FINDER_COPY[locale];
      hold(`${locale} line`, copy.line, 14);
      hold(`${locale} h1`, copy.h1, 8);
      hold(`${locale} eyebrow`, copy.eyebrow, 3);
      hold(`${locale} byWho.label`, copy.byWho.label, 3);
      hold(`${locale} byWho.heading`, copy.byWho.heading, 6);
      hold(`${locale} byWho.all`, copy.byWho.all, 4);
      hold(`${locale} how.title`, copy.how.title, 5);
      const { ui } = copy;
      for (const [step, question] of Object.entries(ui.questions)) hold(`${locale} question ${step}`, question, 5);
      // An answer card: at most five words under its picture, and its pill over the results at most six.
      for (const [who, label] of Object.entries(ui.people)) hold(`${locale} people.${who}`, label, 5);
      for (const [who, label] of Object.entries(ui.forWho)) hold(`${locale} forWho.${who}`, label, 6);
      for (const [o, label] of Object.entries(ui.occasions)) hold(`${locale} occasions.${o}`, label, 4);
      for (const [feel, label] of Object.entries(ui.feels)) hold(`${locale} feels.${feel}`, label, 1);
      for (const key of ["notSure", "moreOccasions", "anyOccasion", "resultTitle", "whyThis", "watch", "make", "more", "restart"] as const) hold(`${locale} ui.${key}`, ui[key], 4);
      hold(`${locale} ui.end`, ui.end, 9);
    }
    expect(over).toEqual([]);
  });

  it("keep how the finder picks to one closed block of at most 180 words, and true to the scoring", () => {
    // It was three paragraphs on the page (the owner, 21 Nov 2026: "no one's reading all that"). They
    // are in one closed <details> now, with the thirteen occasions as a sentence of links after them.
    for (const locale of ["en", "es"] as const) {
      const { how } = FINDER_COPY[locale];
      expect(how.paragraphs, locale).toHaveLength(3);
      const occasions = OCCASIONS.reduce((n, o) => n + countWords((locale === "es" ? es : en).occasions[o]), 0);
      expect(how.paragraphs.reduce((n, p) => n + countWords(p), 0) + countWords(how.byDay) + occasions, locale).toBeLessThanOrEqual(180);
      expect(how.paragraphs[0], locale).toContain("{count}");
      expect(fillerIn(how.paragraphs.join(" "), locale), locale).toEqual([]);
    }
    const english = FINDER_COPY.en.how.paragraphs.join(" ");
    // The first version said two things the scoring does not do (the checker's C10): ties went to
    // "the one more people have bought" (the first of the list is free), and "Not sure" was said to
    // widen every question (on the occasion it sets aside the gifts made for one day).
    expect(english).not.toMatch(/bought/);
    expect(english).toMatch(/the one more people make goes first/);
    expect(english).not.toMatch(/widens/);
    expect(english).toMatch(/sets aside every gift made for a single day/);
    expect(rankGifts(GIFTS, { for: ANY, occasion: ANY, feel: null }).some((g) => g.only)).toBe(false);
    // Two questions now, and the feeling re-ranks: the block must not describe three.
    expect(english).not.toMatch(/three questions|then the feeling/i);
    expect(FINDER_COPY.es.how.paragraphs.join(" ")).not.toMatch(/comprado|amplía/);
  });

  it("never mention Spain, and never shout", () => {
    const all = JSON.stringify({ FINDER_COPY, FINDER_FITS });
    expect(all).not.toMatch(/Spain|España|Madrid|Barcelona|Sevilla|Valencia/i);
    expect(JSON.stringify(FINDER_COPY)).not.toMatch(/[!¡—]/);
  });
});
