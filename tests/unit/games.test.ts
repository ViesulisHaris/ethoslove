import { describe, expect, it } from "vitest";
import { CHORES, DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { knowFinished, knowQuestion, knowReduce, knowRoundDone, knowScore, newKnow, newRather, ratherFinished, ratherMatches, ratherReduce, seedOf, shuffle } from "@/lib/games/play";
import { DRAW_ROUNDS, DRAW_WORDS, drawArtist, drawFinished, drawMatches, drawReduce, drawRoundDone, drawScore, drawWord, newDraw } from "@/lib/games/draw";
import { MEMORY_PAIRS, memoryDone, memoryFlip, memoryIsPair, memoryResolve, newMemory, type MemoryState } from "@/lib/games/memory";
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

  it("deals a fresh game when the room plays again, the same one on both phones", () => {
    const first = newKnow(seedOf("KJQD"), 0);
    const again = newKnow(seedOf("KJQD"), 1);
    expect(again.gen).toBe(1);
    expect(again.order).not.toEqual(first.order);
    expect(newKnow(seedOf("KJQD"), 1).order).toEqual(again.order);
    expect(newRather(seedOf("KJQD"), 1).order).not.toEqual(newRather(seedOf("KJQD"), 0).order);
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

describe("memory", () => {
  /** The two slots holding pair `face`. */
  const slotsOf = (s: MemoryState, face: number) => s.cards.flatMap((c, i) => (c === face ? [i] : []));

  it("deals every pair exactly twice, the same way for the same seed", () => {
    const s = newMemory(seedOf("PAIR"));
    expect(s.cards).toHaveLength(MEMORY_PAIRS * 2);
    for (let face = 0; face < MEMORY_PAIRS; face++) expect(slotsOf(s, face)).toHaveLength(2);
    expect(newMemory(seedOf("PAIR")).cards).toEqual(s.cards);
    expect(newMemory(seedOf("PEAR")).cards).not.toEqual(s.cards);
    expect(memoryDone(s)).toBe(false);
  });

  it("gives a pair to whoever found it and lets them go again", () => {
    let s = newMemory(7);
    const [a, b] = slotsOf(s, 3);
    s = memoryFlip(memoryFlip(s, a), b);
    expect(memoryIsPair(s)).toBe(true);
    s = memoryResolve(s);
    expect(s.matched[a]).toBe(0);
    expect(s.matched[b]).toBe(0);
    expect(s.scores).toEqual([1, 0]);
    expect(s.turn).toBe(0);
    expect(s.open).toEqual([]);
    // A taken card can't be turned over again.
    expect(memoryFlip(s, a)).toBe(s);
  });

  it("turns a miss back over and passes the turn", () => {
    let s = newMemory(7);
    const a = slotsOf(s, 0)[0];
    const b = slotsOf(s, 1)[0];
    s = memoryFlip(memoryFlip(s, a), b);
    expect(memoryIsPair(s)).toBe(false);
    s = memoryResolve(s);
    expect(s.open).toEqual([]);
    expect(s.turn).toBe(1);
    expect(s.scores).toEqual([0, 0]);
    expect(s.matched.every((m) => m === null)).toBe(true);
  });

  it("ignores a card already up, a third card, a slot off the board, and settling one card", () => {
    let s = newMemory(7);
    const a = slotsOf(s, 0)[0];
    const b = slotsOf(s, 1)[0];
    const c = slotsOf(s, 2)[0];
    s = memoryFlip(s, a);
    expect(memoryFlip(s, a)).toBe(s);
    expect(memoryResolve(s)).toBe(s);
    expect(memoryFlip(s, -1)).toBe(s);
    expect(memoryFlip(s, 99)).toBe(s);
    s = memoryFlip(s, b);
    expect(memoryFlip(s, c)).toBe(s);
  });

  it("ends when every pair is taken, and the scores add up to the pairs", () => {
    let s = newMemory(seedOf("DONE"));
    for (let face = 0; face < MEMORY_PAIRS; face++) {
      const [a, b] = slotsOf(s, face);
      // Every other pair, miss first so the turn changes hands.
      if (face % 2) s = memoryResolve(memoryFlip(memoryFlip(s, a), slotsOf(s, (face + 1) % MEMORY_PAIRS)[0]));
      s = memoryResolve(memoryFlip(memoryFlip(s, a), b));
    }
    expect(memoryDone(s)).toBe(true);
    expect(s.scores[0] + s.scores[1]).toBe(MEMORY_PAIRS);
    expect(s.scores[1]).toBeGreaterThan(0);
  });
});

describe("draw it, guess it", () => {
  it("is complete in both languages, with no word twice", () => {
    for (const w of DRAW_WORDS) expect(w.word.en && w.word.es, w.id).toBeTruthy();
    expect(new Set(DRAW_WORDS.map((w) => w.id)).size).toBe(DRAW_WORDS.length);
    expect(DRAW_WORDS.length).toBeGreaterThan(DRAW_ROUNDS * 2);
  });

  it("deals the same six words on both phones and takes the drawing in turns", () => {
    const a = newDraw(seedOf("KJQD"));
    expect(a.order).toHaveLength(DRAW_ROUNDS);
    expect(newDraw(seedOf("KJQD")).order).toEqual(a.order);
    expect(newDraw(seedOf("ABCD")).order).not.toEqual(a.order);
    expect(newDraw(seedOf("KJQD"), 1).order).not.toEqual(a.order);
    expect(drawArtist(a)).toBe(0);
    expect(drawArtist({ ...a, round: 1 })).toBe(1);
    expect(drawArtist({ ...a, round: 2 })).toBe(0);
  });

  it("takes a guess in either language, and forgives spelling, accents and articles", () => {
    const word = DRAW_WORDS.find((w) => w.id === "icecream")!;
    expect(drawMatches(word, "ice cream")).toBe(true);
    expect(drawMatches(word, "  ICE CREAM!  ")).toBe(true);
    expect(drawMatches(word, "helado")).toBe(true);
    expect(drawMatches(word, "un helado")).toBe(true);
    expect(drawMatches(word, "icecream")).toBe(true);
    expect(drawMatches(word, "cake")).toBe(false);
    expect(drawMatches(word, "")).toBe(false);
    const phone = DRAW_WORDS.find((w) => w.id === "phone")!;
    expect(drawMatches(phone, "móvil")).toBe(true);
    expect(drawMatches(phone, "movil")).toBe(true);
    expect(drawMatches(phone, "the phone")).toBe(true);
  });

  it("scores a right guess, ignores the one drawing, and ends the round either way", () => {
    let s = newDraw(3);
    const word = drawWord(s)!;
    // The one drawing can't guess their own word, and a wrong guess just goes on the pile.
    expect(drawReduce(s, { type: "guess", player: drawArtist(s), text: word.word.en })).toBe(s);
    s = drawReduce(s, { type: "guess", player: 1, text: "something else" });
    expect(s.guesses).toHaveLength(1);
    expect(s.guesses[0].right).toBe(false);
    expect(drawRoundDone(s)).toBe(false);
    expect(drawReduce(s, { type: "next" })).toBe(s);
    s = drawReduce(s, { type: "guess", player: 1, text: word.word.es });
    expect(drawRoundDone(s)).toBe(true);
    expect(drawScore(s)).toBe(1);
    // Once it is got, nothing else lands on that round.
    expect(drawReduce(s, { type: "guess", player: 1, text: "late" })).toBe(s);
    expect(drawReduce(s, { type: "pass" })).toBe(s);
    s = drawReduce(s, { type: "next" });
    expect(s.round).toBe(1);
    expect(s.guesses).toEqual([]);
    s = drawReduce(s, { type: "pass" });
    expect(drawScore(s)).toBe(1);
    expect(drawRoundDone(s)).toBe(true);
    // One phone: whoever is drawing says the other got it.
    s = drawReduce(drawReduce(s, { type: "next" }), { type: "got" });
    expect(drawScore(s)).toBe(2);
    for (let r = 2; r < DRAW_ROUNDS; r++) s = drawReduce(drawReduce(s, { type: "next" }), { type: "pass" });
    s = drawReduce(s, { type: "next" });
    expect(drawFinished(s)).toBe(true);
    expect(drawReduce(s, { type: "next" })).toBe(s);
    expect(drawScore(s)).toBe(2);
  });
});
