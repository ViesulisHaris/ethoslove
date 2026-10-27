import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/haunted-house";
import { boltPoints, makeBolt, nextStrikeMs, thunderDelayMs } from "@/templates/haunted-house/bolt";
import { LIGHT_EVERY_MS, MAX_PHOTOS, photoOf, SILHOUETTES, WINDOWS } from "@/templates/haunted-house/windows";
import { fieldsSchema } from "@/templates/haunted-house/schema";
import { LOOKS } from "@/templates/haunted-house/looks";

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("the lightning", () => {
  it("runs from where it starts to where it lands, in a zigzag of 2^depth segments", () => {
    const pts = boltPoints(3, { x: 40, y: 0 }, { x: 55, y: 60 });
    expect(pts).toHaveLength(2 ** 5 + 1);
    expect(pts[0]).toEqual({ x: 40, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 55, y: 60 });
  });

  it("is the same for the same seed, and a different bolt for another", () => {
    expect(boltPoints(3, { x: 40, y: 0 }, { x: 55, y: 60 })).toEqual(boltPoints(3, { x: 40, y: 0 }, { x: 55, y: 60 }));
    expect(boltPoints(4, { x: 40, y: 0 }, { x: 55, y: 60 })).not.toEqual(boltPoints(3, { x: 40, y: 0 }, { x: 55, y: 60 }));
    expect(makeBolt(8, 100, 64)).toEqual(makeBolt(8, 100, 64));
    expect(makeBolt(9, 100, 64).main).not.toBe(makeBolt(8, 100, 64).main);
  });

  it("zigzags, but never wanders far from the straight line down", () => {
    const from = { x: 50, y: 0 };
    const to = { x: 50, y: 64 };
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const pts = boltPoints(seed, from, to);
      const reach = Math.max(...pts.map((p) => Math.abs(p.x - 50)));
      expect(reach).toBeGreaterThan(0.3);
      expect(reach).toBeLessThan(64 * 0.4);
    }
  });

  it("forks two or three times, from the lower part of the bolt, and stays inside the sky", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const bolt = makeBolt(seed, 100, 64);
      expect(bolt.forks.length).toBeGreaterThanOrEqual(2);
      expect(bolt.forks.length).toBeLessThanOrEqual(3);
      for (const d of [bolt.main, ...bolt.forks]) {
        expect(d.startsWith("M")).toBe(true);
        const ys = numbers(d).filter((_, i) => i % 2 === 1);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...ys)).toBeLessThanOrEqual(64);
      }
    }
  });

  it("strikes every few seconds, never in a rhythm and never so seldom the storm is forgotten", () => {
    const rolls = [0, 0.25, 0.5, 0.75, 0.999].map((r) => nextStrikeMs(() => r));
    for (const ms of rolls) {
      expect(ms).toBeGreaterThanOrEqual(3400);
      expect(ms).toBeLessThan(8100);
    }
    expect(new Set(rolls).size).toBe(rolls.length);
    for (const r of [0, 0.5, 0.999]) {
      expect(thunderDelayMs(() => r)).toBeGreaterThanOrEqual(350);
      expect(thunderDelayMs(() => r)).toBeLessThan(1300);
    }
  });
});

describe("the windows", () => {
  it("has six, each inside the house's box, none sharing a spot with another", () => {
    expect(WINDOWS).toHaveLength(6);
    expect(new Set(WINDOWS.map((w) => w.id)).size).toBe(6);
    for (const w of WINDOWS) {
      expect(w.cx - w.w / 2, w.id).toBeGreaterThan(0);
      expect(w.cx + w.w / 2, w.id).toBeLessThan(100);
      expect(w.cy - w.h / 2, w.id).toBeGreaterThan(0);
      expect(w.cy + w.h / 2, w.id).toBeLessThan(92);
    }
    for (const a of WINDOWS) for (const b of WINDOWS) if (a.id < b.id) expect(Math.abs(a.cx - b.cx) >= (a.w + b.w) / 2 || Math.abs(a.cy - b.cy) >= (a.h + b.h) / 2, `${a.id} and ${b.id}`).toBe(true);
  });

  it("keeps the windows clear of the door", () => {
    for (const w of WINDOWS) expect(w.cy + w.h / 2 < 76 || Math.abs(w.cx - 50) > 12, w.id).toBe(true);
  });

  it("gives the first windows to light the photos, one each, and the rest only a light", () => {
    expect(photoOf(0)).toEqual([null, null, null, null, null, null]);
    expect(photoOf(3)).toEqual([0, 1, 2, null, null, null]);
    expect(photoOf(6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(photoOf(40)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(photoOf(-1)).toEqual([null, null, null, null, null, null]);
    expect(MAX_PHOTOS).toBe(6);
  });

  it("has a figure for every window, all different", () => {
    expect(SILHOUETTES).toHaveLength(WINDOWS.length);
    expect(new Set(SILHOUETTES).size).toBe(SILHOUETTES.length);
  });

  it("lights them one at a time, quickly enough to take under three seconds", () => {
    expect(LIGHT_EVERY_MS * WINDOWS.length).toBeLessThan(3000);
  });
});

describe("the house as a template", () => {
  it("is a premium Halloween gift with a poster and a preview, and takes six photos", () => {
    expect(template.manifest.tier).toBe("premium");
    expect(template.manifest.occasions[0]).toBe("halloween");
    expect(template.manifest.thumbnail.poster).toBe("/templates/haunted-house/poster.jpg");
    expect(template.manifest.features.photos).toEqual({ min: 0, max: MAX_PHOTOS });
  });

  it("makes a complete gift from no fields", () => {
    expect(fieldsSchema.parse({})).toEqual({ look: "storm" });
    expect(fieldsSchema.safeParse({ look: "tornado" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ tag: "x".repeat(19) }).success).toBe(false);
  });

  it("asks for the tag first, and labels every field and option in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["tag", "look"]);
    const fields = describeObjectSchema(fieldsSchema);
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.look?.options ?? {}).sort()).toEqual(Object.keys(LOOKS).sort());
    }
  });

  it("gives every look a lit window, a flash and rain that can be told apart from the sky", () => {
    for (const [name, look] of Object.entries(LOOKS)) {
      expect(look.window[0], name).not.toBe(look.sky[0]);
      expect(look.bolt, name).toMatch(/^#/);
      expect(look.rain, name).toMatch(/^rgba\(/);
    }
  });
});
