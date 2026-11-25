import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WEEKLY_FAQ } from "@/content/game-pages";
import { DARES, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { DAILY_EPOCH, DAY_MS, dailyPair, dayIso, dayOf } from "@/lib/games/daily";
import { DECKS } from "@/lib/games/questions";
import { THIS_PAIRS } from "@/lib/games/this-or-that";
import { WEEKLY_EPOCH, WEEKLY_HASH_MAX, WEEKLY_MIRRORED, WEEKLY_SETS, decodeWeekly, encodeWeekly, picksFrom, picksText, sameCount, setById, weekOf, weekStart, weeklyAskGame, weeklyCards, weeklySentHere, weeklySet } from "@/lib/games/weekly";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { fillerIn } from "./filler";

const N = WEEKLY_SETS.length;
const LOCALES = ["en", "es"] as const;
const day = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => dayOf(Date.UTC(y, m - 1, d, h, min, s));
const words = (s: string) => s.trim().split(/\s+/).length;
/** Words only: no case, no punctuation, no accents of spacing. */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

describe("the week of the weekly challenge", () => {
  it("K1: the first week is the week of Monday 23 November 2026, the day today's question began", () => {
    expect(WEEKLY_EPOCH).toBe(2968);
    expect(weekStart(WEEKLY_EPOCH)).toBe(DAILY_EPOCH);
    expect(dayIso(weekStart(WEEKLY_EPOCH))).toBe("2026-11-23");
    expect(new Date(weekStart(WEEKLY_EPOCH) * DAY_MS).getUTCDay()).toBe(1);
  });

  it("K2: a week turns between Sunday 23:59:59 and Monday 00:00:00 UTC, and at no other moment", () => {
    expect(weekOf(day(2026, 11, 29, 23, 59, 59))).toBe(WEEKLY_EPOCH);
    expect(weekOf(day(2026, 11, 30, 0, 0, 0))).toBe(WEEKLY_EPOCH + 1);
    for (let d = 23; d <= 29; d++) expect(weekOf(day(2026, 11, d)), `${d} November`).toBe(WEEKLY_EPOCH);
  });

  it("K3: the last week of a year is one week across New Year, in a 53-week year too (2026, 2032)", () => {
    // The calendar's week 53 of 2026: Monday 28 December 2026 to Sunday 3 January 2027.
    const w = weekOf(day(2026, 12, 28));
    for (const [y, m, d] of [[2026, 12, 28], [2026, 12, 31], [2027, 1, 1], [2027, 1, 3]]) expect(weekOf(day(y, m, d)), `${y}-${m}-${d}`).toBe(w);
    expect(weekOf(day(2026, 12, 27))).toBe(w - 1);
    expect(weekOf(day(2027, 1, 4))).toBe(w + 1);
    // Three weeks in a row round the turn of the year are three different sets: none skipped, none twice.
    expect(new Set([weeklySet(w - 1).id, weeklySet(w).id, weeklySet(w + 1).id]).size).toBe(3);
    expect(WEEKLY_SETS.indexOf(weeklySet(w + 1))).toBe((WEEKLY_SETS.indexOf(weeklySet(w)) + 1) % N);
    // 2032 has 53 weeks as well: Monday 27 December 2032 to Sunday 2 January 2033.
    const v = weekOf(day(2032, 12, 27));
    expect(weekOf(day(2033, 1, 2))).toBe(v);
    expect(weekOf(day(2033, 1, 3))).toBe(v + 1);
    // And a 52-week turn: Monday 27 December 2027 to Sunday 2 January 2028.
    expect(weekOf(day(2028, 1, 2))).toBe(weekOf(day(2027, 12, 27)));
    expect(weekOf(day(2028, 1, 3))).toBe(weekOf(day(2027, 12, 27)) + 1);
  });

  it("K4: over ten years, day by day, the week goes up by one on every Monday and on no other day, and the set changes with it", () => {
    let last = weekOf(day(2026, 11, 23));
    let turns = 0;
    for (let d = day(2026, 11, 24); d < day(2036, 11, 24); d++) {
      const w = weekOf(d);
      const monday = new Date(d * DAY_MS).getUTCDay() === 1;
      expect(w, dayIso(d)).toBe(monday ? last + 1 : last);
      if (monday) {
        expect(weeklySet(w).id, dayIso(d)).not.toBe(weeklySet(last).id);
        turns++;
      }
      last = w;
    }
    expect(turns).toBe(521);
  });

  it("K5: days before the first Monday of 1970 count down, never towards zero", () => {
    expect([weekOf(0), weekOf(3), weekOf(4), weekOf(-3), weekOf(-4)]).toEqual([-1, -1, 0, -1, -2]);
  });

  it("K6: every set once in a round, in the list's own order, round after round; an empty list is refused", () => {
    for (const round of [0, 1, 5, -1]) {
      const ids = Array.from({ length: N }, (_, i) => weeklySet(WEEKLY_EPOCH + round * N + i).id);
      expect(ids).toEqual(WEEKLY_SETS.map((s) => s.id));
    }
    expect(weeklySet(WEEKLY_EPOCH - 1).id).toBe(WEEKLY_SETS[N - 1].id);
    expect(() => weeklySet(1, [])).toThrow();
  });

  it("K7: the server and the browser agree: the module reads no clock and no local time", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/games/weekly.ts"), "utf8");
    expect(source).not.toMatch(/Date\.now\(|new Date\(|\.get(Day|Date|Month|FullYear|Hours)\(|toLocale/);
  });
});

describe("the weekly sets", () => {
  it("S1: at least 26 sets, each with an id a link can carry and a theme in both languages, no theme twice", () => {
    expect(N).toBeGreaterThanOrEqual(26);
    expect(new Set(WEEKLY_SETS.map((s) => s.id)).size).toBe(N);
    for (const s of WEEKLY_SETS) {
      expect(s.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(setById(s.id)).toBe(s);
      for (const l of LOCALES) {
        expect(s.theme[l].trim(), s.id).not.toBe("");
        expect(s.theme[l].length, `${s.id} ${l}: "${s.theme[l]}"`).toBeLessThanOrEqual(20);
        expect(words(s.theme[l]), `${s.id} ${l}: "${s.theme[l]}"`).toBeLessThanOrEqual(4);
      }
    }
    for (const l of LOCALES) expect(new Set(WEEKLY_SETS.map((s) => s.theme[l])).size, l).toBe(N);
    expect(setById("nope")).toBeNull();
  });

  it("S2: every card is one of the games' own: three this-or-that pairs, a question card or a truth, and a dare", () => {
    for (const s of WEEKLY_SETS) {
      const cards = weeklyCards(s);
      expect(cards.picks).toHaveLength(3);
      for (const p of cards.picks) expect(THIS_PAIRS, s.id).toContain(p);
      const [deck] = s.ask;
      expect(deck === "truth" ? TRUTHS : DECKS[deck].cards, s.id).toContain(cards.ask);
      expect(DARES, s.id).toContain(cards.dare);
    }
    expect(() => weeklyCards({ ...WEEKLY_SETS[0], dare: "Not a dare of the deck." })).toThrow(/names a card/);
  });

  it("S3: no two sets share a card, and no set holds a card twice", () => {
    const seen = new Map<string, string>();
    const once = (key: string, set: string) => {
      expect(seen.get(key), `"${key}" is in ${seen.get(key)} and in ${set}`).toBeUndefined();
      seen.set(key, set);
    };
    for (const s of WEEKLY_SETS) {
      const cards = weeklyCards(s);
      for (const p of cards.picks) once(`pick ${p.id}`, s.id);
      once(`ask ${cards.ask.en}`, s.id);
      once(`dare ${cards.dare.en}`, s.id);
    }
    expect(seen.size).toBe(N * 5);
  });

  it("S4: no pair whose sides swap who is who, and that list names real pairs", () => {
    for (const id of WEEKLY_MIRRORED) expect(THIS_PAIRS.some((p) => p.id === id), id).toBe(true);
    for (const s of WEEKLY_SETS) for (const id of s.picks) expect(WEEKLY_MIRRORED, `${s.id}: ${id}`).not.toContain(id);
  });

  it("S5: every line fits its card, in both languages", () => {
    for (const s of WEEKLY_SETS) {
      const cards = weeklyCards(s);
      for (const l of LOCALES) {
        for (const p of cards.picks)
          for (const side of [p.a[l], p.b[l]]) {
            expect(side.length, `${s.id} ${l}: "${side}"`).toBeLessThanOrEqual(40);
            expect(words(side), `${s.id} ${l}: "${side}"`).toBeLessThanOrEqual(9);
          }
        for (const line of [cards.ask[l], cards.dare[l]]) {
          expect(line.length, `${s.id} ${l}: "${line}"`).toBeLessThanOrEqual(72);
          expect(words(line), `${s.id} ${l}: "${line}"`).toBeLessThanOrEqual(14);
        }
      }
    }
  });

  it("S6: nothing in a week's set is a question today's question asks that week, for ten years of weeks", () => {
    // No card of any set shares its words with any would-you-rather pair at all, which settles it for every week…
    const rather = new Set(RATHER_PAIRS.flatMap((p) => [p.a.en, p.b.en, p.a.es, p.b.es].map(norm)));
    for (const s of WEEKLY_SETS) {
      const cards = weeklyCards(s);
      for (const line of [...cards.picks.flatMap((p) => [p.a, p.b]), cards.ask, cards.dare]) for (const l of LOCALES) expect(rather.has(norm(line[l])), `${s.id}: "${line[l]}"`).toBe(false);
    }
    // …and week by week, against the seven pairs today's question shows in it.
    for (let w = WEEKLY_EPOCH; w < WEEKLY_EPOCH + 520; w++) {
      const cards = weeklyCards(weeklySet(w));
      const mine = new Set([...cards.picks.flatMap((p) => [p.a, p.b]), cards.ask, cards.dare].flatMap((line) => [norm(line.en), norm(line.es)]));
      for (let d = weekStart(w); d < weekStart(w) + 7; d++) {
        const pair = dailyPair(d);
        for (const side of [pair.a.en, pair.b.en, pair.a.es, pair.b.es]) expect(mine.has(norm(side)), `week ${w}, ${dayIso(d)}: "${side}"`).toBe(false);
      }
    }
  });

  it("S8: the question's picture is the game it comes from: a truth is truth or dare's, a deck's card the question cards'", () => {
    for (const s of WEEKLY_SETS) expect(weeklyAskGame(s), s.id).toBe(s.ask[0] === "truth" ? "dare" : "deck");
    expect(WEEKLY_SETS.some((s) => weeklyAskGame(s) === "dare")).toBe(true);
    const together = readFileSync(join(process.cwd(), "src/components/games/weekly/weekly-together.tsx"), "utf8");
    expect(together).toContain("<ShelfCard game={weeklyAskGame(set)}");
  });

  it("S7: the dares can be done outside a game, and nothing names a place in Spain", () => {
    for (const s of WEEKLY_SETS) expect(weeklyCards(s).dare.en, s.id).not.toMatch(/next turn|rest of the game/i);
    expect(JSON.stringify(WEEKLY_SETS)).not.toMatch(/Spain|España|Madrid|Barcelona|Valencia|Sevilla|Seville/);
  });
});

describe("the weekly challenge's link", () => {
  const A = { name: "Ana", picks: [0, 1, 0] as const };
  const B = { name: "Sam", picks: [1, 1, 0] as const };
  const W = WEEKLY_EPOCH + 3;
  const S = weeklySet(W);

  it("L1: a first link carries the week, the set, the name and three picks, and reads back the same", () => {
    const hash = encodeWeekly({ week: W, setId: S.id, from: A });
    expect(hash).toBe(`#w=1.${W}.${S.id}.Ana.010`);
    expect(decodeWeekly(hash, W)).toEqual({ week: W, set: S, from: { name: "Ana", picks: [0, 1, 0] } });
    expect(decodeWeekly(hash.slice(1), W)?.set.id).toBe(S.id);
  });

  it("L2: a reply carries both answers, so the reveal needs no memory", () => {
    const hash = encodeWeekly({ week: W, setId: S.id, from: B, to: A });
    expect(hash).toBe(`#w=1.${W}.${S.id}.Sam.110.Ana.010`);
    const link = decodeWeekly(hash, W)!;
    expect(link.from).toEqual({ name: "Sam", picks: [1, 1, 0] });
    expect(link.to).toEqual({ name: "Ana", picks: [0, 1, 0] });
    expect(sameCount(link.from.picks, link.to!.picks)).toBe(2);
    expect(sameCount([0, 0, 0], [1, 1, 1])).toBe(0);
    expect(sameCount([1, 0, 1], [1, 0, 1])).toBe(3);
  });

  it("L3: any name survives the trip, cut to 24 characters, and a link always ends on a digit", () => {
    for (const name of ["Ana María", "José.Luis", "a.b.c", "💛", "", "x".repeat(60), "<img src=x onerror=alert(1)>", "Zoë & Jo", "名前", "a=b", "  spaced   out  "]) {
      const hash = encodeWeekly({ week: W, setId: S.id, from: { name, picks: [1, 1, 1] } });
      const link = decodeWeekly(hash, W);
      expect(link, name).not.toBeNull();
      expect(Array.from(link!.from.name).length, name).toBeLessThanOrEqual(24);
      expect(hash, name).toMatch(/[01]$/);
      expect(hash.split(".").length, name).toBe(5);
    }
    const longest = encodeWeekly({ week: W, setId: S.id, from: { name: "💛".repeat(24), picks: [1, 1, 1] }, to: { name: "💛".repeat(24), picks: [0, 0, 0] } });
    expect(longest.length).toBeLessThanOrEqual(WEEKLY_HASH_MAX);
    expect(decodeWeekly(longest, W)).not.toBeNull();
  });

  it("L4: anything that is not a whole, sane link is refused", () => {
    const bad: unknown[] = [
      null,
      5,
      "",
      "#w=",
      "#q=1.20780.beach.Ana.1",
      `#w=2.${W}.${S.id}.Ana.010`,
      `#w=1.${W}.${S.id}.Ana.01`,
      `#w=1.${W}.${S.id}.Ana.0102`,
      `#w=1.${W}.${S.id}.Ana.012`,
      `#w=1.${W}.nope.Ana.010`,
      `#w=1.${W}.FILM-NIGHT.Ana.010`,
      `#w=1.${W}.${S.id}.Ana`,
      `#w=1.${W}.${S.id}.Ana.010.Sam`,
      `#w=1.${W}.${S.id}.Ana.010.Sam.01`,
      `#w=1.${W}.${S.id}.Ana.010.Sam.010.x`,
      `#w=1.${WEEKLY_EPOCH - 1}.${S.id}.Ana.010`,
      `#w=1.${W + 2}.${S.id}.Ana.010`,
      `#w=1.999999.${S.id}.Ana.010`,
      `#w=1.-1.${S.id}.Ana.010`,
      `#w=1.${W}.${S.id}.%E0%A4%A.010`,
      "#w=" + "1.".repeat(400),
    ];
    for (const hash of bad) expect(decodeWeekly(hash, W), String(hash)).toBeNull();
    // A clock a week behind must not refuse this week's link.
    expect(decodeWeekly(`#w=1.${W + 1}.${S.id}.Ana.010`, W)).not.toBeNull();
  });

  it("L5: a link from an earlier week opens the set it was sent with, with its own week", () => {
    const old = decodeWeekly(`#w=1.${W - 2}.${S.id}.Ana.010`, W)!;
    expect(old.week).toBe(W - 2);
    // The set is the one named in the link, not the one the list gives that week today.
    expect(old.set.id).toBe(S.id);
    expect(weeklySet(W - 2).id).not.toBe(S.id);
  });

  it("L6: a tab knows its own link, a first link and a reply apart", () => {
    const first = decodeWeekly(encodeWeekly({ week: W, setId: S.id, from: A }), W)!;
    const reply = decodeWeekly(encodeWeekly({ week: W, setId: S.id, from: B, to: A }), W)!;
    expect(weeklySentHere(first, { week: W, setId: S.id, name: "Ana", picks: "010" })).toBe(true);
    expect(weeklySentHere(first, { week: W, setId: S.id, name: " Ana ", picks: "010" })).toBe(true);
    expect(weeklySentHere(first, { week: W, setId: S.id, name: "Ana", picks: "011" })).toBe(false);
    expect(weeklySentHere(first, { week: W + 1, setId: S.id, name: "Ana", picks: "010" })).toBe(false);
    expect(weeklySentHere(first, { week: W, setId: S.id, name: "Ana", picks: "010", reply: true })).toBe(false);
    expect(weeklySentHere(reply, { week: W, setId: S.id, name: "Sam", picks: "110", reply: true })).toBe(true);
    expect(weeklySentHere(reply, { week: W, setId: S.id, name: "Sam", picks: "110" })).toBe(false);
    expect(weeklySentHere(first, null)).toBe(false);
  });

  it("L7: picks so far are none to three of 0 and 1, and nothing else", () => {
    expect(picksFrom("")).toEqual([]);
    expect(picksFrom("01")).toEqual([0, 1]);
    expect(picksFrom("101")).toEqual([1, 0, 1]);
    expect(picksFrom("01", 3)).toBeNull();
    for (const text of ["2", "0101", "a", undefined, null, 10, ["0"]]) expect(picksFrom(text), String(text)).toBeNull();
    expect(picksText([1, 0])).toBe("10");
    expect(picksText([])).toBe("");
  });
});

describe("the weekly challenge's words", () => {
  const texts = (l: "en" | "es") => [JSON.stringify((l === "en" ? en : es).games.weekly), ...WEEKLY_FAQ.flatMap((f) => [f.q[l], f.a[l]])].join(" ");

  it("C1: the page's title and description fit a search result, and each column's line is within fourteen words", () => {
    for (const m of [en, es]) {
      const w = m.games.weekly;
      expect(w.seoTitle.length).toBeLessThanOrEqual(60);
      expect(w.seoDescription.length).toBeGreaterThanOrEqual(110);
      expect(w.seoDescription.length).toBeLessThanOrEqual(160);
      for (const line of [w.line, w.together.line, w.more.line]) expect(words(line), line).toBeLessThanOrEqual(14);
    }
    expect(en.games.weekly.seoTitle).toMatch(/play over text/i);
  });

  it("C2: two to four questions under the challenge, in both languages, and they count the sets from the list", () => {
    expect(WEEKLY_FAQ.length).toBeGreaterThanOrEqual(2);
    expect(WEEKLY_FAQ.length).toBeLessThanOrEqual(4);
    for (const f of WEEKLY_FAQ) for (const l of LOCALES) expect(f.q[l].trim() && f.a[l].trim(), f.q.en).toBeTruthy();
    for (const l of LOCALES) expect(WEEKLY_FAQ[0].a[l], l).toContain("{count}");
    // No number is written by hand where the code has one: the only digits are "3" of the three picks.
    for (const l of LOCALES) expect(WEEKLY_FAQ.map((f) => f.a[l]).join(" "), l).not.toMatch(/\b(26|52)\b/);
  });

  it("C6: the questions under it say what the code does: how many games a set draws on, and what the browser keeps", () => {
    // A set whose question is a truth takes two of its cards from truth or dare: two games, not three (games2-C1).
    const games = (s: (typeof WEEKLY_SETS)[number]) => new Set(["thisthat", s.ask[0] === "truth" ? "dare" : "deck", "dare"]).size;
    const fewest = Math.min(...WEEKLY_SETS.map(games));
    for (const l of LOCALES) if (fewest < 3) expect(WEEKLY_FAQ[0].a[l], l).not.toMatch(/\b(three|tres) (of the|de los)\b/i);
    // The name stays in localStorage and the picks in sessionStorage: "Is anything saved?" is never a bare "No" (games2-C8).
    const saved = WEEKLY_FAQ.find((f) => /saved/.test(f.q.en))!;
    expect(saved.a.en).not.toMatch(/^No\./);
    expect(saved.a.es).not.toMatch(/^No\./);
    expect(saved.a.en).toMatch(/This browser keeps/);
    expect(saved.a.es).toMatch(/Este navegador guarda/);
  });

  it("C3: no filler, no exclamation marks, no em dashes; no streak, no points, no email", () => {
    for (const l of LOCALES) {
      expect(fillerIn(texts(l), l), l).toEqual([]);
      expect(texts(l), l).not.toMatch(/[!—]/);
    }
    expect(JSON.stringify(en.games.weekly)).not.toMatch(/\bstreak|\bpoints?\b|e-?mail|leaderboard/i);
    expect(JSON.stringify(es.games.weekly)).not.toMatch(/\bracha|\bpuntos?\b|correo|clasificaci/i);
  });

  it("C4: the Spanish never genders the other person, and nothing names a place in Spain", () => {
    expect(texts("es")).not.toMatch(/\b(el|al|del) otro\b|\bcada uno\b|\bsois los dos\b|\bpara los dos\b|\bde ambos\b|\bjuntos\b/i);
    for (const l of LOCALES) expect(texts(l), l).not.toMatch(/Spain|España|Madrid|Barcelona|Valencia|Sevilla|Seville/);
  });

  it("C5: the hub's card for it is a title and a button's word, no sentence", () => {
    for (const m of [en, es]) {
      expect(words(m.games.hub.weeklyTitle)).toBeLessThanOrEqual(5);
      expect(words(m.games.hub.weeklyCta)).toBeLessThanOrEqual(3);
      expect((m.games.hub as Record<string, unknown>).pickSub).toBeUndefined();
    }
  });
});
