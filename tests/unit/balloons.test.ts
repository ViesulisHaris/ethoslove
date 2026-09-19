import { describe, expect, it } from "vitest";
import { ageDigits, bannerRows, CLUSTER, layoutBalloons, pileSlots } from "@/templates/balloons/scene";

describe("the room the balloons hang in", () => {
  it("keeps every balloon inside the cluster, with the letter last and biggest", () => {
    for (const n of [1, 3, 6, 9, 13]) {
      const spots = layoutBalloons(n, 42, 6);
      expect(spots).toHaveLength(n);
      for (const s of spots) {
        expect(s.x).toBeGreaterThanOrEqual(CLUSTER.left);
        expect(s.x).toBeLessThanOrEqual(CLUSTER.right);
        expect(s.y).toBeGreaterThanOrEqual(CLUSTER.top);
        expect(s.y).toBeLessThanOrEqual(CLUSTER.bottom);
        expect(s.bob).toBeGreaterThan(4);
      }
      const letter = spots[n - 1];
      expect(letter.tone).toBe(-1);
      for (const s of spots.slice(0, -1)) {
        expect(s.scale).toBeLessThan(letter.scale);
        expect(s.tone).toBeGreaterThanOrEqual(0);
        expect(s.tone).toBeLessThan(6);
      }
    }
  });

  it("puts the letter near the middle of the cluster", () => {
    const spots = layoutBalloons(9, 7, 6);
    const letter = spots[8];
    expect(Math.abs(letter.x - 50)).toBeLessThan(16);
    expect(Math.abs(letter.y - (CLUSTER.top + CLUSTER.bottom) / 2)).toBeLessThan(14);
  });

  it("is the same layout for the same names, and a different one for different names", () => {
    expect(layoutBalloons(8, 99, 6)).toEqual(layoutBalloons(8, 99, 6));
    expect(layoutBalloons(8, 99, 6)).not.toEqual(layoutBalloons(8, 100, 6));
  });

  it("never lets two balloons share a cell", () => {
    const spots = layoutBalloons(12, 3, 6);
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const d = Math.hypot(spots[i].x - spots[j].x, (spots[i].y - spots[j].y) * 1.4);
        expect(d, `${i} and ${j} overlap`).toBeGreaterThan(7);
      }
  });
});

describe("where the photos land", () => {
  it("fans them along the floor, in order", () => {
    const slots = pileSlots(6, 1);
    expect(slots).toHaveLength(6);
    for (let i = 1; i < slots.length; i++) expect(slots[i].x).toBeGreaterThan(slots[i - 1].x);
    for (const s of slots) {
      expect(s.y).toBeGreaterThan(74);
      expect(s.y).toBeLessThan(88);
      expect(Math.abs(s.rotate)).toBeLessThan(14);
    }
  });
});

describe("the pennant line", () => {
  it("fits short lines on one row and wraps long ones on a space", () => {
    expect(bannerRows("happy birthday")).toEqual(["happy birthday"]);
    expect(bannerRows("feliz cumple")).toEqual(["feliz cumple"]);
    expect(bannerRows("happy 30th ana")).toEqual(["happy 30th ana"]);
    expect(bannerRows("feliz cumpleaños")).toEqual(["feliz", "cumpleaños"]);
  });

  it("cuts a word nobody could hang on one string, and never makes a third row", () => {
    expect(bannerRows("congratulationsss")).toEqual(["congratulation", "sss"]);
    expect(bannerRows("one two three four five six seven")).toHaveLength(2);
    expect(bannerRows("   ")).toEqual([]);
  });
});

describe("the number balloons", () => {
  it("are the age's digits, clamped to something a person has", () => {
    expect(ageDigits(30)).toEqual(["3", "0"]);
    expect(ageDigits(7)).toEqual(["7"]);
    expect(ageDigits(100)).toEqual(["1", "0", "0"]);
    expect(ageDigits(999)).toEqual(["1", "2", "0"]);
    expect(ageDigits(0)).toEqual([]);
    expect(ageDigits(undefined)).toEqual([]);
  });
});

describe("a wide screen", () => {
  it("spreads the balloons across fewer rows, lower down, under the sign", async () => {
    const { WIDE_CLUSTER } = await import("@/templates/balloons/scene");
    const spots = layoutBalloons(10, 5, 6, true);
    for (const s of spots) {
      expect(s.y).toBeGreaterThanOrEqual(WIDE_CLUSTER.top);
      expect(s.y).toBeLessThanOrEqual(WIDE_CLUSTER.bottom);
    }
    const ys = new Set(spots.map((s) => Math.round(s.y / 12)));
    expect(ys.size).toBeLessThanOrEqual(3);
  });
});
