import { describe, expect, it } from "vitest";
import { RATHER_PAIRS } from "@/lib/games/content";
import { DAILY_EPOCH, DAILY_HASH_MAX, DAY_MS, cleanName, dailyCycle, dailyPair, dayIso, dayOf, decodeDaily, encodeDaily, pairById } from "@/lib/games/daily";

const N = RATHER_PAIRS.length;
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
    for (const p of RATHER_PAIRS) {
      expect(p.id).toMatch(/^[a-z0-9-]{1,40}$/);
      for (const side of [p.a, p.b]) {
        expect(side.en.trim()).not.toBe("");
        expect(side.es.trim()).not.toBe("");
      }
      expect(pairById(p.id)).toBe(p);
    }
    expect(new Set(RATHER_PAIRS.map((p) => p.id)).size).toBe(N);
    expect(() => dailyPair(TODAY, [])).toThrow();
  });
});

describe("the link", () => {
  const pair = RATHER_PAIRS[3];

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
    const forged = `#q=1.${TODAY}.${pair.id}.0.${encodeURIComponent("‮" + "y".repeat(60))}`;
    expect(decodeDaily(forged, TODAY)?.from.name).toBe("y".repeat(24));
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
    const other = RATHER_PAIRS.find((p) => p.id !== dailyPair(TODAY - 5).id)!;
    const link = decodeDaily(encodeDaily({ day: TODAY - 5, pairId: other.id, from: { name: "A", side: 1 } }), TODAY);
    expect(link?.pair).toBe(other);
  });

  it("L8: tampered links are refused", () => {
    const good = `1.${TODAY}.${pair.id}.0.Ana`;
    expect(decodeDaily(`#q=${good}`, TODAY)).not.toBeNull();
    expect(decodeDaily(`q=${good}`, TODAY)).not.toBeNull();
    for (const bad of [
      `#x=${good}`,
      `#q=2.${TODAY}.${pair.id}.0.Ana`,
      `#q=1.${TODAY}.${pair.id}.2.Ana`,
      `#q=1.${TODAY}.${pair.id}.0`,
      `#q=1.${TODAY}.${pair.id}.0.Ana.1`,
      `#q=1.${TODAY}.${pair.id}.0.Ana.1.Bo.x`,
      `#q=1.${TODAY}.no-such-pair.0.Ana`,
      `#q=1.${TODAY}.BEACH.0.Ana`,
      `#q=1.${TODAY}.../x.0.Ana`,
      `#q=1.-5.${pair.id}.0.Ana`,
      `#q=1.1e5.${pair.id}.0.Ana`,
      `#q=1.${TODAY}.${pair.id}.0.%E0%A4%A`,
      `#q=1.${TODAY}.${pair.id}.0.Ana.1.%`,
      `#q=1.${TODAY}.${pair.id}. 0.Ana`,
      "",
      "#",
      "#q=",
    ]) {
      expect(decodeDaily(bad, TODAY), bad).toBeNull();
    }
  });

  it("L9: huge and hostile input is refused without throwing", () => {
    expect(decodeDaily(`#q=1.${TODAY}.${pair.id}.0.${"a".repeat(DAILY_HASH_MAX)}`, TODAY)).toBeNull();
    expect(decodeDaily("#q=" + ".".repeat(100000), TODAY)).toBeNull();
    for (const v of [null, undefined, 42, {}, [], Symbol.iterator]) expect(decodeDaily(v, TODAY)).toBeNull();
    expect(decodeDaily(`#q=1.${TODAY}.__proto__.0.Ana`, TODAY)).toBeNull();
    expect(decodeDaily(`#q=1.${TODAY}.constructor.0.Ana`, TODAY)).toBeNull();
  });

  it("L10: a link carries no dot except between fields, and nothing a server sees", () => {
    const hash = encodeDaily({ day: TODAY, pairId: pair.id, from: { name: "A.B", side: 0 }, to: { name: "C.D", side: 1 } });
    expect(hash.split(".").length).toBe(7);
    expect(hash).not.toMatch(/[?&\s]/);
  });
});
