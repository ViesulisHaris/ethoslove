import { describe, expect, it } from "vitest";
import { RATHER_PAIRS } from "@/lib/games/content";
import { DAILY_EPOCH, DAILY_FIGHTS, DAILY_HASH_MAX, DAILY_MIRRORED, DAILY_PAIRS, DAY_MS, cleanName, dailyCycle, joinsLetters, dailyPair, dayIso, dayOf, decodeDaily, encodeDaily, pairById, sentHere } from "@/lib/games/daily";

const N = DAILY_PAIRS.length;
const TODAY = DAILY_EPOCH + 40;

describe("the day's pair", () => {
  it("D1: the epoch is 23 November 2026, and a day turns at midnight UTC", () => {
    expect(dayIso(DAILY_EPOCH)).toBe("2026-11-23");
    expect(dayOf(Date.UTC(2026, 10, 23, 23, 59, 59))).toBe(DAILY_EPOCH);
    expect(dayOf(Date.UTC(2026, 10, 24, 0, 0, 0))).toBe(DAILY_EPOCH + 1);
    expect(dayOf(DAILY_EPOCH * DAY_MS)).toBe(DAILY_EPOCH);
  });

  it("D2: the same day gives the same pair, whenever and however often it is asked", () => {
    for (const day of [DAILY_EPOCH, DAILY_EPOCH + 1, DAILY_EPOCH + 500, DAILY_EPOCH - 3]) {
      expect(dailyPair(day).id).toBe(dailyPair(day).id);
    }
    // Pinned, so a change to the shuffle or the epoch cannot slip by: it would change every day's question.
    expect(dailyPair(DAILY_EPOCH).id).toBe(dailyCycle(0)[0].id);
  });

  it("D3: no pair twice within a round, and every pair once", () => {
    for (const cycle of [0, 1, 2, 7]) {
      const ids = Array.from({ length: N }, (_, i) => dailyPair(DAILY_EPOCH + cycle * N + i).id);
      expect(new Set(ids).size).toBe(N);
    }
  });

  it("D4: the last pair of a round is never the first of the next", () => {
    for (let cycle = -2; cycle < 60; cycle++) {
      const last = dailyPair(DAILY_EPOCH + cycle * N + N - 1).id;
      const first = dailyPair(DAILY_EPOCH + (cycle + 1) * N).id;
      expect(first).not.toBe(last);
    }
  });

  it("D5: two days in a row are never the same pair, over years", () => {
    for (let day = DAILY_EPOCH; day < DAILY_EPOCH + 3 * 365; day++) {
      expect(dailyPair(day + 1).id).not.toBe(dailyPair(day).id);
    }
  });

  it("D6: rounds come in different orders", () => {
    expect(dailyCycle(0).map((p) => p.id)).not.toEqual(dailyCycle(1).map((p) => p.id));
  });

  it("D7: every pair has an id a link can carry and words in both languages", () => {
    for (const p of DAILY_PAIRS) {
      expect(p.id).toMatch(/^[a-z0-9-]{1,40}$/);
      for (const side of [p.a, p.b]) {
        expect(side.en.trim()).not.toBe("");
        expect(side.es.trim()).not.toBe("");
      }
      expect(pairById(p.id)).toBe(p);
    }
    expect(new Set(DAILY_PAIRS.map((p) => p.id)).size).toBe(N);
    expect(() => dailyPair(TODAY, [])).toThrow();
  });
});

