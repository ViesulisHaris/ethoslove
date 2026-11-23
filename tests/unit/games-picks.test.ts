import { describe, expect, it } from "vitest";
import { eitherOr } from "@/components/games/question-list";
import { RATHER_PAIRS } from "@/lib/games/content";
import { PICKS_ROUNDS, newPicks, picksFinished, picksId, picksMatches, picksReduce, type PicksState } from "@/lib/games/picks";
import { newRather } from "@/lib/games/play";
import { revivePicks } from "@/lib/games/saved";
import { THIS_PAIRS } from "@/lib/games/this-or-that";
import { fillerIn } from "./filler";

const ids = THIS_PAIRS.map((p) => p.id);
const words = (s: string) => s.trim().split(/\s+/).length;

/** Both pick, then the round moves on. */
const play = (state: PicksState, a: 0 | 1, b: 0 | 1) => picksReduce(picksReduce(picksReduce(state, { type: "pick", player: 0, side: a }), { type: "pick", player: 1, side: b }), { type: "next" });

describe("the moves of This or that", () => {
  it("P1: deals ten from the list, the same on both phones, and a fresh ten when the room plays again", () => {
    const one = newPicks("thisthat", ids, 7);
    expect(newPicks("thisthat", ids, 7)).toEqual(one);
    expect(one.order).toHaveLength(PICKS_ROUNDS);
    expect(new Set(one.order).size).toBe(PICKS_ROUNDS);
    for (const id of one.order) expect(ids).toContain(id);
    expect(newPicks("thisthat", ids, 7, 1).order).not.toEqual(one.order);
  });

  it("P2: one pick per player per round, and nonsense is ignored", () => {
    const start = newPicks("thisthat", ids, 3);
    expect(picksReduce(start, { type: "next" })).toBe(start);
    const picked = picksReduce(start, { type: "pick", player: 0, side: 1 });
    expect(picksReduce(picked, { type: "pick", player: 0, side: 0 })).toBe(picked);
    expect(picksReduce(picked, { type: "pick", player: 1, side: 2 as 0 })).toBe(picked);
    expect(picksReduce(picked, { type: "next" })).toBe(picked);
  });

  it("P3: counts the rounds both picked the same side", () => {
    let state = newPicks("thisthat", ids, 11);
    state = play(state, 0, 0);
    state = play(state, 1, 0);
    state = play(state, 1, 1);
    expect(picksMatches(state)).toEqual({ same: 2, answered: 3 });
    expect(picksId(state)).toBe(state.order[3]);
  });

  it("P4: ends after its ten rounds, and nothing moves after the end", () => {
    let state = newPicks("thisthat", ids, 5);
    for (let i = 0; i < PICKS_ROUNDS; i++) state = play(state, 0, 1);
    expect(picksFinished(state)).toBe(true);
    expect(picksId(state)).toBeNull();
    expect(picksReduce(state, { type: "pick", player: 0, side: 0 })).toBe(state);
    expect(picksMatches(state)).toEqual({ same: 0, answered: PICKS_ROUNDS });
  });

  it("P5: a kept game comes back only as its own", () => {
    const state = play(newPicks("thisthat", ids, 9), 0, 1);
    const revive = revivePicks("thisthat");
    expect(revive(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(revive(JSON.parse(JSON.stringify(newRather(9))))).toBeNull();
    expect(revive({ ...state, picks: [{}] })).toBeNull();
    expect(revive({})).toBeNull();
    expect(revive(null)).toBeNull();
  });
});

describe("the 120 pairs of This or that", () => {
  it("P6: at least 120, in both languages, each with an id of its own", () => {
    expect(THIS_PAIRS.length).toBeGreaterThanOrEqual(120);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of THIS_PAIRS) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      for (const s of [p.a.en, p.a.es, p.b.en, p.b.es]) expect(s.trim(), p.id).toBeTruthy();
    }
  });

  it("P7: two short sides that read as one question, none a would-you-rather pair again", () => {
    const rather = new Set(RATHER_PAIRS.map((p) => `${p.a.en}|${p.b.en}`.toLowerCase()));
    const seen = new Set<string>();
    for (const p of THIS_PAIRS) {
      for (const s of [p.a.en, p.a.es, p.b.en, p.b.es]) expect(words(s), `${p.id}: ${s}`).toBeLessThanOrEqual(9);
      expect(p.a.en, p.id).not.toBe(p.b.en);
      expect(p.a.es, p.id).not.toBe(p.b.es);
      // The list under the game lower-cases the second side's first letter.
      expect(p.b.en, p.id).not.toMatch(/^(I[ ']|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
      expect(eitherOr(p.a.en, p.b.en, "en"), p.id).toMatch(/^.+ or .+\?$/);
      expect(eitherOr(p.a.es, p.b.es, "es"), p.id).toMatch(/^¿.+ [ou] .+\?$/);
      const key = `${p.a.en}|${p.b.en}`.toLowerCase();
      expect(rather.has(key), p.id).toBe(false);
      expect(seen.has(key), p.id).toBe(false);
      seen.add(key);
    }
  });

  it("P8: nothing crude, nothing about exes, no filler", () => {
    for (const p of THIS_PAIRS) {
      for (const s of [p.a.en, p.b.en]) {
        expect(s, p.id).not.toMatch(/\b(ex|exes|naked|sex|sexy|drunk)\b/i);
        expect(fillerIn(s, "en"), p.id).toEqual([]);
      }
      for (const s of [p.a.es, p.b.es]) {
        expect(s, p.id).not.toMatch(/\b(ex|exnovi[oa]|desnud\w*|sexo|borrach\w*)\b/i);
        expect(fillerIn(s, "es"), p.id).toEqual([]);
      }
    }
  });

  it("P9: the Spanish never tells a player what they are", () => {
    for (const p of THIS_PAIRS) for (const s of [p.a.es, p.b.es]) expect(s, p.id).not.toMatch(/\b(cansad[oa]s?|junt[oa]s|sol[oa]s|enfadad[oa]s?|nervios[oa]s?|celos[oa]s?|content[oa]s?)\b/i);
  });
});
