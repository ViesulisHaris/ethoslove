import { describe, expect, it } from "vitest";
import { BASE_TILT, candleCount, LID_OPEN, LID_SHUT, lidAngle, pieceAngle, pieceShadow, PIECE_UP, settle, topperDigits } from "@/templates/popup-card/fold";

describe("the fold of the card", () => {
  it("takes the lid from shut to standing, overshooting by a few degrees at most", () => {
    expect(lidAngle(0)).toBe(LID_SHUT);
    expect(lidAngle(1)).toBeCloseTo(LID_OPEN, 5);
    expect(lidAngle(-1)).toBe(LID_SHUT);
    expect(lidAngle(2)).toBeCloseTo(LID_OPEN, 5);
    const angles = Array.from({ length: 41 }, (_, i) => lidAngle(i / 40));
    expect(Math.min(...angles)).toBe(LID_SHUT);
    expect(Math.max(...angles)).toBeLessThan(LID_OPEN + 4);
    // It rises steadily until the settle, which is the last fifth.
    for (let i = 1; i <= 32; i++) expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
  });

  it("stands the pieces parallel to the screen, undoing the table's tilt", () => {
    expect(PIECE_UP).toBe(-BASE_TILT);
    expect(pieceAngle(1, 0)).toBeCloseTo(PIECE_UP, 5);
    expect(Math.abs(pieceAngle(0, 0))).toBe(0);
  });

  it("holds a piece flat until its turn, then raises it with the rest of the opening", () => {
    expect(Math.abs(pieceAngle(0.3, 0.4))).toBe(0);
    expect(Math.abs(pieceAngle(0.4, 0.4))).toBe(0);
    expect(pieceAngle(0.7, 0.4)).toBeLessThan(0);
    expect(pieceAngle(1, 0.4)).toBeCloseTo(PIECE_UP, 5);
    expect(pieceShadow(0.2, 0.4)).toBe(0);
    expect(pieceShadow(1, 0.4)).toBe(1);
  });

  it("settles with a small overshoot and lands exactly", () => {
    expect(settle(0)).toBe(0);
    expect(settle(1)).toBe(1);
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => settle(i / 49)))).toBeGreaterThan(1);
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => settle(i / 49)))).toBeLessThan(1.06);
  });
});

describe("what the cake carries", () => {
  it("has as many candles as the age, up to five, and five for no age", () => {
    expect(candleCount(undefined)).toBe(5);
    expect(candleCount(3)).toBe(3);
    expect(candleCount(30)).toBe(5);
    expect(candleCount(0)).toBe(5);
  });

  it("puts the age on the topper", () => {
    expect(topperDigits(30)).toEqual(["3", "0"]);
    expect(topperDigits(undefined)).toEqual([]);
    expect(topperDigits(999)).toEqual(["1", "2", "0"]);
  });
});
