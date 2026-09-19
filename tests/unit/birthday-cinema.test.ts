import { describe, expect, it } from "vitest";
import { CAKE_BOX, candleSpots } from "@/templates/birthday-cinema/cake";

describe("where the candles stand on the cake", () => {
  it("puts up to six on the top tier, and the rest on the middle one", () => {
    expect(candleSpots(0)).toEqual([]);
    expect(candleSpots(1)).toHaveLength(1);
    expect(candleSpots(1)[0].x).toBe(100);
    expect(candleSpots(6).every((c) => c.tier === 0)).toBe(true);
    const nine = candleSpots(9);
    expect(nine.filter((c) => c.tier === 0)).toHaveLength(6);
    expect(nine.filter((c) => c.tier === 1)).toHaveLength(3);
    expect(candleSpots(30)).toHaveLength(12);
  });

  it("keeps every candle off the top tier when the age is on a topper, and stops at six", () => {
    const withTopper = candleSpots(12, true);
    expect(withTopper).toHaveLength(6);
    expect(withTopper.every((c) => c.tier === 1)).toBe(true);
    expect(candleSpots(3, true)).toHaveLength(3);
  });

  it("keeps every wick inside the drawing and above its tier", () => {
    for (const c of candleSpots(12)) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(CAKE_BOX.w);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(CAKE_BOX.h);
    }
    const top = candleSpots(12).filter((c) => c.tier === 0);
    const middle = candleSpots(12).filter((c) => c.tier === 1);
    expect(Math.max(...top.map((c) => c.y))).toBeLessThan(Math.min(...middle.map((c) => c.y)));
  });

  it("spreads a row evenly, wider on the wider tier", () => {
    const top = candleSpots(6).map((c) => c.x);
    const gaps = top.slice(1).map((x, i) => x - top[i]);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 5);
    const middle = candleSpots(12).filter((c) => c.tier === 1).map((c) => c.x);
    expect(middle[middle.length - 1] - middle[0]).toBeGreaterThan(top[top.length - 1] - top[0]);
  });
});
