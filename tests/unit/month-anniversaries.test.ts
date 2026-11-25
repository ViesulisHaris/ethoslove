import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { BLOG_POSTS, getPost, postLocales } from "@/content/blog";
import { isGiftGuide } from "@/content/gift-guides";
import { handLine, kindCardLine } from "@/content/idea-cards";
import { MONTHS, MONTH_GUIDES, monthBandPhoto, monthFromSlug, monthNeighbours, monthPost, monthRef, monthSlug } from "@/content/month-anniversaries";
import { pageUpdated } from "@/content/page-dates";
import { recipientFromSlug } from "@/content/recipients";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { DATE_KINDS } from "@/lib/dates/date-kinds";
import { fieldLimit } from "@/lib/gift/field-limit";
import { GIFT_LOCALES, type GiftLocale } from "@/lib/gift/schema";
import { pageMetadata } from "@/lib/seo";
import { getManifest } from "@/templates/manifests";
import { resolvePlace } from "@/templates/_shared/places";

/**
 * The anniversary gifts by month (content/month-anniversaries.ts), held to the limits, the fields
 * and the house rules of the gift pages by kind beside them (tests/unit/gift-guides.test.ts), and to
 * the brief's own rule: every month is written, none is a sentence with the number swapped.
 */

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.trim().split(/(?<=[.?!…])\s+/);

/** Every string under a value. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** The owner's rule: nothing on the site mentions Spain or its cities (tests/unit/cities.test.ts has the same list). */
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;
/** A price written by hand: a currency sign beside a number. Prices come from PRODUCTS, never from copy. */
const TYPED_PRICE = /[€$£]\s?\d|\d\s?[€$£]/;

/** The longest run of words two texts share, in words (as in tests/unit/gift-guides.test.ts). */
function sharedRun(a: string, b: string): number {
  const tokens = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const [x, y] = [tokens(a), tokens(b)];
  let best = 0;
  let row = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const next = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        next[j] = row[j - 1] + 1;
        if (next[j] > best) best = next[j];
      }
    }
    row = next;
  }
  return best;
}
const SHARED_RUN_MAX = 9;

/** A sentence with its month taken out: what is left must differ from every other month's. */
const NUMBER_WORDS = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty-\w+|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|diecisiete|dieciocho|diecinueve|veinte|veinti\w+|primer|primero|primera|segundo|segunda|tercer|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)\b/gi;
const unnumbered = (s: string) => s.toLowerCase().replace(NUMBER_WORDS, "#").replace(/\s+/g, " ").trim();

const all = () => MONTHS.flatMap((n) => GIFT_LOCALES.map((locale) => ({ n, locale, guide: MONTH_GUIDES[n][locale] })));