describe("the link", () => {
  const pair = DAILY_PAIRS[3];

  it("L1: a question round-trips", () => {
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Ana", side: 1 } });
    expect(hash.startsWith("#q=")).toBe(true);
    expect(decodeDaily(hash, TODAY)).toEqual({ day: TODAY, pair, from: { name: "Ana", side: 1 } });
  });

  it("L2: a reply round-trips with both answers", () => {
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Sam", side: 0 }, to: { name: "Ana", side: 1 } });
    expect(decodeDaily(hash, TODAY)).toEqual({ day: TODAY, pair, from: { name: "Sam", side: 0 }, to: { name: "Ana", side: 1 } });
  });

  it("L3: names with dots, spaces, accents and emoji travel whole", () => {
    for (const n of ["J. R.", "María José", "Zoë 💛", "a.b.c", "O'Neil & co", "Łukasz", "名前"]) {
      const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: n, side: 0 } });
      expect(hash.split(".").length).toBe(5);
      expect(hash).toMatch(/[01]$/);
      expect(decodeDaily(hash, TODAY)?.from.name).toBe(n);
    }
  });

  it("L4: an empty name is allowed", () => {
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "", side: 0 } });
    expect(decodeDaily(hash, TODAY)?.from.name).toBe("");
  });

  it("L5: a name is cleaned of control and direction characters and cut to 24", () => {
    expect(cleanName("  Ana‮\u0000 \n  Lu  ")).toBe("Ana Lu");
    expect(Array.from(cleanName("x".repeat(80))).length).toBe(24);
    expect(cleanName("😀".repeat(30))).toBe("😀".repeat(24));
    expect(cleanName(42)).toBe("");
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "‮evil​", side: 0 } });
    expect(decodeDaily(hash, TODAY)?.from.name).toBe("evil");
    const forged = `#q=1.${TODAY}.${pair.id}.${encodeURIComponent("‮" + "y".repeat(60))}.0`;
    expect(decodeDaily(forged, TODAY)?.from.name).toBe("y".repeat(24));
  });

  it("L5b: a name whose letters join is known, so the reveal's spaced label leaves it whole (games2-D5)", () => {
    for (const name of ["محمد", "Zoë 😀 محمد", "देवी", "ܐܢܐ", "ތަ"]) expect(joinsLetters(name), name).toBe(true);
    for (const name of ["Ana", "Zoë", "名前", "😀", "Ζωή", "Аня", "", "J.R."]) expect(joinsLetters(name), name).toBe(false);
  });

  it("L6: a day from before the epoch or after tomorrow is refused; yesterday's and tomorrow's are read", () => {
    const at = (day: number) => decodeDaily(encodeDaily({ day, pairId: pair.id, from: { name: "A", side: 0 } }), TODAY);
    expect(at(DAILY_EPOCH - 1)).toBeNull();
    expect(at(TODAY + 2)).toBeNull();
    expect(at(TODAY - 1)?.day).toBe(TODAY - 1);
    expect(at(TODAY + 1)?.day).toBe(TODAY + 1);
    expect(at(DAILY_EPOCH)?.day).toBe(DAILY_EPOCH);
  });

  it("L7: an earlier day's link shows the pair it was sent with, not that day's pick", () => {
    const other = DAILY_PAIRS.find((p) => p.id !== dailyPair(TODAY - 5).id)!;
    const link = decodeDaily(encodeDaily({ day: TODAY - 5, pairId: other.id, from: { name: "A", side: 1 } }), TODAY);
    expect(link?.pair).toBe(other);
  });

  it("L8: tampered links are refused", () => {
    const good = `1.${TODAY}.${pair.id}.Ana.0`;
    expect(decodeDaily(`#q=${good}`, TODAY)).not.toBeNull();
    expect(decodeDaily(`q=${good}`, TODAY)).not.toBeNull();
    for (const bad of [
      `#x=${good}`,
      `#q=2.${TODAY}.${pair.id}.Ana.0`,
      `#q=1.${TODAY}.${pair.id}.Ana.2`,
      `#q=1.${TODAY}.${pair.id}.Ana`,
      `#q=1.${TODAY}.${pair.id}.0.Ana`,
      `#q=1.${TODAY}.${pair.id}.Ana.0.Bo`,
      `#q=1.${TODAY}.${pair.id}.Ana.0.Bo.1.x`,
      `#q=1.${TODAY}.no-such-pair.Ana.0`,
      `#q=1.${TODAY}.BEACH.Ana.0`,
      `#q=1.${TODAY}.../x.Ana.0`,
      `#q=1.-5.${pair.id}.Ana.0`,
      `#q=1.1e5.${pair.id}.Ana.0`,
      `#q=1.${TODAY}.${pair.id}.%E0%A4%A.0`,
      `#q=1.${TODAY}.${pair.id}.Ana.0.%.1`,
      `#q=1.${TODAY}.${pair.id}.Ana. 0`,
      `#q=1.${TODAY}.cooking.Ana.0`,
      "",
      "#",
      "#q=",
    ]) {
      expect(decodeDaily(bad, TODAY), bad).toBeNull();
    }
  });

  it("L9: huge and hostile input is refused without throwing", () => {
    expect(decodeDaily(`#q=1.${TODAY}.${pair.id}.${"a".repeat(DAILY_HASH_MAX)}.0`, TODAY)).toBeNull();
    expect(decodeDaily("#q=" + ".".repeat(100000), TODAY)).toBeNull();
    for (const v of [null, undefined, 42, {}, [], Symbol.iterator]) expect(decodeDaily(v, TODAY)).toBeNull();
    expect(decodeDaily(`#q=1.${TODAY}.__proto__.Ana.0`, TODAY)).toBeNull();
    expect(decodeDaily(`#q=1.${TODAY}.constructor.Ana.0`, TODAY)).toBeNull();
  });

  it("L11: the longest reply a person can make comes back whole: two names of 24 emoji, the longest pair id", () => {
    const longest = [...DAILY_PAIRS].sort((x, y) => y.id.length - x.id.length)[0];
    const big = "🌙".repeat(40);
    const hash = encodeDaily({ day: TODAY + 1, pairId: longest.id, from: { name: big, side: 1 }, to: { name: "👩🏽".repeat(30), side: 0 } });
    expect(hash.length).toBeGreaterThan(400);
    expect(hash.length).toBeLessThanOrEqual(DAILY_HASH_MAX);
    const back = decodeDaily(hash, TODAY);
    expect(back?.pair.id).toBe(longest.id);
    expect(Array.from(back!.from.name)).toHaveLength(24);
    expect(back!.to!.name).toBe(cleanName("👩🏽".repeat(30)));
  });

  it("L12: a link never ends on a dot or on a character a chat app leaves out of a link, even with no names", () => {
    for (const from of [{ name: "", side: 0 as const }, { name: "Ana!", side: 1 as const }, { name: "Bo)", side: 0 as const }, { name: "J.", side: 1 as const }]) {
      for (const to of [undefined, { name: "", side: 0 as const }, { name: "Sam?", side: 1 as const }]) {
        const hash = encodeDaily({ day: TODAY, pairId: pair.id, from, to });
        expect(hash, hash).toMatch(/\.[01]$/);
        // What a chat app makes tappable: the link up to its last letter or digit.
        expect(hash.replace(/[.,!?;:)\]'"]+$/, "")).toBe(hash);
        expect(decodeDaily(hash, TODAY)?.from).toEqual({ name: cleanName(from.name), side: from.side });
      }
    }
  });

  it("L10: a link carries no dot except between fields, and nothing a server sees", () => {
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "A.B", side: 0 }, to: { name: "C.D", side: 1 } });
    expect(hash.split(".").length).toBe(7);
    expect(hash).not.toMatch(/[?&\s]/);
  });
});

