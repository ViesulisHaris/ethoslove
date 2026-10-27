import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ofKind, SCRAP_IDS, SCRAPS, scrapSrc } from "@/templates/_shared/collage/scraps";
import { dots, gingham, initials, plainWords, printed, scriptLines, stripes, ticketNumber, tornPolygon } from "@/templates/_shared/collage/paper";
import { scatterHeight, scatterSpots } from "@/templates/_shared/collage/layout";
import type { FieldMeta } from "@/templates/types";
import type { LookSwatch } from "@/templates/_shared/look-swatches";
import { arrangePhotos, LOOKS as COQUETTE, LOOK_ORDER as COQUETTE_ORDER, stripHeight, SWATCHES as COQUETTE_SWATCHES, TRINKETS } from "@/templates/coquette/looks";
import { fieldsSchema as coquetteFields } from "@/templates/coquette/schema";
import { fieldMeta as coquetteMeta } from "@/templates/coquette/field-meta";
import { addKiss, burstKisses, decor, DECOR, highlightPlan, kissAt, LOOKS as XOXO, LOOK_ORDER as XOXO_ORDER, MAX_KISSES, SWATCHES as XOXO_SWATCHES, type DecorSlot, type Kiss } from "@/templates/xoxo/looks";
import { fieldsSchema as xoxoFields } from "@/templates/xoxo/schema";
import { fieldMeta as xoxoMeta } from "@/templates/xoxo/field-meta";
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

/** The look picker is built from these, so a look missing from one of them is a swatch with no name, or a look nobody can pick. */
function offersEveryLook(looks: object, order: readonly string[], swatches: Record<string, LookSwatch>, options: readonly string[], meta: Record<"en" | "es", Record<string, FieldMeta>>) {
  expect([...order].sort()).toEqual(Object.keys(looks).sort());
  expect([...options].sort()).toEqual(Object.keys(looks).sort());
  expect(Object.keys(swatches)).toEqual(order);
  for (const id of order) {
    for (const colour of Object.values(swatches[id])) expect(colour, id).toMatch(/^#[0-9A-F]{6}$/i);
    expect(meta.en.look.options?.[id], id).toBeTruthy();
    expect(meta.es.look.options?.[id], id).toBeTruthy();
  }
}

describe("the looks", () => {
  it("offers every Coquette look as a swatch, in the schema and named in both languages", () => {
    offersEveryLook(COQUETTE, COQUETTE_ORDER, COQUETTE_SWATCHES, coquetteFields.shape.look.unwrap().options, coquetteMeta);
  });

  it("offers every XOXO look the same way", () => {
    offersEveryLook(XOXO, XOXO_ORDER, XOXO_SWATCHES, xoxoFields.shape.look.unwrap().options, xoxoMeta);
  });

  it("recolours every Coquette look that reuses Blush's flowers, and leaves the ones with their own", () => {
    const blush = Object.values(COQUETTE.blush.flowers);
    for (const [id, look] of Object.entries(COQUETTE)) {
      const reused = Object.values(look.flowers).every((f, i) => f === blush[i]);
      expect(!!look.bloom, id).toBe(id !== "blush" && reused);
    }
  });

  // A screen recording of a page in one of these must not be a recolouring of another: they share
  // no flower with Blush, bring their own trinkets and print the page differently.
  it("gives Coquette's last three looks their own flowers, trinkets and print", () => {
    const blush = new Set(Object.values(COQUETTE.blush.flowers));
    for (const id of ["rouge", "pressed", "bow"] as const) {
      const look = COQUETTE[id];
      expect(Object.values(look.flowers).filter((f) => blush.has(f)).length, id).toBeLessThanOrEqual(2);
      expect(look.trinkets, id).toBeDefined();
      for (const trinket of Object.values(look.trinkets ?? TRINKETS)) expect(SCRAPS[trinket], `${id} ${trinket}`).toBeDefined();
      expect(Object.values(look.trinkets ?? {}).filter((x) => Object.values(TRINKETS).includes(x)).length, id).toBe(0);
      expect(look.print, id).toBeDefined();
      expect(look.tint, id).toBeUndefined();
    }
  });

  it("puts a real cut-out in every XOXO slot, and gives the last three a set of their own", () => {
    const slots = Object.keys(DECOR) as DecorSlot[];
    for (const [id, look] of Object.entries(XOXO)) {
      for (const slot of slots) expect(SCRAPS[decor(look, slot).id], `${id} ${slot}`).toBeDefined();
    }
    for (const id of ["cream", "blush", "lilac", "blue", "sage", "mocha", "noir"] as const) {
      expect(slots.every((slot) => decor(XOXO[id], slot).id === DECOR[slot] && !decor(XOXO[id], slot).tone), id).toBe(true);
    }
    for (const id of ["rose", "gothic", "letters"] as const) {
      const changed = slots.filter((slot) => { const piece = decor(XOXO[id], slot); return piece.id !== DECOR[slot] || !!piece.tone; });
      expect(changed.length / slots.length, id).toBeGreaterThanOrEqual(0.8);
    }
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

  it("prints pinstripes and polka dots, and gingham when asked for it", () => {
    expect(stripes("red", "10px")).toEqual({ backgroundImage: "linear-gradient(90deg, red 0 22%, transparent 22% 100%)", backgroundSize: "10px 100%" });
    expect(dots("red", "10px").backgroundPosition).toBe("0 0, calc(10px / 2) calc(10px / 2)");
    expect(printed("gingham", "red", "10px")).toEqual(gingham("red", "10px"));
    expect(printed("stripes", "red", "10px")).toEqual(stripes("red", "10px"));
    expect(printed("dots", "red", "10px")).toEqual(dots("red", "10px"));
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

describe("XOXO's seal bursting into kisses", () => {
  it("throws the same ring for the same names, and a different one for others", () => {
    expect(burstKisses(42)).toEqual(burstKisses(42));
    expect(burstKisses(42)).not.toEqual(burstKisses(43));
  });

  it("spaces the prints round the whole circle, every one a real kiss cut-out", () => {
    const ring = burstKisses(7);
    expect(ring).toHaveLength(8);
    const kisses = new Set(ofKind("kiss"));
    ring.forEach((k, i) => {
      expect(kisses.has(k.scrap)).toBe(true);
      // each stays near its own slot, so no two land on top of each other
      expect(Math.abs(k.angle - (i / ring.length) * 360)).toBeLessThanOrEqual(12);
    });
  });

  it("keeps the throw and the size of every print in range", () => {
    for (const k of burstKisses(99, 12)) {
      expect(k.distance).toBeGreaterThanOrEqual(38);
      expect(k.distance).toBeLessThanOrEqual(52);
      expect(k.w).toBeGreaterThanOrEqual(10);
      expect(k.w).toBeLessThanOrEqual(15);
      expect(k.delay).toBeLessThan(0.1);
    }
  });
});
