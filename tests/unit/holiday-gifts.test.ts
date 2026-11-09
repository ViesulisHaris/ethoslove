import { describe, expect, it } from "vitest";
import { entries, hitTimes, readVerdict, reviewYear, stamps, STAMP_GAP_S, STAMP_HIT, STAMP_S, unrollSeconds } from "@/templates/nice-list/review";
import { barcode, formatCount, parseStat, PIECES, readStats, tearPieces, unwrapYear } from "@/templates/unwrapped/year";
import { APEX, arms, autoPull, clampPull, CREAKS, GIVE, halves, LEFT_END, RIGHT_END, split, strainOf } from "@/templates/wishbone/bone";
import { fieldsSchema as niceSchema } from "@/templates/nice-list/schema";
import { fieldsSchema as unwrappedSchema } from "@/templates/unwrapped/schema";
import { fieldsSchema as wishboneSchema } from "@/templates/wishbone/schema";
import { OCCASIONS } from "@/config/occasions";
import { getManifest } from "@/templates/manifests";

const fallback = { nice: "being you", naughty: "nothing proven" };

describe("The Nice List", () => {
  it("puts a good deed and a crime in turn, so the verdict stays in doubt", () => {
    const list = entries(["a", "b", "c"], ["x"], fallback);
    expect(list.map((e) => `${e.side}:${e.text}`)).toEqual(["nice:a", "naughty:x", "nice:b", "nice:c"]);
  });

  it("is never blank: an empty list still has a line on each side", () => {
    expect(entries([], [], fallback)).toEqual([
      { text: "being you", side: "nice" },
      { text: "nothing proven", side: "naughty" },
    ]);
    expect(entries(undefined, ["  ", ""], fallback)).toHaveLength(2);
  });

  it("keeps four of each, at 50 letters, whatever an old draft holds", () => {
    const long = "x".repeat(80);
    const list = entries([long, "b", "c", "d", "e", 7 as unknown as string], [], fallback);
    expect(list).toHaveLength(4);
    expect(list[0].text).toHaveLength(50);
  });

  it("stamps a word for each verdict, in Spanish the Reyes coal, never gendered", () => {
    expect(stamps("nice", "en").map((s) => s.word)).toEqual(["NICE"]);
    expect(stamps("both", "en").map((s) => s.word)).toEqual(["NAUGHTY", "& NICE"]);
    expect(stamps("nice", "es").map((s) => s.word)).toEqual(["SIN CARBÓN"]);
    expect(stamps("naughty", "es").map((s) => s.word)).toEqual(["CARBÓN"]);
    expect(stamps("both", "es").map((s) => s.word)).toEqual(["CARBÓN", "DULCE"]);
    for (const v of ["nice", "naughty", "both"] as const) for (const w of stamps(v, "es")) expect(w.word).not.toMatch(/BUEN[OA]|MAL[OA]|TRAVIES[OA]/);
    // Two presses take opposite corners, so neither word covers the other.
    expect(stamps("both", "en").map((s) => s.at)).toEqual(["top-left", "bottom-right"]);
  });

  it("reads an unknown verdict as nice", () => {
    expect(readVerdict("no-such-option")).toBe("nice");
    expect(readVerdict(undefined)).toBe("nice");
  });

  it("reviews last year until the end of February", () => {
    expect(reviewYear(new Date(2026, 11, 24))).toBe(2026);
    expect(reviewYear(new Date(2027, 1, 14))).toBe(2026);
    expect(reviewYear(new Date(2027, 2, 1))).toBe(2027);
  });

  it("lands each press of the stamp where its tool meets the paper, one slot apart", () => {
    const [first, second] = hitTimes(2);
    expect(first).toBeCloseTo(STAMP_S * STAMP_HIT, 6);
    expect(second - first).toBeCloseTo(STAMP_GAP_S, 6);
    // The second press only starts once the first has lifted off.
    expect(STAMP_GAP_S).toBeGreaterThan(STAMP_S);
  });

  it("rolls the rest of the way in proportion to what is left, never instantly", () => {
    expect(unrollSeconds(1)).toBeCloseTo(2.4);
    expect(unrollSeconds(0)).toBeGreaterThan(0.3);
    expect(unrollSeconds(2)).toBeCloseTo(2.4);
  });

  it("makes a whole, publishable gift from nothing", () => {
    expect(niceSchema.parse({})).toEqual({ verdict: "nice", nice: [], naughty: [], look: "red" });
  });
});