describe("a link the tab sent itself", () => {
  const pair = DAILY_PAIRS[5];
  const sent = { day: TODAY, pairId: pair.id, name: "Ana", side: 1 as const };
  const open = (hash: string) => decodeDaily(hash, TODAY)!;

  it("S1: the link this tab sent, opened again here, is its own (never a reveal against itself)", () => {
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Ana", side: 1 } })), sent)).toBe(true);
    // The name as it travels: tidied the same way on both ends.
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "  Ana ", side: 1 } })), { ...sent, name: " Ana  " })).toBe(true);
  });

  it("S2: someone else's link is not, even on the same pair: another name, another side, another day", () => {
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Sam", side: 1 } })), sent)).toBe(false);
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Ana", side: 0 } })), sent)).toBe(false);
    expect(sentHere(open(encodeDaily({ day: TODAY - 1, pairId: pair.id, from: { name: "Ana", side: 1 } })), sent)).toBe(false);
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: DAILY_PAIRS[6].id, from: { name: "Ana", side: 1 } })), sent)).toBe(false);
    expect(sentHere(open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Ana", side: 1 } })), null)).toBe(false);
  });

  it("S3: a reply is matched on who sent it: the reply this tab sent back is its own, the one it receives is not", () => {
    const reply = open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "Ana", side: 1 }, to: { name: "Sam", side: 0 } }));
    expect(sentHere(reply, { ...sent, reply: true })).toBe(true);
    expect(sentHere(reply, { ...sent, name: "Sam", side: 0 })).toBe(false);
  });

  it("S5: two blank names on the same side: the first link's tab takes the reply as a reply, the replying tab knows its own", () => {
    const first = { day: TODAY, pairId: pair.id, name: "", side: 0 as const };
    const reply = open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "", side: 0 }, to: { name: "", side: 0 } }));
    const question = open(encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "", side: 0 } }));
    // The tab that sent the question: the reply it receives is a reveal, its own question is its own.
    expect(sentHere(reply, first)).toBe(false);
    expect(sentHere(question, first)).toBe(true);
    // The tab that replied: its own reply is its own, the question it was sent is not.
    expect(sentHere(reply, { ...first, reply: true })).toBe(true);
    expect(sentHere(question, { ...first, reply: true })).toBe(false);
  });
});

