import { describe, expect, it } from "vitest";
import { LANGUAGE_GIFTS, LOVE_QUIZ, LOVE_QUIZ_READING, QUESTIONS } from "@/content/love-language-quiz";
import { getPost } from "@/content/blog";
import {
  LANGUAGES,
  NAME_MAX,
  PER_LANGUAGE,
  QUIZ_LENGTH,
  cleanName,
  decodeScores,
  emptyScores,
  encodeScores,
  linkHash,
  lowest,
  ranked,
  readLink,
  score,
  shares,
  tops,
  type Answer,
  type Pair,
  type Scores,
} from "@/lib/love-quiz/score";
import { getManifest } from "@/templates/manifests";

const pairs: Pair[] = QUESTIONS.map((q) => [q.a.lang, q.b.lang]);
const key = (p: Pair) => [...p].sort().join("+");
const scores = (words: number, time: number, gifts: number, service: number, touch: number): Scores => ({ words, time, gifts, service, touch });

/** The quiz is fair only if every language is on offer as often, against each other as often, and on top as often. */
describe("love language quiz: the questions", () => {
  it("has thirty, each between two different languages", () => {
    expect(QUESTIONS.length).toBe(QUIZ_LENGTH);
    for (const [a, b] of pairs) expect(a).not.toBe(b);
  });

  it("puts every pair of languages up three times, and each language twelve times", () => {
    const byPair = new Map<string, number>();
    for (const p of pairs) byPair.set(key(p), (byPair.get(key(p)) ?? 0) + 1);
    expect(byPair.size).toBe(10);
    for (const n of byPair.values()) expect(n).toBe(3);
    for (const l of LANGUAGES) expect(pairs.flat().filter((x) => x === l).length).toBe(PER_LANGUAGE);
  });

  it("shows each language first as often as second, and never the same pair twice in a row", () => {
    for (const l of LANGUAGES) expect(pairs.filter((p) => p[0] === l).length, l).toBe(PER_LANGUAGE / 2);
    for (let i = 1; i < pairs.length; i++) expect(key(pairs[i]!), `questions ${i} and ${i + 1}`).not.toBe(key(pairs[i - 1]!));
  });

  it("never repeats a prompt or an option within a language", () => {
    for (const l of ["en", "es"] as const) {
      const texts = QUESTIONS.flatMap((q) => [q.prompt[l], q.a[l], q.b[l]].map((t) => t.toLowerCase()));
      const options = QUESTIONS.flatMap((q) => [q.a[l], q.b[l]]);
      expect(new Set(options).size, l).toBe(options.length);
      for (const t of texts) expect(t.trim().length, t).toBeGreaterThan(5);
    }
  });
});

