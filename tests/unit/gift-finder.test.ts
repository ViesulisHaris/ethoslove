import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import { FINDER_COPY, FINDER_FITS, FINDER_SHORT, christmasPicks, finderGifts, finderPicks, shortLine, suitedRecipients } from "@/content/finder";
import { RECIPIENTS, RECIPIENT_GUIDES } from "@/content/recipients";
import { sendsFree } from "@/lib/gift/free-tier";
import { PRODUCTS, templateProduct, type Currency } from "@/lib/pricing/products";
import { templateOfferAmount } from "@/lib/seo";
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
  ROMANTIC_DAYS,
  answerGifts,
  answersQuery,
  askedStep,
  chosenFeel,
  countWords,
  cutsList,
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
import { fieldsSchema as musicBoxFields } from "@/templates/music-box/schema";
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

  it("give a partner the sentence written for a partner on the days that are romantic anyway, with no pill to tap", () => {
    // The feeling stopped being a question, so the four partners (the commonest answers) only ever read
    // a template's general sentence, and the thirty-odd written for them showed only after "Romantic".
    expect(ROMANTIC_DAYS).toEqual(["anniversary", "valentines", "just-because", ANY]);
    const letter = FINDER_FITS["the-letter"].why;
    for (const who of FINDER_PARTNERS) {
      for (const occasion of ROMANTIC_DAYS) expect(reasonKey(letter, { for: who, occasion, feel: null }), `${who} / ${occasion}`).toBe("romantic");
      // A birthday, Christmas, an apology and the rest are not romantic by themselves: the general sentence.
      for (const occasion of OCCASIONS.filter((o) => !ROMANTIC_DAYS.includes(o))) expect(reasonKey(letter, { for: who, occasion, feel: null }), `${who} / ${occasion}`).toBe("base");
      // "Not sure" as an old link's third answer is no pill either.
      expect(reasonKey(letter, { for: who, occasion: "anniversary", feel: ANY })).toBe("romantic");
      // Another pill is what they asked for: its sentence, or the general one, never the romantic one.
      expect(reasonKey(letter, { for: who, occasion: "anniversary", feel: "sentimental" })).toBe("sentimental");
      expect(reasonKey(letter, { for: who, occasion: "anniversary", feel: "funny" })).toBe("base");
      // A template with no romantic sentence gives its general one.
      expect(reasonKey(FINDER_FITS["the-council"].why, { for: who, occasion: "anniversary", feel: null })).toBe("base");
    }
    // Nobody else is read it, whatever the day: a friend, "someone else" and "Not sure" get the general one.
    for (const who of ["mom", "dad", "best-friend", "someone", ANY] as const)
      for (const occasion of ROMANTIC_DAYS) expect(reasonKey(FINDER_FITS["scratch-card"].why, { for: who, occasion, feel: null }), who).toBe("base");
    // It is what the first picks show: for a girlfriend at an anniversary, every pick that has a partner's sentence reads it.
    const picks = finderPicks("en");
    const answers: FinderAnswers = { for: "girlfriend", occasion: "anniversary", feel: null };
    const first = rankGifts(picks, answers).slice(0, 6);
    expect(first.filter((pick) => pick.why.romantic !== undefined).length).toBeGreaterThanOrEqual(3);
    for (const pick of first) expect(reasonKey(pick.why, answers), pick.slug).toBe(pick.why.romantic !== undefined ? "romantic" : "base");
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

  it("shows each person the seven occasions that matter most to them, and keeps every other one a tap away", () => {
    // Seven and "Not sure" are eight cards, and all thirteen and "Not sure" fourteen: an even grid either way (walk-agreed-1).
    expect(OCCASIONS_SHOWN).toBe(7);
    expect((OCCASIONS_SHOWN + 1) % 2).toBe(0);
    expect((OCCASIONS.length + 1) % 2).toBe(0);
    for (const who of people) {
      const own = OCCASIONS_FOR[who];
      expect(own, who).toHaveLength(7);
      expect(new Set(own).size, who).toBe(7);
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

  it("leads with Christmas from 15 Nov to 25 Dec, Thanksgiving from 1 to 28 Nov, by the day the page was rendered with", () => {
    expect(occasionsInSeason("2026-11-14")).toEqual(["thanksgiving"]);
    expect(occasionsInSeason("2026-11-15")).toEqual(["christmas", "thanksgiving"]);
    expect(occasionsInSeason("2026-11-29")).toEqual(["christmas"]);
    expect(occasionsInSeason("2026-12-25")).toEqual(["christmas"]);
    expect(occasionsInSeason("2026-12-26")).toEqual([]);
    expect(occasionsInSeason("2027-02-14")).toEqual(["valentines"]);
    expect(occasionsInSeason("2027-02-15")).toEqual([]);
    expect(occasionsInSeason("not a day")).toEqual([]);
    for (const who of people) {
      const inSeason = occasionsFor(who, "2026-12-10").first;
      expect(inSeason[0], who).toBe("christmas");
      // The same seven, reordered: nothing is pushed out by a season the person already has.
      expect([...inSeason].sort(), who).toEqual([...OCCASIONS_FOR[who]].sort());
      expect(occasionsFor(who, "2026-07-01").first[0], who).toBe("birthday");
    }
    // A season only reorders a person's own six: a mother is not asked about Valentine's in February.
    expect(occasionsFor("mom", "2027-02-10").first).toEqual(OCCASIONS_FOR.mom);
    expect(occasionsFor("girlfriend", "2027-02-10").first[0]).toBe("valentines");
  });

  it("offers Thanksgiving to everyone three days before it, and Halloween in October, in the gallery row's order (walk-choose-1)", () => {
    for (const who of people) {
      const nov = occasionsFor(who, "2026-11-23").first;
      expect(nov.slice(0, 6), who).toContain("thanksgiving");
      expect(nov.slice(0, 2), who).toEqual(["christmas", "thanksgiving"]);
      expect(nov, who).toHaveLength(OCCASIONS_SHOWN);
      const oct = occasionsFor(who, "2026-10-20").first;
      expect(oct.slice(0, 6), who).toContain("halloween");
      expect(oct, who).toHaveLength(OCCASIONS_SHOWN);
      // What a season pushes out is behind "More occasions", not lost.
      const { first, more } = occasionsFor(who, "2026-10-20");
      expect([...first, ...more].sort(), who).toEqual([...OCCASIONS].sort());
    }
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

  it("is never Paper Crane's near-black poster, which read as a picture that failed (walk-agreed-11)", () => {
    for (const day of ["2026-11-23", "2026-07-01", "2027-02-10"])
      for (const who of people as FinderAnswers["for"][]) {
        const { first, more } = occasionsFor(who, day);
        const cards = answerGifts(GIFTS, { for: who, occasion: null, feel: null }, "occasion", [...first, ANY, ...more]);
        for (const [occasion, gift] of cards) expect(gift.slug, `${who} / ${occasion} on ${day}`).not.toBe("paper-crane");
      }
    expect(answerGifts(GIFTS, NO_ANSWERS, "for", people).size).toBe(people.length);
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

  it("never cuts a sentence inside a list of choices", () => {
    // The review of 22 Nov 2026: "They drag a basket to catch falling hearts." (the game drops hearts, stars or
    // cakes), "…your best worst faces prints in colour." (colour, black and white or sepia), "Choose the two
    // swans who meet as a heart, and Swan Lake." (one of three tunes). Each named the first choice as the only one.
    expect(cutsList(", stars or cakes in a small retro game.")).toBe(true);
    expect(cutsList(", black and white or sepia.")).toBe(true);
    expect(cutsList(", Brahms' Lullaby or Für Elise.")).toBe(true);
    expect(cutsList(", estrellas o tartas que caen.")).toBe(true);
    // The first of three or more: the things after it are still the list.
    expect(cutsList(", red, white or sparkling, poured by tilting the phone.")).toBe(true);
    // A clause that follows a comma is not a list, even with an "or" far along it.
    expect(cutsList(", then your words write themselves out by hand on a desk or a table.")).toBe(false);
    expect(cutsList(", and each carries a tag with a line you wrote.")).toBe(false);
    expect(cutsList(", de 26 caracteres, con el plan que tengáis.")).toBe(false);
    // So the rule gives such a sentence up, and a line is written for it by hand.
    expect(shortReason("They drag a basket to catch falling hearts, stars or cakes in a small retro game that runs on.")).toBeNull();
    expect(shortReason("Four flashes and a strip of your best worst faces prints in color, black and white or sepia.")).toBeNull();
    // A list that fits whole is no cut at all.
    expect(shortReason("One peony, tulip or daisy in the color you choose. It opens for as long as they hold the screen.")).toBe("One peony, tulip or daisy in the color you choose.");

    // And over every sentence: where the rule cut one at a comma, what was left off is not the rest of a list.
    // The check is spelled out again here, so the rule cannot pass by agreeing with itself.
    const listRest = /^,\s+(?:[^\s,.;:]+\s+){1,4}(?:or|o|u)\s|^,\s+[^,.;:]{1,30},\s+(?:[^\s,.;:]+\s+){1,4}(?:or|o|u)\s/;
    let cut = 0;
    for (const { where, slug, key, locale, whole } of sentences) {
      if (FINDER_SHORT[slug]?.[key as "base"]?.[locale]) continue;
      const line = shortReason(whole)!;
      const kept = line.replace(/\.$/, "");
      if (line === whole || !whole.startsWith(kept) || whole[kept.length] !== ",") continue;
      cut += 1;
      expect(whole.slice(kept.length), `${where}: “${line}” stops inside a list`).not.toMatch(listRest);
    }
    expect(cut).toBeGreaterThan(20);
  });

  it("says what the gift is: no line is only an instruction about a field and its length", () => {
    // The same review: under the gift's name stood "Use the side label, 12 characters, for the year.",
    // "Write one reason per tag, 48 characters each.", "Fill in the recipe card, 90 characters under…".
    // A line may quote a limit ("…in 18 characters: a date, a place or "always""); it may not be nothing else.
    const bare = /^(?:Use|Write|Fill in|Rewrite|Set|Usa|Escribe|Rellena|Reescribe|Pon) [^.:]*\b\d+ (?:characters|caracteres)[^.:]*\.$/;
    const off = sentences.map(({ where, slug, key, locale, whole }) => ({ where, line: shortLine(slug, key, locale, whole)! })).filter(({ line }) => bare.test(line));
    expect(off.map(({ where, line }) => `${where}: ${line}`)).toEqual([]);
    // The seven the review named, and the Spanish one, each now say the thing.
    const line = (slug: string, key: string, locale: "en" | "es") => shortLine(slug, key, locale, FINDER_FITS[slug].why[key as "base"]![locale]);
    expect(line("vinyl", "sentimental", "en")).toBe("A record with the year on its label and your photos as album covers.");
    expect(line("sticker-bomb", "best-friend", "en")).toMatch(/^Label-maker strips with what you call each other/);
    expect(line("bat-swarm", "romantic", "en")).toMatch(/^Bats spell their name/);
    expect(line("fall-for-you", "sentimental", "en")).toMatch(/^An autumn collage with a recipe card/);
    expect(line("picnic", "sentimental", "en")).toMatch(/^A picnic basket/);
    expect(line("on-repeat", "sentimental", "en")).toMatch(/^A playlist where each photo is a song/);
    expect(line("constellations", "best-friend", "en")).toMatch(/night sky\.$/);
    expect(line("spooky-season", "funny", "es")).toBe("La entrada del álbum es para dos, al plan que tengáis de verdad.");
    // And the three cut mid-list.
    expect(line("music-box", "romantic", "en")).toBe("A music box with a ballerina, or two swans who meet as a heart.");
    expect(line("photo-booth", "best-friend", "en")).toBe("Four flashes, and a strip of your best worst faces prints.");
    expect(line("arcade", "base", "en")).toBe("A small retro game where every level they clear uncovers one of your photos.");
  });

  it("says a choice the sender makes as a choice: Music Box's swans and its lullaby are not what every Music Box does", () => {
    // The review of 22 Nov 2026: cut from sentences that begin "Choose…", two lines said "Two swans meet
    // as a heart…" and "…playing Brahms' Lullaby while a ballerina turns." A Music Box has a ballerina and
    // plays Swan Lake unless the sender changes them.
    const fields = musicBoxFields.parse({});
    expect(fields.figurine).toBe("ballerina");
    expect(fields.tune).toBe("swan-lake");
    for (const locale of ["en", "es"] as const) {
      const romantic = shortLine("music-box", "romantic", locale, FINDER_FITS["music-box"].why.romantic![locale]);
      const mom = shortLine("music-box", "mom", locale, FINDER_FITS["music-box"].why.mom![locale]);
      // The swans are one of two figurines, said as one of two.
      expect(romantic).toMatch(locale === "en" ? /a ballerina, or two swans/ : /una bailarina, o dos cisnes/);
      // The lullaby is chosen, in the word the long sentence uses.
      expect(mom).toMatch(locale === "en" ? /Choose Brahms' Lullaby/ : /Elige la Canción de cuna/);
      for (const said of [romantic, mom]) expect(said).not.toMatch(/^(Two swans|Dos cisnes)|playing Brahms|que toca la Canción/);
    }
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
      for (const [who, label] of Object.entries(copy.byWho.people)) hold(`${locale} byWho.people.${who}`, label, 6);
      hold(`${locale} how.title`, copy.how.title, 5);
      const { ui } = copy;
      for (const [step, question] of Object.entries(ui.questions)) hold(`${locale} question ${step}`, question, 5);
      // An answer card: at most five words under its picture, and its pill over the results at most six.
      for (const [who, label] of Object.entries(ui.people)) hold(`${locale} people.${who}`, label, 5);
      for (const [who, label] of Object.entries(ui.forWho)) hold(`${locale} forWho.${who}`, label, 6);
      for (const [o, label] of Object.entries(ui.occasions)) hold(`${locale} occasions.${o}`, label, 4);
      for (const [feel, label] of Object.entries(ui.feels)) hold(`${locale} feels.${feel}`, label, 1);
      for (const key of ["notSure", "moreOccasions", "anyOccasion", "resultTitle", "resultTitleMore", "whyThis", "watch", "make", "more", "restart"] as const) hold(`${locale} ui.${key}`, ui[key], 4);
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

  it("stop counting the gifts once there are more than three, and name a best friend one way in Spanish", () => {
    // "Three gifts that fit" stood over six, nine or all thirty-seven after "Show three more".
    expect(FINDER_COPY.en.ui.resultTitle).toMatch(/^Three /);
    expect(FINDER_COPY.en.ui.resultTitleMore).toBe("Gifts that fit");
    expect(FINDER_COPY.es.ui.resultTitleMore).toBe("Regalos que encajan");
    for (const locale of ["en", "es"] as const) expect(FINDER_COPY[locale].ui.resultTitleMore, locale).not.toMatch(/three|tres|\d/i);
    // The foot row said "Para tu mejor amiga" under an answer card that says "Mi mejor amiga o amigo";
    // since walk-choose-6 the finder, the page's title, its h1 and the menu all say "amigo o amiga".
    expect(Object.keys(FINDER_COPY.es.byWho.people)).toEqual([...RECIPIENTS]);
    expect(FINDER_COPY.es.byWho.people["best-friend"]).toBe("Para tu mejor amigo o amiga");
    expect(FINDER_COPY.es.ui.people["best-friend"]).toBe("Mi mejor amigo o amiga");
    expect(FINDER_COPY.es.ui.forWho["best-friend"]).toBe("Para mi mejor amigo o amiga");
    expect(RECIPIENT_GUIDES["best-friend"].es.title).toBe("Regalos digitales para tu mejor amigo o amiga");
    expect(RECIPIENT_GUIDES["best-friend"].es.h1).toBe("Regalos digitales para tu mejor amigo o amiga");
    expect(RECIPIENT_GUIDES["best-friend"].es.label).toBe("Para tu mejor amigo o amiga");
  });

  it("call an occasion what the gallery's tile calls it (walk-choose-6), and say at the end that the list is every gift", () => {
    for (const locale of ["en", "es"] as const) {
      const tiles = (locale === "en" ? en : es).occasions as Record<string, string>;
      for (const [occasion, name] of Object.entries(FINDER_COPY[locale].ui.occasions)) expect(name, `${locale} ${occasion}`).toBe(tiles[occasion]);
    }
    expect(FINDER_COPY.en.ui.end).toBe("Those are all the gifts for these two answers.");
    expect(FINDER_COPY.es.ui.end).toBe("Esos son todos los regalos para estas dos respuestas.");
  });

  it("are in one English: American, as “mom” is", () => {
    // The pill said "For my mom" over "Her favourite flowers… in her colours" and "the lift at 2am"
    // (an elevator, to anyone who says mom). Every sentence, line and label of the finder is held to it.
    const british = /colour|favourite|\bgrey\b|\bmum\b|kilometre|centre\b|recognise|organise|\bloft\b|\bposted\b|in-jokes?\b|\bsweets\b|every sweet\b|\bticked\b|\bpegs?\b|blackboard|car journeys|the lift at/i;
    const english: string[] = [JSON.stringify(FINDER_COPY.en)];
    for (const fit of Object.values(FINDER_FITS)) for (const words of Object.values(fit.why)) english.push(words!.en);
    for (const keys of Object.values(FINDER_SHORT)) for (const words of Object.values(keys)) if (words!.en) english.push(words!.en);
    for (const text of english) expect(text.match(british)?.[0], text.slice(0, 80)).toBeUndefined();
    expect(FINDER_FITS["the-letter"].why.mom!.en).toContain("the ride home at 2am");
  });

  it("say in Spanish who does what: what the person who gets it does is never spelled like an order to the sender", () => {
    // "Sopla al móvil para apagar las velas" is word for word "Blow on the phone…": in Spanish the
    // third person with no subject is the same word as an order, and it stood beside real orders to
    // the sender ("Elige…", "Escribe…"). What the recipient does now has a subject ("Ella rompe el
    // sello", "quien lo recibe"), or the thing is the subject ("Las velas se apagan soplando").
    const theirs = /^(?:Rompe|Sopla|Agita|Aparta|Limpia|Tira|Desata|Desenvuelve|Levanta|Gira|Baja|Da|Rasca|Explota|Grita|Llama|Empuja|Enciende|Lleva|Pasa|Inclina|Mantiene|Explora|Toca|Abre|Va|Ve|Hace|Lo|Le) /;
    const starts = (text: string) => text.split(/(?<=[.;:])\s+/).filter((sentence) => theirs.test(sentence));
    const off: string[] = [];
    for (const [slug, fit] of Object.entries(FINDER_FITS)) for (const [key, words] of Object.entries(fit.why)) for (const sentence of starts(words!.es)) off.push(`${slug}.${key}: ${sentence}`);
    for (const [slug, keys] of Object.entries(FINDER_SHORT)) for (const [key, words] of Object.entries(keys)) for (const sentence of starts(words!.es ?? "")) off.push(`${slug}.${key} (line): ${sentence}`);
    // "Lo más parecido a la tarjeta…" opens on an article, not on what somebody does.
    expect(off.filter((entry) => !/: Lo más /.test(entry))).toEqual([]);
    // The phrases the review quoted are gone.
    const spanish = JSON.stringify({ fits: Object.values(FINDER_FITS).map((fit) => Object.values(fit.why).map((words) => words!.es)), FINDER_SHORT, copy: FINDER_COPY.es });
    expect(spanish).not.toMatch(/mejores peores caras|a la que vuela|que se echa inclinando|Las tuyas entran|Toca para quién/);
  });

  it("never mention Spain, and never shout", () => {
    const all = JSON.stringify({ FINDER_COPY, FINDER_FITS });
    expect(all).not.toMatch(/Spain|España|Madrid|Barcelona|Sevilla|Valencia/i);
    expect(JSON.stringify(FINDER_COPY)).not.toMatch(/[!¡—]/);
  });
});

describe("the price under a pick", () => {
  const CURRENCIES: Currency[] = ["usd", "eur", "gbp"];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the gallery card's and the gift's own page's, for every template in every currency, whichever way the site's switch is set", () => {
    // The review of 22 Nov 2026: the finder printed the price of one template under every pick that
    // was not free. Constellations has no free version on the live site (the short note is for
    // everyone, NEXT_PUBLIC_FREE_NOTE_SHARE=1) and sells at "Make it special": €7.49 on its card
    // and its page, €9.99 in the finder, on the second pick for a girlfriend at an anniversary.
    for (const share of ["", "0.5", "1"]) {
      vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", share);
      for (const pick of finderPicks("en")) {
        const manifest = getManifest(pick.slug)!;
        const where = `${pick.slug} with the note share at “${share}”`;
        // "Free" exactly when the gallery says so, and otherwise the product the gallery's card prices it as.
        expect(pick.free, where).toBe(sendsFree(manifest));
        expect(pick.product, where).toBe(templateProduct(manifest.tier));
        for (const currency of CURRENCIES) {
          // What the finder prints (components/templates/gift-finder.tsx): nothing for a free gift, else its own product's price.
          const shown = pick.free ? 0 : PRODUCTS[pick.product].amounts[currency];
          // What the gift's own page shows and tells search engines (lib/seo.ts).
          expect(shown, `${where} in ${currency}`).toBe(templateOfferAmount(manifest, currency));
        }
      }
    }
  });

  it("is “Make it special” for Constellations once the short note is for everyone, and one template for a premium gift", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const live = new Map(finderPicks("en").map((pick) => [pick.slug, pick]));
    expect(live.get("constellations")).toMatchObject({ free: false, product: "extras" });
    expect(PRODUCTS[live.get("constellations")!.product].amounts).toEqual({ usd: 899, eur: 749, gbp: 649 });
    expect(live.get("the-letter")).toMatchObject({ free: true });
    expect(live.get("xoxo")).toMatchObject({ free: false, product: "single" });
    expect(PRODUCTS[live.get("xoxo")!.product].amounts).toEqual({ usd: 1199, eur: 999, gbp: 899 });
    // Exactly one pick is priced apart from the rest on the live site, and it is not hard-coded anywhere.
    expect([...live.values()].filter((pick) => !pick.free && pick.product === "extras").map((pick) => pick.slug)).toEqual(["constellations"]);
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    expect(finderPicks("en").find((pick) => pick.slug === "constellations")).toMatchObject({ free: true });
  });

  it("is read from one place by every page that prints a template's price", () => {
    // The cause: each page spelled out "a free template sells as its extras" for itself, and the finder's page did not.
    const read = (file: string) => fs.readFileSync(path.join(__dirname, "../../src", file), "utf8");
    const own = /tier === "free" \? "extras" : "single"/;
    for (const file of [
      "components/templates/template-card.tsx",
      "app/[currency]/[locale]/(marketing)/templates/[slug]/page.tsx",
      "app/[currency]/[locale]/(marketing)/try/[slug]/page.tsx",
      "lib/seo.ts",
      "content/finder.ts",
    ]) {
      expect(read(file), file).toMatch(/templateProduct\(/);
      expect(read(file), file).not.toMatch(own);
    }
    // The finder's page hands over both prices, and the tool prints the pick's own.
    expect(read("app/[currency]/[locale]/(marketing)/gifts/finder/page.tsx")).toMatch(/PRODUCTS\.single\.amounts\[currency\][\s\S]*PRODUCTS\.extras\.amounts\[currency\]/);
    expect(read("components/templates/gift-finder.tsx")).toMatch(/pick\.free \? freeLabel : prices\[pick\.product\]/);
    expect(templateProduct("free")).toBe("extras");
    expect(templateProduct("premium")).toBe("single");
  });
});