describe("Unwrapped", () => {
  it("reads the number at the front of a line in either convention", () => {
    expect(parseStat("1,284 voice notes")).toMatchObject({ value: 1284, decimals: 0, label: "voice notes" });
    expect(parseStat("1.284 audios")).toMatchObject({ value: 1284, label: "audios" });
    expect(parseStat("3.5 cities")).toMatchObject({ value: 3.5, decimals: 1, label: "cities" });
    expect(parseStat("2,5 kilos de turrón")).toMatchObject({ value: 2.5, decimals: 1 });
    expect(parseStat("41 nights you stole the blanket")).toMatchObject({ value: 41, label: "nights you stole the blanket" });
    expect(parseStat("100% you")).toMatchObject({ value: 100, after: "%", label: "you" });
    expect(parseStat("~200 coffees")).toMatchObject({ value: 200, before: "~", label: "coffees" });
    expect(parseStat("12k messages")).toMatchObject({ value: 12, after: "k", label: "messages" });
  });

  it("keeps a line without a number as words, whole", () => {
    expect(parseStat("one very spoiled dog")).toMatchObject({ value: null, label: "one very spoiled dog" });
    expect(parseStat("2026")).toMatchObject({ value: 2026, label: "" });
  });

  it("counts up from nothing to exactly what was typed, in the reader's grouping", () => {
    const st = parseStat("1,284 voice notes");
    expect(formatCount(st, 0, "en")).toBe("0");
    expect(formatCount(st, 1, "en")).toBe("1,284");
    expect(formatCount(parseStat("12.345 audios"), 1, "es")).toBe("12.345");
    expect(formatCount(parseStat("3.5 cities"), 1, "en")).toBe("3.5");
    expect(formatCount(parseStat("100% you"), 1, "en")).toBe("100%");
    const mid = Number(formatCount(st, 0.5, "en").replace(/,/g, ""));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1284);
  });

  it("opens up to eight presents, and three true of anyone when none were written", () => {
    expect(readStats(Array.from({ length: 12 }, (_, i) => `${i} things`), ["a"])).toHaveLength(8);
    expect(readStats([], ["1 a", "2 b", "3 c"]).map((s) => s.value)).toEqual([1, 2, 3]);
    expect(readStats(["", "  ", 5], ["x"]).map((s) => s.raw)).toEqual(["x"]);
  });

  it("tears each present into four pieces that cover it, the same way every time", () => {
    const a = tearPieces(42);
    expect(a).toHaveLength(PIECES);
    expect(tearPieces(42)).toEqual(a);
    expect(tearPieces(43)).not.toEqual(a);
    for (const p of a) {
      expect(p).toMatch(/^polygon\(/);
      expect(p).not.toMatch(/NaN|undefined/);
    }
    // Each piece reaches its own corner, past the edge, so no paper is left at the corners.
    expect(a[0]).toContain("-2.0% -2.0%");
    expect(a[1]).toContain("102.0% -2.0%");
    expect(a[2]).toContain("102.0% 102.0%");
    expect(a[3]).toContain("-2.0% 102.0%");
  });

  it("prints the same barcode for the same names", () => {
    expect(barcode(7)).toEqual(barcode(7));
    expect(barcode(7).every((w) => w >= 1 && w <= 4)).toBe(true);
  });

  it("unwraps last year until the end of February", () => {
    expect(unwrapYear(new Date(2027, 0, 3))).toBe(2026);
    expect(unwrapYear(new Date(2026, 11, 20))).toBe(2026);
  });

  it("makes a whole, publishable gift from nothing", () => {
    expect(unwrappedSchema.parse({})).toEqual({ stats: [], look: "red" });
  });
});

describe("Wishbone", () => {
  it("rests whole, its ends where the tags hang, when nobody is pulling", () => {
    const { left, right } = arms({ x: 0, y: 0 });
    expect(left[0]).toEqual(APEX);
    expect(right[0]).toEqual(APEX);
    expect(left[2]).toEqual(LEFT_END);
    expect(right[2]).toEqual(RIGHT_END);
  });

  it("follows the finger only as far as the bone goes, then gives", () => {
    const far = clampPull({ x: 300, y: 400 });
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(GIVE, 6);
    expect(strainOf(far)).toBe(1);
    expect(strainOf({ x: 0, y: 0 })).toBe(0);
    expect(clampPull({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
  });

  it("creaks on the way, louder each time, and before it gives", () => {
    expect([...CREAKS]).toEqual([...CREAKS].sort((a, b) => a - b));
    expect(Math.max(...CREAKS)).toBeLessThan(1);
  });

  it("pulls by itself from nothing to giving when tapped", () => {
    expect(strainOf(autoPull(0))).toBe(0);
    expect(strainOf(autoPull(1))).toBe(1);
    for (let t = 0.1; t <= 1; t += 0.1) expect(strainOf(autoPull(t))).toBeGreaterThanOrEqual(strainOf(autoPull(t - 0.1)));
  });

  it("splits a curve into two pieces that meet", () => {
    const { left } = arms({ x: 5, y: 3 });
    const [a, b] = split(left, 0.3);
    expect(a[0]).toEqual(left[0]);
    expect(b[2]).toEqual(left[2]);
    expect(a[2]).toEqual(b[0]);
  });

  it("gives the joint to the winner, with their arm and a stub of the other", () => {
    const pull = autoPull(1);
    const them = halves(pull, "them");
    const { right, left } = arms(pull);
    expect(them.big[0]).toEqual(right);
    expect(them.big[1][0]).toEqual(left[0]);
    expect(them.small).toHaveLength(1);
    expect(them.small[0][2]).toEqual(LEFT_END);
    const me = halves(pull, "me");
    expect(me.big[0]).toEqual(left);
    expect(me.small[0][2]).toEqual(right[2]);
  });

  it("makes a whole, publishable gift from nothing", () => {
    expect(wishboneSchema.parse({})).toEqual({ winner: "them", look: "gingham" });
  });

  it("has an occasion page of its own to lead", () => {
    expect(OCCASIONS).toContain("thanksgiving");
    expect(getManifest("wishbone")?.occasions[0]).toBe("thanksgiving");
  });
});
