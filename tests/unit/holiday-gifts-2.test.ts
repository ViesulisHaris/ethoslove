import { describe, expect, it } from "vitest";
import { getManifest } from "@/templates/manifests";
import { pickSlice, SLICES, sliceAt, takeSlice, wedgeClip, type Pie } from "@/templates/thankful-pie/pie";
import { DEFAULT_INGREDIENTS, fieldsSchema as pieSchema } from "@/templates/thankful-pie/schema";
import { brush, gust, onCard, scatter, step, type Box } from "@/templates/leaf-pile/leaves";
import { fieldsSchema as leafSchema } from "@/templates/leaf-pile/schema";
import { frostGrid, MELT_AT, strokePoints, wipeAt, wiped } from "@/templates/frosted-window/frost";
import { fieldsSchema as windowSchema } from "@/templates/frosted-window/schema";

describe("Thankful Pie", () => {
  const empty: Pie = { taken: [], written: 0 };

  it("writes one ingredient for each slice lifted, then takes the rest of the pie in one go", () => {
    let pie = empty;
    pie = takeSlice(pie, 2, 3);
    expect(pie).toEqual({ taken: [2], written: 1 });
    pie = takeSlice(pie, 2, 3); // already out: the next one left comes instead
    expect(pie.taken).toHaveLength(2);
    expect(pie.written).toBe(2);
    pie = takeSlice(pie, 5, 3);
    expect(pie.written).toBe(3);
    pie = takeSlice(pie, 0, 3);
    expect(pie.taken).toHaveLength(SLICES);
    expect(new Set(pie.taken).size).toBe(SLICES);
    expect(pie.written).toBe(3);
    expect(takeSlice(pie, 1, 3)).toBe(pie);
  });

  it("with six ingredients, every slice writes one; with none, the first tap empties the tin", () => {
    let pie = empty;
    for (let i = 0; i < SLICES; i++) pie = takeSlice(pie, i, SLICES);
    expect(pie).toEqual({ taken: [0, 1, 2, 3, 4, 5], written: 6 });
    expect(takeSlice(empty, 3, 0).taken).toHaveLength(SLICES);
  });

  it("picks the slice under the finger, starting at twelve o'clock and going round anticlockwise", () => {
    // just left of straight up is the first slice, just right of it the last
    expect(pickSlice(-0.1, -0.9, [])).toBe(0);
    expect(pickSlice(0.1, -0.9, [])).toBe(SLICES - 1);
    expect(pickSlice(0.1, 0.9, [])).toBe(3);
    // a slice already out gives way to its nearest neighbour
    expect([2, 4]).toContain(pickSlice(0.1, 0.9, [3]));
    expect(pickSlice(0, 0.9, [0, 1, 2, 3, 4, 5])).toBe(-1);
  });

  it("moves every slice outwards, away from the middle of the pie", () => {
    for (let i = 0; i < SLICES; i++) {
      const s = sliceAt(i);
      expect(Math.hypot(s.dx, s.dy)).toBeGreaterThan(5);
    }
    expect(wedgeClip(0, { x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50 }, 30, 0.94)).toMatch(/^polygon\(50\.00% 50\.00%, /);
  });

  it("starts from a full recipe, and keeps no more than six", () => {
    expect(pieSchema.parse({})).toEqual({ ingredients: DEFAULT_INGREDIENTS, look: "linen" });
    expect(pieSchema.safeParse({ ingredients: Array(7).fill("x") }).success).toBe(false);
    expect(getManifest("thankful-pie")?.occasions[0]).toBe("thanksgiving");
  });
});

describe("Leaf Pile", () => {
  const card: Box = { x0: 14, y0: 54, x1: 86, y1: 103 };

  it("covers the card, and is the same pile every time for the same names", () => {
    const a = scatter(42, card);
    expect(a).toEqual(scatter(42, card));
    expect(onCard(a, card)).toBeGreaterThan(50);
  });

  it("pushes the leaves near a finger away from it, and leaves the far ones alone", () => {
    const leaves = scatter(7, card);
    const far = leaves.map((l) => Math.hypot(l.x - 50, l.y - 78) > 11);
    const moved = brush(leaves, { x: 50, y: 78 }, { x: 0, y: 0 });
    expect(moved).toBeGreaterThan(0);
    leaves.forEach((l, i) => {
      if (far[i]) expect(l.vx).toBe(0);
      else expect(Math.hypot(l.vx, l.vy)).toBeGreaterThan(0);
    });
  });

  it("slides and comes to rest", () => {
    const leaves = scatter(3, card);
    brush(leaves, { x: 50, y: 78 }, { x: 200, y: 0 });
    let moving = true;
    for (let i = 0; i < 600 && moving; i++) moving = step(leaves, 1 / 60);
    expect(moving).toBe(false);
  });

  it("is blown clear of the card by the wind", () => {
    const leaves = scatter(9, card);
    gust(leaves, { x: 50, y: 78 });
    for (let i = 0; i < 120; i++) step(leaves, 1 / 60);
    expect(onCard(leaves, card)).toBe(0);
  });

  it("defaults to the garden deck", () => {
    expect(leafSchema.parse({})).toEqual({ look: "deck" });
    expect(getManifest("leaf-pile")?.occasions[0]).toBe("thanksgiving");
  });
});

describe("Frosted Window", () => {
  it("counts what a finger has wiped, and a stroke leaves no gaps", () => {
    const grid = frostGrid(30, 40);
    expect(wiped(grid)).toBe(0);
    const pts = strokePoints({ u: 0, v: 0.5 }, { u: 1, v: 0.5 }, 0.1, 1.3);
    for (const p of pts) wipeAt(grid, p.u, p.v, 0.1, 1.3);
    // a band right across the glass, and every cell along its middle row is clear
    const row = Math.floor(0.5 * 40);
    for (let c = 0; c < 30; c++) expect(grid.cells[row * 30 + c]).toBe(1);
    expect(wiped(grid)).toBeGreaterThan(0.1);
    expect(wiped(grid)).toBeLessThan(MELT_AT);
  });

  it("melts once enough is wiped", () => {
    const grid = frostGrid();
    for (let v = 0.05; v < 1; v += 0.12) for (const p of strokePoints({ u: 0, v }, { u: 1, v }, 0.1, 1.3)) wipeAt(grid, p.u, p.v, 0.1, 1.3);
    expect(wiped(grid)).toBeGreaterThanOrEqual(MELT_AT);
  });

  it("defaults to the cottage, and keeps the sign short enough for the board", () => {
    expect(windowSchema.parse({})).toEqual({ look: "cottage" });
    expect(windowSchema.safeParse({ sign: "x".repeat(37) }).success).toBe(false);
    expect(getManifest("frosted-window")?.occasions).toEqual(["christmas"]);
  });
});
