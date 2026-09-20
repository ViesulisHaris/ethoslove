import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ofKind, SCRAP_IDS, SCRAPS, scrapSrc } from "@/templates/_shared/collage/scraps";
import { gingham, initials, plainWords, scriptLines, ticketNumber, tornPolygon } from "@/templates/_shared/collage/paper";
import { scatterHeight, scatterSpots } from "@/templates/_shared/collage/layout";
import { arrangePhotos, LOOKS as COQUETTE, stripHeight } from "@/templates/coquette/looks";
import { addKiss, highlightPlan, kissAt, MAX_KISSES, type Kiss } from "@/templates/xoxo/looks";
import { PRESSED_PITCH, pressedHeight, pressedSpots } from "@/templates/keepsake/looks";

describe("the scraps", () => {
  it("has a file on disk for every scrap in the catalogue", () => {
    expect(SCRAP_IDS.length).toBeGreaterThanOrEqual(50);
    for (const id of SCRAP_IDS) {
      expect(existsSync(join(process.cwd(), "public", scrapSrc(id))), id).toBe(true);
      expect(SCRAPS[id].w).toBeGreaterThan(60);
      expect(SCRAPS[id].h).toBeGreaterThan(60);
    }
  });

  it("has a flower for every slot in both of Coquette's looks, and enough kisses to go round", () => {
    expect(ofKind("pink-flower").length).toBeGreaterThanOrEqual(10);
    expect(ofKind("blue-flower").length).toBeGreaterThanOrEqual(10);
    expect(ofKind("kiss").length).toBeGreaterThanOrEqual(5);
    for (const look of Object.values(COQUETTE)) {
      const flowers = Object.values(look.flowers);
      expect(new Set(flowers).size).toBe(flowers.length);
      for (const id of flowers) expect(SCRAPS[id]).toBeDefined();
    }
    expect(Object.values(COQUETTE.blue.flowers).every((id) => SCRAPS[id].kind === "blue-flower")).toBe(true);
  });
});

