import { describe, expect, it } from "vitest";
import { entries, hitTimes, readVerdict, reviewYear, stamps, STAMP_GAP_S, STAMP_HIT, STAMP_S, unrollSeconds } from "@/templates/nice-list/review";
import { barcode, formatCount, parseStat, PIECES, readStats, tearPieces, unwrapYear } from "@/templates/unwrapped/year";
import { armTurn, autoPull, clampPull, CREAKS, GIVE, settled, strained, strainOf } from "@/templates/wishbone/bone";
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
  // A joint and a tip like the rendered bone's: the right arm points down and to the right.
  const JOINT = { x: 50, y: 70 };
  const TIP = { x: 72, y: 110 };
  const nowhere = { x: 0, y: 0 };

  it("rests whole when nobody is pulling", () => {
    const { head, left, right } = strained(JOINT, TIP, nowhere);
    for (const piece of [head, left, right]) {
      expect(piece.turn).toBeCloseTo(0, 9);
      expect(piece.shift).toEqual(nowhere);
    }
  });

  it("turns the pulled arm about the joint until its tip points at the finger, and barely moves the rest", () => {
    const pull = { x: 12, y: 3 };
    const { head, left, right } = strained(JOINT, TIP, pull);
    // Pulled outwards, an arm that points down and right swings anticlockwise on the screen.
    expect(right.turn).toBeLessThan(0);
    const r = (right.turn * Math.PI) / 180;
    const dx = TIP.x - JOINT.x;
    const dy = TIP.y - JOINT.y;
    const turned = { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) };
    expect(Math.atan2(turned.y, turned.x)).toBeCloseTo(Math.atan2(dy + pull.y, dx + pull.x), 9);
    expect(right.turn).toBeCloseTo(armTurn(JOINT, TIP, pull), 9);
    // The head and the other arm are one piece until it gives, and only lean.
    expect(head).toEqual(left);
    expect(Math.abs(left.turn)).toBeLessThan(Math.abs(right.turn) * 0.2);
    expect(Math.hypot(left.shift.x, left.shift.y)).toBeLessThan(Math.hypot(pull.x, pull.y) * 0.2);
  });

  it("follows the finger only as far as the bone goes, then gives", () => {
    const far = clampPull({ x: 300, y: 400 });
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(GIVE, 6);
    expect(strainOf(far)).toBe(1);
    expect(strainOf(nowhere)).toBe(0);
    expect(clampPull({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    expect(armTurn(JOINT, TIP, { x: 300, y: 400 })).toBeCloseTo(armTurn(JOINT, TIP, far), 9);
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

  it("gives the head to the winner: it goes wherever their arm goes, and the other arm is left alone", () => {
    const turn = armTurn(JOINT, TIP, autoPull(1));
    const them = settled("them", turn);
    expect(them.head).toEqual(them.right);
    expect(them.left).not.toEqual(them.head);
    // The halves part: the loser's arm goes left, the winner's half right.
    expect(them.left.shift.x).toBeLessThan(0);
    expect(them.head.shift.x).toBeGreaterThan(0);
    const me = settled("me", turn);
    expect(me.head).toEqual(me.left);
    // The arm they are left holding keeps the turn it had when it gave, and a little more.
    expect(me.right.turn).toBeCloseTo(turn + 8, 9);
    expect(me.right.shift.x).toBeGreaterThan(0);
  });

  it("makes a whole, publishable gift from nothing", () => {
    expect(wishboneSchema.parse({})).toEqual({ winner: "them", look: "gingham" });
  });

  it("has an occasion page of its own to lead", () => {
    expect(OCCASIONS).toContain("thanksgiving");
    expect(getManifest("wishbone")?.occasions[0]).toBe("thanksgiving");
  });
});