describe("the daily pool", () => {
  // The person words of a side, in order: Y for you/your, T for they/their/them.
  const persons = (s: string) => (s.toLowerCase().match(/\b(you|your|yours|you're|they|their|theirs|them|they're)\b/g) ?? []).map((w) => (w.startsWith("you") ? "Y" : "T")).join("");
  const swap = (p: string) => p.replace(/[YT]/g, (c) => (c === "Y" ? "T" : "Y"));
  /** One side about "you" where the other is about "them": its meaning flips on the other person's phone. */
  const mirrored = (en: { a: string; b: string }) => {
    const a = persons(en.a);
    const b = persons(en.b);
    return (a !== "" && b !== "" && a[0] !== b[0]) || (a !== b && swap(a) === b);
  };
  // Read and kept: both sides are about the same person on either phone.
  const CHECKED = ["photos", "teen-photos"];

  it("P1: no pair whose sides swap you and them is a day's question", () => {
    const bad = DAILY_PAIRS.filter((p) => mirrored({ a: p.a.en, b: p.b.en }) && !CHECKED.includes(p.id)).map((p) => p.id);
    expect(bad).toEqual([]);
    // The detector does catch the kind it is for.
    expect(mirrored({ a: "They cook, but it's always pasta", b: "You cook, but it's always toast" })).toBe(true);
    expect(mirrored({ a: "Their ex becomes your boss", b: "Your ex becomes their boss" })).toBe(true);
    for (const id of ["cooking", "remote", "mum-calls", "boss", "sorry-first", "truth-hour", "commute", "christmas", "friends-over", "third-wheel", "group-holiday", "front-row", "double", "dumped", "old-texts", "bump-into", "love-advice"]) {
      expect(DAILY_PAIRS.some((p) => p.id === id), id).toBe(false);
    }
  });

  it("P2: no ex, jealousy, snooping or secret is a day's question", () => {
    for (const p of DAILY_PAIRS) {
      for (const l of ["en", "es"] as const) {
        expect(`${p.a[l]} / ${p.b[l]}`, p.id).not.toMatch(/\bex\b|\bex's|jealous|celos|secret|crush|dating app|app de citas|check your phone|revise el móvil/i);
      }
    }
  });

  it("P3: the lists name real pairs, and the pool keeps a long round", () => {
    const ids = new Set(RATHER_PAIRS.map((p) => p.id));
    for (const id of [...DAILY_MIRRORED, ...DAILY_FIGHTS]) expect(ids.has(id), id).toBe(true);
    expect(new Set([...DAILY_MIRRORED, ...DAILY_FIGHTS]).size).toBe(DAILY_MIRRORED.length + DAILY_FIGHTS.length);
    expect(DAILY_PAIRS.length).toBe(RATHER_PAIRS.length - DAILY_MIRRORED.length - DAILY_FIGHTS.length);
    expect(DAILY_PAIRS.length).toBeGreaterThanOrEqual(90);
  });

  it("P4: a link to a pair kept out of the pool is not a whole link", () => {
    expect(decodeDaily(encodeDaily({ day: TODAY, pairId: "cooking", from: { name: "Ana", side: 0 } }), TODAY)).toBeNull();
    expect(pairById("cooking")).toBeNull();
  });
});
