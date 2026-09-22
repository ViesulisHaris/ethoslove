import { describe, expect, it } from "vitest";
import { CHORES, DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { knowFinished, knowQuestion, knowReduce, knowRoundDone, knowScore, newKnow, newRather, ratherFinished, ratherMatches, ratherReduce, seedOf, shuffle } from "@/lib/games/play";
import { makeRoomCode, parseRoomCode, playerId } from "@/lib/games/room";

describe("room codes", () => {
  it("makes four letters nobody can misread, and forgives how they are typed back", () => {
    const code = makeRoomCode(() => 0.5);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(parseRoomCode(" kjqd ")).toBe("KJQD");
    expect(parseRoomCode("KJ-QD")).toBe("KJQD");
    expect(parseRoomCode("KIQD")).toBeNull(); // I looks like 1
    expect(parseRoomCode("KJQ")).toBeNull();
    expect(parseRoomCode(null)).toBeNull();
  });

  it("keeps a player's id for the tab, and copes with no storage", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const id = playerId(storage);
    expect(id).toMatch(/^[a-z0-9]{12}$/);
    expect(playerId(storage)).toBe(id);
    expect(playerId(null)).toMatch(/^[a-z0-9]{12}$/);
  });
});

describe("the content", () => {
  it("is complete in both languages", () => {
    for (const q of KNOW_QUESTIONS) {
      expect(q.prompt.en && q.prompt.es, q.id).toBeTruthy();
      expect(q.options).toHaveLength(4);
      for (const o of q.options) expect(o.en && o.es, q.id).toBeTruthy();
    }
    for (const p of RATHER_PAIRS) expect(p.a.en && p.a.es && p.b.en && p.b.es, p.id).toBeTruthy();
    for (const c of [...TRUTHS, ...DARES, ...CHORES]) expect(c.en && c.es).toBeTruthy();
    expect(new Set(KNOW_QUESTIONS.map((q) => q.id)).size).toBe(KNOW_QUESTIONS.length);
    expect(new Set(RATHER_PAIRS.map((p) => p.id)).size).toBe(RATHER_PAIRS.length);
  });
});

describe("how well do you know me", () => {
  it("deals the same questions on both phones from the room code", () => {
    const a = newKnow(seedOf("KJQD"));
    const b = newKnow(seedOf("KJQD"));
    expect(a.order).toEqual(b.order);
    expect(a.order).toHaveLength(8);
    expect(newKnow(seedOf("ABCD")).order).not.toEqual(a.order);
    expect(shuffle([1, 2, 3, 4, 5], 9).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("scores guesses about the other person, one answer per player per round, and ignores nonsense", () => {
    let s = newKnow(1);
    const q = knowQuestion(s)!;
    s = knowReduce(s, { type: "answer", player: 0, self: 1, guess: 3 });
    expect(knowRoundDone(s)).toBe(false);
    // Nobody advances a round before both have answered; nobody answers twice.
    expect(knowReduce(s, { type: "next" })).toBe(s);
    expect(knowReduce(s, { type: "answer", player: 0, self: 2, guess: 2 })).toBe(s);
    expect(knowReduce(s, { type: "answer", player: 1, self: 7, guess: 0 })).toBe(s);
    s = knowReduce(s, { type: "answer", player: 1, self: 3, guess: 1 });
    expect(knowRoundDone(s)).toBe(true);
    expect(s.answers[0][q.id]).toEqual({ self: 1, guess: 3 });
    // Player 0 guessed 3 and player 1 said 3; player 1 guessed 1 and player 0 said 1.
    expect(knowScore(s)).toEqual([1, 1]);
    s = knowReduce(s, { type: "next" });
    expect(s.round).toBe(1);
    for (let r = 1; r < 8; r++) {
      s = knowReduce(s, { type: "answer", player: 0, self: 0, guess: 0 });
      s = knowReduce(s, { type: "answer", player: 1, self: 1, guess: 0 });
      s = knowReduce(s, { type: "next" });
    }
    expect(knowFinished(s)).toBe(true);
    expect(knowScore(s)).toEqual([1, 8]);
    expect(knowReduce(s, { type: "next" })).toBe(s);
  });
});

describe("would you rather", () => {
  it("counts the rounds both picked the same side", () => {
    let s = newRather(seedOf("WXYZ"));
    expect(s.order).toHaveLength(10);
    s = ratherReduce(s, { type: "pick", player: 0, side: 0 });
    expect(ratherReduce(s, { type: "pick", player: 0, side: 1 })).toBe(s);
    s = ratherReduce(s, { type: "pick", player: 1, side: 0 });
    expect(ratherMatches(s)).toEqual({ same: 1, answered: 1 });
    s = ratherReduce(s, { type: "next" });
    s = ratherReduce(s, { type: "pick", player: 0, side: 0 });
    s = ratherReduce(s, { type: "pick", player: 1, side: 1 });
    expect(ratherMatches(s)).toEqual({ same: 1, answered: 2 });
    for (let r = 2; r < 10; r++) s = ratherReduce(ratherReduce(ratherReduce(s, { type: "next" }), { type: "pick", player: 0, side: 1 }), { type: "pick", player: 1, side: 1 });
    s = ratherReduce(s, { type: "next" });
    expect(ratherFinished(s)).toBe(true);
    expect(ratherMatches(s)).toEqual({ same: 9, answered: 10 });
  });
});