describe("love language quiz: scoring", () => {
  it("counts each pick for the language it stands for", () => {
    const allFirst: Answer[] = Array(QUIZ_LENGTH).fill(0);
    const s = score(allFirst, pairs);
    for (const l of LANGUAGES) expect(s[l]).toBe(PER_LANGUAGE / 2);
    const partial = score([1, null, 0], pairs);
    expect(Object.values(partial).reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("can give one language every one of its twelve", () => {
    const allWords: Answer[] = pairs.map(([a]) => (a === "words" ? 0 : 1));
    const s = score(
      allWords.map((x, i) => (pairs[i]!.includes("words") ? x : 0)),
      pairs,
    );
    expect(s.words).toBe(PER_LANGUAGE);
    expect(tops(s)).toEqual(["words"]);
  });

  it("ranks highest first, names ties, and finds the bottom", () => {
    const s = scores(9, 9, 4, 6, 2);
    expect(ranked(s)).toEqual(["words", "time", "service", "gifts", "touch"]);
    expect(tops(s)).toEqual(["words", "time"]);
    expect(lowest(s)).toEqual(["touch"]);
    expect(lowest(scores(6, 6, 6, 6, 6))).toEqual([...LANGUAGES]);
  });

  it("turns scores into whole percent that always add up to 100", () => {
    for (const s of [scores(9, 9, 4, 6, 2), scores(6, 6, 6, 6, 6), scores(12, 10, 5, 2, 1), scores(7, 7, 7, 7, 2)]) {
      const p = shares(s);
      expect(Object.values(p).reduce((a, b) => a + b, 0)).toBe(100);
      for (const l of LANGUAGES) expect(Math.abs(p[l] - (s[l] * 100) / QUIZ_LENGTH)).toBeLessThan(1);
    }
    expect(shares(emptyScores())).toEqual(emptyScores());
  });
});

describe("love language quiz: links", () => {
  it("carries a result in five characters and back", () => {
    const s = scores(12, 10, 5, 2, 1);
    expect(encodeScores(s)).toBe("ca521");
    expect(decodeScores("ca521")).toEqual(s);
    expect(decodeScores("CA521")).toEqual(s);
  });

  it("refuses anything a finished quiz couldn't produce", () => {
    for (const bad of [null, undefined, "", "ca52", "ca5211", "ca52z", "d0000", "66665", "cccc0", "6.6.6"]) expect(decodeScores(bad), String(bad)).toBeNull();
    expect(decodeScores("66666")).toEqual(scores(6, 6, 6, 6, 6));
  });

  it("keeps a first name short and printable", () => {
    expect(cleanName("  Sam  ")).toBe("Sam");
    expect(cleanName(`Sam\n<b>Alex</b>${String.fromCodePoint(0x202e)}`)).toBe("Sam <b>Alex</b>");
    expect(cleanName("A".repeat(60))).toHaveLength(NAME_MAX);
    expect(cleanName("👩‍❤️‍👨".repeat(30)).length).toBeGreaterThan(0);
    expect(cleanName(null)).toBe("");
  });

  it("round-trips one person, and both", () => {
    const a = { scores: scores(9, 9, 4, 6, 2), name: "Sam" };
    const b = { scores: scores(2, 4, 6, 9, 9), name: "Alex Q" };
    expect(readLink(linkHash(a))).toEqual({ a, b: null });
    expect(readLink(linkHash(a, b))).toEqual({ a, b });
    expect(readLink(linkHash({ ...a, name: "" }))).toEqual({ a: { ...a, name: "" }, b: null });
  });

  it("ignores a link without a valid first result", () => {
    expect(readLink("")).toEqual({ a: null, b: null });
    expect(readLink("#b=66666")).toEqual({ a: null, b: null });
    expect(readLink("#a=zzzzz&b=66666")).toEqual({ a: null, b: null });
    expect(readLink("#a=66666&b=nope").b).toBeNull();
  });
});

describe("love language quiz: the page", () => {
  const words = (x: string) => x.trim().split(/\s+/).length;
  const placeholders = (x: string) => [...x.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("says the same in both languages", () => {
    const [en, es] = [LOVE_QUIZ.en, LOVE_QUIZ.es];
    expect(es.faq.length).toBe(en.faq.length);
    expect(Object.keys(es.ui).sort()).toEqual(Object.keys(en.ui).sort());
    for (const k of Object.keys(en.ui) as (keyof typeof en.ui)[]) expect(placeholders(es.ui[k]), k).toEqual(placeholders(en.ui[k]));
    for (const l of LANGUAGES) expect(es.languages[l].lands.length, l).toBe(en.languages[l].lands.length);
    for (const g of [en, es]) {
      expect(g.title.length, g.title).toBeLessThanOrEqual(60);
      expect(g.description.length, g.description).toBeLessThanOrEqual(160);
      for (const f of g.faq) {
        expect(f.q.endsWith("?"), f.q).toBe(true);
        expect(words(f.a), f.q).toBeGreaterThanOrEqual(15);
      }
    }
    for (const f of es.faq) expect(/^(¿|[A-ZÁÉÍÓÚ])/.test(f.q), f.q).toBe(true);
  });

  it("is found by the searches it was made for", () => {
    expect(LOVE_QUIZ.en.title.toLowerCase()).toContain("love language quiz");
    expect(LOVE_QUIZ.en.title.toLowerCase()).toContain("test");
    expect(LOVE_QUIZ.es.title.toLowerCase()).toContain("test de los lenguajes del amor");
  });

  it("credits Gary Chapman's book and claims no tie to him", () => {
    for (const g of [LOVE_QUIZ.en, LOVE_QUIZ.es]) {
      expect(g.credit).toContain("Gary Chapman");
      expect(g.credit).toMatch(/1992/);
    }
    expect(LOVE_QUIZ.en.credit).toMatch(/isn't connected/);
    expect(LOVE_QUIZ.es.credit).toMatch(/no tiene relación/);
  });

  it("offers real templates, under their own names, and posts that exist", () => {
    for (const l of LANGUAGES) {
      const m = getManifest(LANGUAGE_GIFTS[l]);
      expect(m, LANGUAGE_GIFTS[l]).not.toBeNull();
      for (const loc of ["en", "es"] as const) expect(LOVE_QUIZ[loc].languages[l].gift.startsWith(`${m!.name[loc]}:`), `${l} ${loc}`).toBe(true);
    }
    for (const slug of LOVE_QUIZ_READING) expect(getPost(slug), slug).not.toBeNull();
  });
});
