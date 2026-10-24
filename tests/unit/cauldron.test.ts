import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/cauldron";
import { BOIL, bubbleSpecs, bubblesFor, FLY_MS, ingredientsFor, MAX_INGREDIENTS, potionColor, WORDS_MS } from "@/templates/cauldron/brew";
import { fieldsSchema } from "@/templates/cauldron/schema";
import { LOOKS } from "@/templates/cauldron/looks";

describe("what goes in the pot", () => {
  const fallback = ["your laugh", "your cold hands", "the way you say my name"];

  it("takes their ingredients as written, trimmed, with no empty ones, and never more than three", () => {
    expect(ingredientsFor(["  a pinch of your laugh ", "", "   ", "two cold hands"], fallback)).toEqual(["a pinch of your laugh", "two cold hands"]);
    expect(ingredientsFor(["a", "b", "c", "d", "e"], fallback)).toEqual(["a", "b", "c"]);
    expect(MAX_INGREDIENTS).toBe(3);
  });

  it("uses the template's three sweet ones when they gave none", () => {
    expect(ingredientsFor([], fallback)).toEqual(fallback);
    expect(ingredientsFor(undefined, fallback)).toEqual(fallback);
    expect(ingredientsFor(["", "  "], fallback)).toEqual(fallback);
  });

  it("does not hand back the fallback list itself, so nobody can change it", () => {
    expect(ingredientsFor([], fallback)).not.toBe(fallback);
  });
});

describe("what the potion does", () => {
  const liquid = LOOKS.witch.liquid;

  it("goes through its four colours as ingredients go in, and stays on the last", () => {
    expect([0, 1, 2, 3].map((n) => potionColor(liquid, n))).toEqual([...liquid]);
    expect(potionColor(liquid, 9)).toBe(liquid[3]);
    expect(potionColor(liquid, -2)).toBe(liquid[0]);
  });

  it("has four distinct colours in every look, so each ingredient visibly changes it", () => {
    for (const [name, look] of Object.entries(LOOKS)) expect(new Set(look.liquid).size, name).toBe(4);
  });

  it("bubbles harder with every ingredient", () => {
    expect(bubblesFor(0)).toBeLessThan(bubblesFor(1));
    expect(bubblesFor(1)).toBeLessThan(bubblesFor(2));
    expect(bubblesFor(2)).toBeLessThan(bubblesFor(3));
    expect(bubblesFor(-5)).toBe(bubblesFor(0));
  });

  it("makes the same bubbles every time, spread across the surface", () => {
    const bubbles = bubbleSpecs(11, 20);
    expect(bubbles).toHaveLength(20);
    expect(bubbleSpecs(11, 20)).toEqual(bubbles);
    expect(bubbleSpecs(12, 20)).not.toEqual(bubbles);
    for (const b of bubbles) {
      expect(b.x).toBeGreaterThan(0.1);
      expect(b.x).toBeLessThan(0.9);
      expect(b.size).toBeGreaterThan(0.6);
      expect(b.size).toBeLessThan(2.3);
      expect(b.dur).toBeGreaterThan(1.4);
      expect(b.delay).toBeLessThanOrEqual(0);
    }
    expect(Math.max(...bubbles.map((b) => b.x)) - Math.min(...bubbles.map((b) => b.x))).toBeGreaterThan(0.4);
  });

  it("lets the words of an ingredient hang longer than it takes to land, and the heart come before the bottle", () => {
    expect(WORDS_MS).toBeGreaterThan(FLY_MS);
    expect(BOIL.heart).toBeLessThan(BOIL.bottle);
  });
});

describe("the brew as a template", () => {
  it("is a premium Halloween gift with a poster and a preview", () => {
    expect(template.manifest.tier).toBe("premium");
    expect(template.manifest.occasions[0]).toBe("halloween");
    expect(template.manifest.thumbnail.poster).toBe("/templates/cauldron/poster.jpg");
  });

  it("makes a complete gift from no fields, which brews the three sweet ones", () => {
    expect(fieldsSchema.parse({})).toEqual({ look: "witch", ingredients: [] });
    expect(fieldsSchema.safeParse({ ingredients: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ ingredients: [""] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ potion: "x".repeat(27) }).success).toBe(false);
  });

  it("holds a Spanish ingredient of a natural length, since Spanish runs longer", () => {
    expect(fieldsSchema.safeParse({ ingredients: ["dos manos frías en mi bolsillo", "cada «¿sigues ahí?» de las 3am"] }).success).toBe(true);
  });

  it("asks for the ingredients first, as a list, and labels every field and option in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["ingredients", "potion", "look"]);
    const fields = describeObjectSchema(fieldsSchema);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.ingredients.widget).toBe("list");
    expect(byKey.ingredients.maxItems).toBe(3);
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.look?.options ?? {}).sort()).toEqual(Object.keys(LOOKS).sort());
      expect(meta.ingredients?.addLabel).toBeTruthy();
    }
  });

  it("brews its own demo: every ingredient in both languages is one the schema accepts", () => {
    for (const locale of ["en", "es"] as const) {
      const demo = template.demoData[locale];
      expect(demo.fields.ingredients.length).toBeGreaterThan(0);
      expect(demo.fields.ingredients.length).toBeLessThanOrEqual(3);
      expect(fieldsSchema.safeParse(demo.fields).success, locale).toBe(true);
    }
  });
});