describe("paper", () => {
  it("tears only the sides it is told to, the same way every time", () => {
    const points = (polygon: string) => [...polygon.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const onEdge = ([x, y]: number[]) => x === 0 || x === 100 || y === 0 || y === 100;
    const straight = tornPolygon(7, {}, 4);
    expect(points(straight).every(onEdge)).toBe(true);
    const torn = tornPolygon(7, { top: true }, 4);
    expect(torn).not.toBe(straight);
    // Only the top wanders: every point off the edge is within the tear's depth of it.
    const inside = points(torn).filter((pt) => !onEdge(pt));
    expect(inside.length).toBeGreaterThan(8);
    expect(inside.every(([, y]) => y > 0 && y <= 4)).toBe(true);
    expect(tornPolygon(7, { top: true }, 4)).toBe(torn);
    expect(tornPolygon(8, { top: true }, 4)).not.toBe(torn);
    // Every point stays inside the box, so nothing is ever clipped to nothing.
    for (const n of tornPolygon(3, { top: true, right: true, bottom: true, left: true }, 6).match(/-?\d+(\.\d+)?(?=%)/g) ?? []) {
      expect(Number(n)).toBeGreaterThanOrEqual(0);
      expect(Number(n)).toBeLessThanOrEqual(100);
    }
  });

  it("writes the sender's own words across the sheet, without the markup", () => {
    expect(plainWords("**Thirty.** You *said* it\n\nout loud")).toEqual(["Thirty.", "You", "said", "it", "out", "loud"]);
    const lines = scriptLines("one two three four five six seven eight nine ten eleven twelve thirteen", "house words here", 5, 11);
    expect(lines).toHaveLength(5);
    expect(lines.every((l) => l.split(" ").length === 7)).toBe(true);
    expect(lines.join(" ")).not.toContain("house");
    expect(scriptLines("too short", "house words fill the rest of the page nicely every time", 3, 1).join(" ")).toContain("house");
    expect(scriptLines("", "", 4, 1)).toEqual([]);
  });

  it("numbers a ticket with six figures, engraves initials, and draws gingham", () => {
    expect(ticketNumber(12345)).toMatch(/^\d{6}$/);
    expect(ticketNumber(12345)).toBe(ticketNumber(12345));
    expect(initials("elena", "Sam")).toBe("E + S");
    expect(initials("  ", "Sam")).toBe("S");
    expect(initials("Élodie", "ñam")).toBe("É + Ñ");
    expect(gingham("red", "10px").backgroundSize).toBe("calc(2 * 10px) calc(2 * 10px)");
  });
});

describe("where the photos go", () => {
  it("Coquette: the first is the hero, three fill the strip, the rest scatter", () => {
    const photos = Array.from({ length: 12 }, (_, i) => i);
    const { hero, strip, scatter } = arrangePhotos(photos);
    expect(hero).toBe(0);
    expect(strip).toEqual([1, 2, 3]);
    expect(scatter).toEqual([4, 5, 6, 7, 8, 9]);
    expect(arrangePhotos([0]).strip).toEqual([]);
    expect(arrangePhotos<number>([]).hero).toBeUndefined();
    expect(stripHeight(0)).toBe(0);
    expect(stripHeight(3)).toBeGreaterThan(stripHeight(2));
  });

  it("scatters polaroids in two columns inside the page, a lone last one in the middle", () => {
    for (let n = 0; n <= 6; n++) {
      const spots = scatterSpots(n);
      expect(spots).toHaveLength(n);
      for (const s of spots) {
        expect(s.x - s.w / 2).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w / 2).toBeLessThanOrEqual(100);
        expect(s.y + s.w * 0.75).toBeLessThanOrEqual(scatterHeight(n) + 30);
      }
      if (n % 2 === 1) expect(spots[n - 1].x).toBe(50);
    }
    expect(scatterHeight(0)).toBe(0);
    expect(scatterHeight(4)).toBeGreaterThan(scatterHeight(2));
  });

  it("Keepsake: presses the photos left, right, left, each with something kept on the other side", () => {
    const spots = pressedSpots(5);
    expect(spots.map((s) => s.side)).toEqual(["left", "right", "left", "right", "left"]);
    spots.forEach((s, i) => {
      expect(s.companion.x > 50).toBe(s.side === "left");
      expect(SCRAPS[s.companion.scrap]).toBeDefined();
      if (i > 0) expect(s.y - spots[i - 1].y).toBe(PRESSED_PITCH);
    });
    expect(pressedHeight(0)).toBe(0);
    expect(pressedHeight(5)).toBeGreaterThan(spots[4].y + 40);
  });
});

describe("XOXO", () => {
  it("marks up a few runs of words, never touching, never the same pen twice running", () => {
    const plan = highlightPlan(24, 99);
    expect(plan.length).toBeGreaterThanOrEqual(2);
    expect(plan.length).toBeLessThanOrEqual(5);
    plan.forEach((h, i) => {
      expect(h.length).toBeGreaterThanOrEqual(1);
      expect(h.length).toBeLessThanOrEqual(3);
      expect(h.start + h.length).toBeLessThanOrEqual(24);
      if (i > 0) {
        expect(h.start).toBeGreaterThan(plan[i - 1].start + plan[i - 1].length);
        expect(h.mark).not.toBe(plan[i - 1].mark);
      }
    });
    expect(highlightPlan(24, 99)).toEqual(plan);
    expect(highlightPlan(0, 99)).toEqual([]);
    expect(highlightPlan(2, 5).every((h) => h.start + h.length <= 2)).toBe(true);
  });

  it("leaves kisses where they tap, and lets the oldest go past the limit", () => {
    const kiss = kissAt(1, 40.26, 120.04, 7);
    expect(kiss).toMatchObject({ id: 1, x: 40.3, y: 120 });
    expect(SCRAPS[kiss.scrap].kind).toBe("kiss");
    expect(kissAt(1, 40.26, 120.04, 7)).toEqual(kiss);
    let page: Kiss[] = [];
    for (let i = 1; i <= MAX_KISSES + 4; i++) page = addKiss(page, kissAt(i, i, i, 7));
    expect(page).toHaveLength(MAX_KISSES);
    expect(page[0].id).toBe(5);
    expect(page[page.length - 1].id).toBe(MAX_KISSES + 4);
  });
});
