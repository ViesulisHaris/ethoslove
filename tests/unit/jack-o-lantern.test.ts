import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/jack-o-lantern";
import { cutSeconds, FACES, GAP, LEAD, NAME_BAND, NAME_SECONDS, normalizeCarving, planCarve, progressBetween, TRAVEL } from "@/templates/jack-o-lantern/design";
import { fieldsSchema } from "@/templates/jack-o-lantern/schema";
import { LOOKS } from "@/templates/jack-o-lantern/looks";

describe("what is carved", () => {
  it("gives every face its own eyes and mouth, each a closed shape inside the pumpkin", () => {
    for (const [name, cuts] of Object.entries(FACES)) {
      expect(cuts.length, name).toBeGreaterThanOrEqual(4);
      expect(new Set(cuts.map((c) => c.id)).size, `${name} ids`).toBe(cuts.length);
      expect(cuts.some((c) => c.id === "eye-l"), name).toBe(true);
      expect(cuts.some((c) => c.id === "eye-r"), name).toBe(true);
      for (const cut of cuts) {
        expect(cut.d.startsWith("M"), `${name}.${cut.id}`).toBe(true);
        expect(cut.d.trim().endsWith("Z"), `${name}.${cut.id} closes`).toBe(true);
        // every number in the path is a coordinate in the 100 × 92 box (arc radii and flags are small, so they pass too)
        for (const n of cut.d.match(/-?\d+(\.\d+)?/g) ?? []) expect(Math.abs(Number(n)), `${name}.${cut.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps the face above the band the name is carved in", () => {
    for (const cuts of Object.values(FACES)) for (const cut of cuts) for (const n of (cut.d.match(/[ML] ?-?\d+(\.\d+)? -?\d+(\.\d+)?/g) ?? []).map((p) => Number(p.split(" ").pop()))) expect(n).toBeLessThan(NAME_BAND.y - NAME_BAND.size);
  });

  it("has two eyes that mirror each other across the middle", () => {
    for (const [name, cuts] of Object.entries(FACES)) {
      const xs = (id: string) => (cuts.find((c) => c.id === id)?.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
      const left = xs("eye-l");
      const right = xs("eye-r");
      expect(Math.min(...left) + Math.max(...right), name).toBeCloseTo(100, 0);
    }
  });
});

describe("the words on the belly", () => {
  it("writes capitals, keeps letters of any language and a little punctuation, and drops the rest", () => {
    expect(normalizeCarving("maya", "X")).toBe("MAYA");
    expect(normalizeCarving("  Zoë & Ana! ", "X")).toBe("ZOË & ANA!");
    expect(normalizeCarving("ça va ♥ 2026", "X")).toBe("ÇA VA 2026");
    expect(normalizeCarving("Ёлка", "X")).toBe("ЁЛКА");
  });

  it("cuts at 12 characters, never leaving a space on the end", () => {
    expect(normalizeCarving("abcdefghijklmnop", "X")).toBe("ABCDEFGHIJKL");
    expect(normalizeCarving("abcdefghijk lmnop", "X")).toBe("ABCDEFGHIJK");
  });

  it("falls back to the name when nothing printable is left", () => {
    expect(normalizeCarving("", "Maya")).toBe("MAYA");
    expect(normalizeCarving(undefined, "Maya")).toBe("MAYA");
    expect(normalizeCarving("♥♥♥", "Maya")).toBe("MAYA");
    expect(normalizeCarving("", "A very long name indeed")).toHaveLength(12);
  });
});

describe("the carving's timeline", () => {
  it("takes longer over a longer cut, within a floor and a ceiling", () => {
    expect(cutSeconds(0)).toBe(0.32);
    expect(cutSeconds(40)).toBeGreaterThan(cutSeconds(10));
    expect(cutSeconds(4000)).toBe(0.85);
  });

  it("does the cuts in order, each starting after the knife has travelled, and none overlapping", () => {
    const plan = planCarve([30, 30, 14, 120]);
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps[0].travelAt).toBe(LEAD);
    let at = LEAD;
    for (const step of plan.steps) {
      expect(step.travelAt).toBeGreaterThanOrEqual(at);
      expect(step.start).toBeCloseTo(step.travelAt + TRAVEL, 9);
      expect(step.end).toBeGreaterThan(step.start);
      at = step.end + GAP;
    }
  });

  it("carves the name last, in a fixed time, then leaves a breath", () => {
    const plan = planCarve([30, 30, 14, 120]);
    const last = plan.steps[plan.steps.length - 1];
    expect(plan.nameTravelAt).toBeCloseTo(last.end + GAP, 9);
    expect(plan.nameEnd - plan.nameStart).toBeCloseTo(NAME_SECONDS, 9);
    expect(plan.total).toBeGreaterThan(plan.nameEnd);
  });

  it("is over in a few seconds for every face, so nobody waits long for the candle", () => {
    for (const [name, cuts] of Object.entries(FACES)) {
      const plan = planCarve(cuts.map(() => 40));
      expect(plan.total, name).toBeLessThan(8);
      expect(plan.total, name).toBeGreaterThan(3);
    }
  });

  it("measures progress between two moments, held at 0 before and 1 after", () => {
    expect(progressBetween(0, 1, 3)).toBe(0);
    expect(progressBetween(2, 1, 3)).toBe(0.5);
    expect(progressBetween(9, 1, 3)).toBe(1);
    expect(progressBetween(5, 5, 5)).toBe(1);
    expect(progressBetween(4, 5, 5)).toBe(0);
  });
});

describe("the pumpkin as a template", () => {
  it("is a premium Halloween gift with a poster and a preview", () => {
    expect(template.manifest.tier).toBe("premium");
    expect(template.manifest.occasions[0]).toBe("halloween");
    expect(template.manifest.thumbnail.poster).toBe("/templates/jack-o-lantern/poster.jpg");
  });

  it("makes a complete gift from no fields", () => {
    expect(fieldsSchema.parse({})).toEqual({ look: "orange", face: "classic" });
    expect(fieldsSchema.safeParse({ face: "robot" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ carving: "x".repeat(13) }).success).toBe(false);
  });

  it("asks what is carved first, and labels every field and option in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["carving", "face", "look"]);
    const fields = describeObjectSchema(fieldsSchema);
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.look?.options ?? {}).sort()).toEqual(Object.keys(LOOKS).sort());
      expect(Object.keys(meta.face?.options ?? {}).sort()).toEqual(Object.keys(FACES).sort());
    }
  });
});
