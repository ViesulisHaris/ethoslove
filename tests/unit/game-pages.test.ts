import { describe, expect, it } from "vitest";
import { GAME_PAGES, TODAY_FAQ } from "@/content/game-pages";
import { getPost, postLocales } from "@/content/blog";
import { GAMES } from "@/lib/games/catalogue";
import { CHORES, DARE_ROUND, DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { DRAW_ROUNDS, DRAW_WORDS } from "@/lib/games/draw";
import { MEMORY_PAIRS } from "@/lib/games/memory";
import { KNOW_ROUNDS, RATHER_ROUNDS } from "@/lib/games/play";
import { DECK_ROUND } from "@/lib/games/questions";
import { PACK_IDS, PACKS } from "@/lib/games/packs";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { fillerIn } from "./filler";

const LOCALES = ["en", "es"] as const;
const text = (key: keyof typeof GAME_PAGES, l: "en" | "es") => [...(GAME_PAGES[key].how?.[l] ?? []), ...GAME_PAGES[key].faq.flatMap((f) => [f.q[l], f.a[l]])].join(" ");
const numbers = (s: string) => [...s.matchAll(/\b\d+\b/g)].map((m) => Number(m[0]));

describe("what every game's page says", () => {
  it("G1: every game has a page, with two to four questions in both languages", () => {
    for (const g of GAMES) {
      const page = GAME_PAGES[g.key];
      expect(page, g.key).toBeDefined();
      expect(page.faq.length, g.key).toBeGreaterThanOrEqual(2);
      expect(page.faq.length, g.key).toBeLessThanOrEqual(4);
      for (const f of page.faq) for (const l of LOCALES) expect(f.q[l].trim() && f.a[l].trim(), `${g.key} ${f.q.en}`).toBeTruthy();
    }
    expect(TODAY_FAQ.length).toBeGreaterThanOrEqual(2);
    expect(TODAY_FAQ.length).toBeLessThanOrEqual(4);
  });

  it("G2: the three pages that said nothing say how to play, in three or four lines, the same count in both languages", () => {
    for (const key of ["draw", "memory", "roulette"] as const) {
      const how = GAME_PAGES[key].how!;
      expect(how.en.length, key).toBeGreaterThanOrEqual(3);
      expect(how.en.length, key).toBeLessThanOrEqual(4);
      expect(how.es.length, key).toBe(how.en.length);
    }
    // The four with a list of questions already have a word of how; they get no second one.
    for (const key of ["know", "rather", "deck", "dare"] as const) expect(GAME_PAGES[key].how, key).toBeUndefined();
  });

  it("G3: every number in the words is one of the game's own", () => {
    const allowed: Record<keyof typeof GAME_PAGES, number[]> = {
      know: [KNOW_ROUNDS, KNOW_QUESTIONS.length],
      rather: [RATHER_ROUNDS, RATHER_PAIRS.length],
      draw: [DRAW_ROUNDS, DRAW_ROUNDS / 2, DRAW_WORDS.length],
      memory: [MEMORY_PAIRS, MEMORY_PAIRS * 2],
      deck: [DECK_ROUND],
      dare: [DARE_ROUND, TRUTHS.length, DARES.length],
      roulette: [CHORES.length],
    };
    expect(TRUTHS.length).toBe(DARES.length);
    for (const g of GAMES)
      for (const l of LOCALES) {
        const found = numbers(text(g.key, l));
        for (const n of found) expect(allowed[g.key], `${g.key} ${l}: ${n}`).toContain(n);
      }
    // And the ones that matter are said.
    expect(numbers(text("know", "en"))).toEqual(expect.arrayContaining([KNOW_ROUNDS, KNOW_QUESTIONS.length]));
    expect(numbers(text("rather", "en"))).toEqual(expect.arrayContaining([RATHER_ROUNDS, RATHER_PAIRS.length]));
    expect(numbers(text("draw", "en"))).toEqual(expect.arrayContaining([DRAW_ROUNDS, DRAW_WORDS.length]));
    expect(numbers(text("memory", "en"))).toEqual(expect.arrayContaining([MEMORY_PAIRS, MEMORY_PAIRS * 2]));
    expect(numbers(text("dare", "es"))).toEqual(expect.arrayContaining([DARE_ROUND, TRUTHS.length]));
    expect(numbers(text("roulette", "es"))).toEqual(expect.arrayContaining([CHORES.length]));
  });

  it("G4: the roulette's chores are the wheel's own, all of them", () => {
    const answer = GAME_PAGES.roulette.faq[0].a;
    for (const chore of CHORES) {
      expect(answer.en, chore.en).toContain(chore.en);
      expect(answer.es, chore.es).toContain(chore.es);
    }
  });

  it("G5: every post named exists, at most two a game", () => {
    for (const g of GAMES) {
      expect(GAME_PAGES[g.key].posts.length, g.key).toBeLessThanOrEqual(2);
      for (const slug of GAME_PAGES[g.key].posts) {
        const post = getPost(slug);
        expect(post, `${g.key}: ${slug}`).not.toBeNull();
        expect(postLocales(post!)).toContain("en");
      }
    }
  });

  it("G6: no filler, no exclamation marks, no em dashes", () => {
    for (const g of GAMES)
      for (const l of LOCALES) {
        const words = text(g.key, l);
        expect(fillerIn(words, l), g.key).toEqual([]);
        expect(words, g.key).not.toMatch(/[!—]/);
      }
  });

  it("G8: the hub's tiers are true of the packs, and today's question does not count itself twice", () => {
    // "More cards for two or three of the games": every pack deals into two or three.
    for (const id of PACK_IDS) {
      expect(PACKS[id].games.length, id).toBeGreaterThanOrEqual(2);
      expect(PACKS[id].games.length, id).toBeLessThanOrEqual(3);
    }
    expect(en.games.hub.tiers.pack.line).toContain("two or three");
    expect(es.games.hub.tiers.pack.line).toContain("dos o tres");
    // The free line names the count, which the page fills from GAMES.
    for (const m of [en, es]) expect(m.games.hub.tiers.free.line).toContain("{count}");
    // Today's pair is one of the list: "{count} more" would count it twice.
    expect(en.games.today.more.heading).not.toMatch(/\bmore\b/);
    expect(es.games.today.more.heading).not.toMatch(/\bmás\b/);
    // The packs' own line no longer says the price and Ethos for Two a second time under the tiers.
    for (const m of [en, es]) expect((m.packs.hub as Record<string, string>).sub).toBeUndefined();
  });

  it("G9: the soft dares are described by what the deck holds, and the dare game's end by both of its ends", () => {
    const soft = GAME_PAGES.dare.faq[0].a.en;
    expect(soft).not.toMatch(/mostly|compliments|regret/i);
    // Each thing the answer names, and the dare it comes from.
    const named: [RegExp, RegExp][] = [
      [/speeches/i, /speech/i],
      [/impressions/i, /impression/i],
      [/a slow dance/i, /slow dance/i],
      [/a kiss on the hand/i, /kiss my hand/i],
    ];
    for (const [said, dare] of named) {
      expect(soft).toMatch(said);
      expect(DARES.some((d) => dare.test(d.en)), dare.source).toBe(true);
    }
    expect(GAME_PAGES.dare.faq[1].a.en).toContain("both piles run out");
  });

  it("G7: nothing names a place in Spain", () => {
    const all = JSON.stringify({ GAME_PAGES, TODAY_FAQ });
    expect(all).not.toMatch(/Spain|España|Madrid|Barcelona|Valencia|Sevilla|Seville/);
  });
});