describe("anniversary gifts by month", () => {
  it("there are 24 months, 1 to 24", () => {
    expect([...MONTHS]).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });

  it("the months have addresses that are theirs alone", () => {
    for (const n of MONTHS) {
      expect(monthFromSlug(monthSlug(n)), String(n)).toBe(n);
      expect(isGiftGuide(monthSlug(n)), String(n)).toBe(false);
      expect(recipientFromSlug(monthSlug(n)), String(n)).toBeNull();
      expect(monthRef(n), String(n)).toMatch(REF_PATTERN);
    }
    for (const slug of ["0-month-anniversary", "25-month-anniversary", "03-month-anniversary", "3-month", "for-boyfriend", "last-minute"]) expect(monthFromSlug(slug), slug).toBeNull();
  });

  for (const { n, locale, guide } of all()) {
    const twin = MONTH_GUIDES[n][locale === "en" ? "es" : "en"];

    it(`month ${n} (${locale}) is a whole page`, () => {
      expect(guide.title.length, guide.title).toBeLessThanOrEqual(65);
      if (locale === "es") expect(`${guide.title} · Ethos`.length, guide.title).toBeLessThanOrEqual(60);
      expect(guide.description.length, guide.description).toBeLessThanOrEqual(160);
      if (locale === "en") expect(guide.h1).toBe(`${n} month anniversary gifts`);
      else {
        expect(guide.h1).toContain(`${n} mes`);
        expect(guide.h1).toContain("de novios");
      }
      expect(words(guide.hero.line), guide.hero.line).toBeLessThanOrEqual(16);
      expect(words(guide.hero.sentence), guide.hero.sentence).toBeLessThanOrEqual(30);
      for (const s of [guide.hero.line, guide.hero.sentence]) expect(s.trim(), s).toMatch(/[.?…]$/);
      expect(words(guide.ideasTitle), guide.ideasTitle).toBeLessThanOrEqual(9);
      expect(guide.stage).toHaveLength(2);
      for (const p of guide.stage) {
        expect(words(p), p.slice(0, 40)).toBeGreaterThanOrEqual(40);
        expect(words(p), p.slice(0, 40)).toBeLessThanOrEqual(90);
      }
      expect(words(guide.stage.join(" "))).toBeLessThanOrEqual(180);
      expect(guide.faq).toHaveLength(3);
      expect(twin.faq.length).toBe(guide.faq.length);
      for (const f of guide.faq) {
        expect(f.q.trim().endsWith("?"), f.q).toBe(true);
        if (locale === "es") expect(f.q.trim().startsWith("¿"), f.q).toBe(true);
        expect(words(f.a), f.q).toBeGreaterThanOrEqual(15);
      }
    });

    it(`month ${n} (${locale}) lists five or six gifts that can be made, each with a line that fits`, async () => {
      expect(guide.ideas.length).toBeGreaterThanOrEqual(5);
      expect(guide.ideas.length).toBeLessThanOrEqual(6);
      expect(twin.ideas.map((i) => i.template)).toEqual(guide.ideas.map((i) => i.template));
      expect(twin.ideas.map((i) => i.line.field)).toEqual(guide.ideas.map((i) => i.line.field));
      expect(new Set(guide.ideas.map((i) => i.template)).size).toBe(guide.ideas.length);
      for (const idea of guide.ideas) {
        const at = `${idea.template} (month ${n}, ${locale})`;
        expect(getManifest(idea.template), at).not.toBeNull();
        expect(words(idea.heading), at).toBeGreaterThanOrEqual(3);
        expect(words(idea.heading), at).toBeLessThanOrEqual(9);
        expect(words(idea.body), at).toBeGreaterThanOrEqual(40);
        expect(words(idea.body), at).toBeLessThanOrEqual(90);
        const line = kindCardLine(idea);
        expect(words(line), `${at}: “${line}”`).toBeGreaterThanOrEqual(6);
        expect(words(line), `${at}: “${line}”`).toBeLessThanOrEqual(18);
        const limit = await fieldLimit(idea.template, idea.line.field);
        expect(limit, `${at}: ${idea.line.field} is not a text field`).not.toBeNull();
        expect(idea.line.text.length, `${at}: “${idea.line.text}”`).toBeLessThanOrEqual(limit!);
        expect(words(idea.line.where), at).toBeGreaterThanOrEqual(2);
        expect(handLine(idea.line.text).trim(), at).not.toMatch(/[,;]$/);
      }
    });

    it(`month ${n} (${locale}) keeps to the house rules`, () => {
      for (const s of strings(guide)) {
        expect(s, s).not.toMatch(SPAIN);
        expect(s, s).not.toMatch(TYPED_PRICE);
        expect(s, s).not.toContain("—");
        expect(s, s).not.toContain("!");
        expect(s.toLowerCase(), s).not.toContain("digital gift card");
      }
      // The posts own the day ("ideas"); the page is the gift.
      expect(guide.h1.toLowerCase()).not.toMatch(/\bideas\b/);
      expect(guide.title.toLowerCase()).not.toMatch(/\bideas\b/);
    });

    it(`month ${n} (${locale}) says free only of The Letter's short note`, () => {
      const free = locale === "en" ? /\bfree\b/i : /\bgratis\b|gratuit/i;
      for (const idea of guide.ideas) {
        const said = [idea.heading, idea.brief ?? "", idea.body].some((s) => free.test(s));
        if (said) expect(idea.template === "the-letter" && idea.line.field === "freeNote", `${idea.template} (month ${n}, ${locale})`).toBe(true);
        if (idea.template === "constellations") for (const s of strings(idea)) expect(s, s).not.toMatch(free);
      }
    });

    it(`month ${n} (${locale}) promises a song, a clip, a countdown or a hidden surprise only on a gift that draws one`, () => {
      for (const idea of guide.ideas) {
        const m = getManifest(idea.template)!;
        const own = [idea.heading, idea.brief ?? "", idea.body].join(" ");
        const at = `${idea.template} (month ${n}, ${locale})`;
        if (!m.features.music) expect(own, at).not.toMatch(locale === "en" ? /\bsongs?\b/i : /\bcanci(ón|ones)\b/i);
        if (!m.features.video) expect(own, at).not.toMatch(locale === "en" ? /\b(video|clip)s?\b/i : /\bv[ií]deos?\b|\bclips?\b/i);
        if (idea.template === "unwrapped") expect(own, at).not.toMatch(/countdown|cuenta atrás/i);
        if (idea.template === "unwrapped" || idea.template === "pack-your-bags") expect(own, at).not.toMatch(/hidden surprise|sorpresa final|sorpresa oculta/i);
      }
    });

    it(`month ${n} (${locale}) lends lines the gift will really show`, () => {
      for (const idea of guide.ideas) {
        const at = `${idea.template} (month ${n}, ${locale})`;
        // Passport drops a stopover it cannot find on its map (passport/Template.tsx, resolvePlace).
        if (idea.template === "passport" && idea.line.field === "stops") expect(resolvePlace(idea.line.text), `${at}: “${idea.line.text}”`).not.toBeNull();
        // Digicam wishes a happy birthday unless the box is unticked (digicam/schema.ts, birthday defaults to true).
        if (idea.template === "digicam") expect(idea.body, at).toMatch(locale === "en" ? /It’s their birthday/ : /Es su cumpleaños/);
        // A line printed on every card or plaque cannot carry one card's month (scratch-card foilText, museum years).
        if (["foilText", "years", "stampDate"].includes(idea.line.field)) expect(idea.line.text, at).not.toMatch(/\b(month|mes) (\d+|three|tres|nine|nueve)\b(?! ?(–|to|a) )/i);
      }
    });

    it(`month ${n} (${locale}): the date idea leads to a kind page of the Dates room that exists`, () => {
      expect(DATE_KINDS, guide.date.kind).toContain(guide.date.kind);
      expect(guide.date.kind).not.toBe("winter");
      expect(twin.date.kind).toBe(guide.date.kind);
      expect(words(guide.date.title), guide.date.title).toBeLessThanOrEqual(9);
      expect(words(guide.date.line), guide.date.line).toBeLessThanOrEqual(14);
      expect(sentences(guide.date.line), guide.date.line).toHaveLength(1);
    });
  }

  it("the gift in a month's phone has a film, and no two months open on the same gift", () => {
    const first = MONTHS.map((n) => MONTH_GUIDES[n].en.ideas[0].template);
    for (const slug of first) expect(getManifest(slug)?.thumbnail.webm, slug).toBeTruthy();
    expect(new Set(first).size).toBe(first.length);
  });

  it("the gifts a month shows in its phone and its band don't name another length of time or another occasion", () => {
    // The phone plays the month's first gift (and the "Other months" row shows that gift's poster on the months either
    // side); the band shows its second. Both come with their own poster and demo, and these say something else in them.
    const sayOther: Record<string, string> = {
      "the-letter": "Three years of you",
      "our-timeline": "Three years, in order",
      digicam: "HAPPY BIRTHDAY",
      "paper-crane": "an apology: I wanted to win the argument more than I wanted to be kind",
      "recipe-box": "a recipe card from Nora to Mum",
      "front-page": "LOCAL WOMAN TURNS 30",
    };
    for (const n of MONTHS) for (const idea of MONTH_GUIDES[n].en.ideas.slice(0, 2)) expect(sayOther[idea.template], `month ${n}: ${idea.template}`).toBeUndefined();
  });

  it("no two months open the same way", () => {
    const clashes: string[] = [];
    for (const locale of GIFT_LOCALES) {
      const parts = (n: number) => {
        const g = MONTH_GUIDES[n][locale];
        return { "hero line": g.hero.line, "hero sentence": g.hero.sentence, "ideas title": g.ideasTitle, "date title": g.date.title, "opening of the stage": sentences(g.stage[0])[0] };
      };
      for (let i = 0; i < MONTHS.length; i++) {
        for (let j = i + 1; j < MONTHS.length; j++) {
          const [a, b] = [MONTHS[i], MONTHS[j]];
          const [pa, pb] = [parts(a), parts(b)];
          for (const key of Object.keys(pa) as (keyof typeof pa)[]) if (unnumbered(pa[key]) === unnumbered(pb[key])) clashes.push(`${locale}: months ${a} and ${b} share the ${key}`);
          const [ga, gb] = [MONTH_GUIDES[a][locale], MONTH_GUIDES[b][locale]];
          for (const [name, x, y] of [["hero sentence", ga.hero.sentence, gb.hero.sentence], ["stage", ga.stage[0], gb.stage[0]], ["stage", ga.stage[1], gb.stage[1]]] as const) {
            const run = sharedRun(x, y);
            if (run > SHARED_RUN_MAX) clashes.push(`${locale}: months ${a} and ${b} share ${run} words in a row in the ${name}`);
          }
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("the months are not one frame filled in 24 times", () => {
    const problems: string[] = [];
    const firstWords = (s: string, k: number) => unnumbered(s).replace(/[^\p{L}#\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, k).join(" ");
    for (const locale of GIFT_LOCALES) {
      const guides = MONTHS.map((n) => ({ n, g: MONTH_GUIDES[n][locale] }));
      // The second paragraph of the stage (too much, too little) opens its own way every month.
      const openings = new Map<string, number[]>();
      for (const { n, g } of guides) openings.set(firstWords(g.stage[1], 3), [...(openings.get(firstWords(g.stage[1], 3)) ?? []), n]);
      for (const [opening, ns] of openings) if (ns.length > 1) problems.push(`${locale}: the stage's second paragraph opens “${opening}” in months ${ns.join(", ")}`);
      // The descriptions don't all say "Five digital gifts, each with a line to borrow".
      const kinds = guides.filter(({ g }) => (locale === "en" ? /digital gifts/i : /regalos digitales/i).test(g.description)).length;
      const borrow = guides.filter(({ g }) => (locale === "en" ? /lines? (to|you can) borrow/i : /frases? listas?/i).test(g.description)).length;
      if (kinds > 8) problems.push(`${locale}: ${kinds} descriptions say “digital gifts”`);
      if (borrow > 6) problems.push(`${locale}: ${borrow} descriptions promise lines to borrow`);
      for (const { n, g } of guides) {
        // Down one list, at most two bodies open on the gift's own name ("Photo Booth gives…"), and "at N months" is said once at most.
        const named = g.ideas.filter((i) => i.body.toLowerCase().startsWith(getManifest(i.template)!.name[locale].toLowerCase())).length;
        if (named > 2) problems.push(`${locale}: month ${n} opens ${named} bodies on the gift's name`);
        const atMonths = g.ideas.filter((i) => (locale === "en" ? /\b(at|by) [\w-]+ months\b/i : /\ba los [\wé]+ meses\b/i).test(i.body)).length;
        if (atMonths > 1) problems.push(`${locale}: month ${n} says “at N months” in ${atMonths} bodies`);
      }
      // Stock phrases, counted over the whole series.
      const all = guides.map(({ g }) => strings(g).join(" ")).join(" ");
      const caps: [RegExp, number][] = locale === "en"
        ? [[/\bmany couples\b/gi, 4], [/\bmost couples\b/gi, 4], [/\bordinary\b/gi, 6], [/\blands?\b|\blanding\b/gi, 4], [/\breads as\b/gi, 4], [/\bspecific beats\b/gi, 1]]
        : [[/\bmuchas parejas\b/gi, 4], [/\bcasi todas las parejas\b/gi, 4], [/\bDemasiado poco\b/g, 4], [/\bDemasiado a los\b/g, 4], [/\badmite [\wé]+ caracteres\b/gi, 10], [/\ba estas alturas\b/gi, 5], [/\bcuenta hacia (?!atrás)/gi, 0], [/\bse lee como\b/gi, 3], [/\bvíspera\b/gi, 0]];
      // The tics the deep test counted after the rewrite (gifts2-D7): "lands" said of a feeling, "still" in every other line
      // to borrow, coffee as the detail of choice.
      if (locale === "en") {
        caps.push([/\bstill\b/gi, 30], [/\b(coffee|tea)s?\b/gi, 8]);
        const lines = guides.flatMap(({ g }) => g.ideas.map((i) => i.line.text));
        const stillLines = lines.filter((t) => /\bstill\b/i.test(t)).length;
        if (stillLines > 6) problems.push(`en: ${stillLines} lines to borrow say “still”`);
      }
      if (locale === "en") caps.push([/\bToo little\b/g, 4], [/\bToo much at\b/g, 4]);
      for (const [re, max] of caps) {
        const count = all.match(re)?.length ?? 0;
        if (count > max) problems.push(`${locale}: “${re.source}” ${count} times (at most ${max})`);
      }
      // No two months answer a question in the same words.
      const answers = guides.flatMap(({ n, g }) => g.faq.map((f) => ({ n, a: f.a })));
      for (let i = 0; i < answers.length; i++) for (let j = i + 1; j < answers.length; j++) {
        if (answers[i].n === answers[j].n) continue;
        const run = sharedRun(answers[i].a, answers[j].a);
        if (run > 12) problems.push(`${locale}: months ${answers[i].n} and ${answers[j].n} answer in the same ${run} words`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("no two months have the same first three gifts", () => {
    const firsts = MONTHS.map((n) => MONTH_GUIDES[n].en.ideas.slice(0, 3).map((i) => i.template).sort().join("+"));
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it("no gift is leaned on", () => {
    const uses = new Map<string, number>();
    for (const n of MONTHS) for (const idea of MONTH_GUIDES[n].en.ideas) uses.set(idea.template, (uses.get(idea.template) ?? 0) + 1);
    for (const [slug, count] of uses) expect(count, slug).toBeLessThanOrEqual(6);
    if (MONTHS.length === 24) expect(uses.size).toBeGreaterThanOrEqual(20);
  });

  it("a gift is described afresh on every month that lists it", () => {
    const reused: string[] = [];
    for (const locale of GIFT_LOCALES) {
      const bodies = new Map<string, { n: number; body: string }[]>();
      for (const n of MONTHS) for (const idea of MONTH_GUIDES[n][locale].ideas) bodies.set(idea.template, [...(bodies.get(idea.template) ?? []), { n, body: idea.body }]);
      for (const [template, uses] of bodies) {
        for (let i = 0; i < uses.length; i++) {
          for (let j = i + 1; j < uses.length; j++) {
            const run = sharedRun(uses[i].body, uses[j].body);
            if (run > SHARED_RUN_MAX) reused.push(`${template} (${locale}): months ${uses[i].n} and ${uses[j].n} share ${run} words in a row`);
          }
        }
      }
    }
    expect(reused).toEqual([]);
  });

  it("say what they mean: an eve is the day before, and halfway to two years is one", () => {
    for (const n of MONTHS) {
      expect(strings(MONTH_GUIDES[n].en).join(" "), String(n)).not.toMatch(/\beve of\b|\bhalfway to two years\b/i);
      expect(strings(MONTH_GUIDES[n].es).join(" "), String(n)).not.toMatch(/\bvíspera\b|\bson pocos para que\b/i);
    }
  });

  it("the questions are the month's own", () => {
    for (const locale of GIFT_LOCALES) {
      const asked = MONTHS.flatMap((n) => MONTH_GUIDES[n][locale].faq.map((f) => f.q.trim().toLowerCase()));
      expect(asked.filter((q, i) => asked.indexOf(q) !== i), locale).toEqual([]);
    }
  });

  it("Spanish names the month the way it is also searched, «mesario», once, on the first month", () => {
    expect(strings(MONTH_GUIDES[1].es).join(" ")).toMatch(/\bmesario\b/);
    expect(MONTHS.filter((n) => /\bmesario\b/.test(strings(MONTH_GUIDES[n].es).join(" ")))).toEqual([1]);
  });

  it.skipIf(!MONTHS.includes(12) || !MONTHS.includes(24))("twelve months is paper and twenty-four is cotton, in both languages", () => {
    expect(strings(MONTH_GUIDES[12].en).join(" ")).toMatch(/paper/i);
    expect(strings(MONTH_GUIDES[12].es).join(" ")).toMatch(/papel/i);
    expect(strings(MONTH_GUIDES[24].en).join(" ")).toMatch(/cotton/i);
    expect(strings(MONTH_GUIDES[24].es).join(" ")).toMatch(/algodón/i);
  });

  it("the page is the gift and the post is the day", () => {
    for (const post of BLOG_POSTS) {
      for (const locale of postLocales(post)) {
        const content = post.content[locale]!;
        for (const n of MONTHS) {
          const guide = MONTH_GUIDES[n][locale];
          expect(guide.h1.toLowerCase(), `${post.slug} (${locale})`).not.toBe(content.keyword.toLowerCase());
          expect(guide.title, `${post.slug} (${locale})`).not.toBe(content.title);
        }
      }
    }
    for (const n of MONTHS) expect(getPost(monthPost(n)), String(n)).not.toBeNull();
    // And the posts link back, in each language they have.
    for (const [slug, month] of [["monthiversary-ideas", 1], ["6-month-anniversary-ideas", 6], ["first-anniversary-ideas-for-boyfriend", 12]] as const) {
      const post = getPost(slug)!;
      for (const locale of postLocales(post)) expect(strings(post.content[locale]).join(" "), `${slug} (${locale})`).toContain(`(/gifts/${monthSlug(month)})`);
    }
  });

  it("are in the sitemap in both languages with a date, sit beside the right months, and no two bands look alike", () => {
    const urls = sitemap().map((p) => new URL(p.url).pathname);
    const pairs = new Set<string>();
    for (const n of MONTHS) {
      const path = `/gifts/${monthSlug(n)}`;
      expect(urls, path).toContain(path);
      expect(urls, path).toContain(`/es${path}`);
      expect(pageUpdated(path), path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const locale of GIFT_LOCALES) {
        const guide = MONTH_GUIDES[n][locale as GiftLocale];
        const m = pageMetadata({ locale, path, title: guide.title, description: guide.description });
        const shown = typeof m.title === "string" ? `${m.title} · Ethos` : (m.title as { absolute: string }).absolute;
        expect(shown.length, shown).toBeLessThanOrEqual(70);
      }
      const near = monthNeighbours(n);
      expect(near, String(n)).not.toContain(n);
      expect(near.length).toBeLessThanOrEqual(4);
      for (const m of near) expect(MONTHS, String(m)).toContain(m);
      if (MONTHS.includes(n - 1)) expect(near, String(n)).toContain(n - 1);
      if (MONTHS.includes(n + 1)) expect(near, String(n)).toContain(n + 1);
      if (MONTHS.includes(n + 1)) expect(monthBandPhoto(n).src, String(n)).not.toBe(monthBandPhoto(n + 1).src);
      pairs.add(`${monthBandPhoto(n).src}+${MONTH_GUIDES[n].en.ideas[1].template}`);
    }
    expect(pairs.size).toBe(MONTHS.length);
  });
});
