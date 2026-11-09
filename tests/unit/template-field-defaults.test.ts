import { describe, expect, it } from "vitest";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { withFieldDefaults } from "@/templates/_shared/field-defaults";
import { catchesPerLevel } from "@/templates/arcade/Game";
import { fieldsSchema as arcadeFields } from "@/templates/arcade/schema";
import { TEMPLATE_SLUGS, loadTemplate } from "@/templates/registry";

describe("template settings a gift left out or its template can't use", () => {
  it("give the Arcade gift of 9 Nov its 8 catches per level, and keep everything its sender set", () => {
    // Exactly what that gift had saved after an edit to it live: no perLevel at all.
    const saved = { crt: true, item: "heart", title: "Buggle's Birthday Quest" };
    expect(withFieldDefaults(arcadeFields, saved)).toEqual({ ...saved, perLevel: 8 });
    expect(saved).toEqual({ crt: true, item: "heart", title: "Buggle's Birthday Quest" });
  });

  it("fill a null its schema doesn't allow", () => {
    expect(withFieldDefaults(arcadeFields, { item: "star", perLevel: null, crt: false })).toEqual({ item: "star", perLevel: 8, crt: false });
  });

  it("bring a number back within its limits, and swap a choice the template can't take for its default", () => {
    expect(withFieldDefaults(arcadeFields, { item: "cake", perLevel: 88, crt: false })).toEqual({ item: "cake", perLevel: 20, crt: false });
    expect(withFieldDefaults(arcadeFields, { item: "kite", perLevel: 2, crt: "yes" })).toEqual({ item: "heart", perLevel: 3, crt: true });
    expect(withFieldDefaults(arcadeFields, { item: "star", perLevel: "8", crt: false })).toEqual({ item: "star", perLevel: 8, crt: false });
  });

  it("never change what the sender wrote, even past the editor's limits", () => {
    const long = { item: "star", perLevel: 5, crt: false, title: "A title far longer than the twenty-four letters" };
    expect(withFieldDefaults(arcadeFields, long)).toBe(long);
  });

  it("keep a sender's short list, even below the template's minimum, rather than swap it for an empty default", async () => {
    const jar = await loadTemplate("jar-of-reasons");
    const fields = { reasons: ["Your laugh", "Sunday pancakes"] };
    expect(withFieldDefaults(jar!.fieldsSchema, fields).reasons).toEqual(["Your laugh", "Sunday pancakes"]);
    // A list it left out entirely reads as the empty list a new gift starts with, never undefined.
    expect(withFieldDefaults(jar!.fieldsSchema, {}).reasons).toEqual([]);
  });

  it("add nothing a setting has no default for, keep keys the schema doesn't name, and hand back the same object when all is well", () => {
    const complete = { item: "star", perLevel: 5, crt: false, extra: "kept" };
    expect(withFieldDefaults(arcadeFields, complete)).toBe(complete);
    expect(withFieldDefaults(arcadeFields, { item: "star", perLevel: 5, crt: false })).not.toHaveProperty("title");
  });

  it("pass the settings through untouched for a schema it can't read, and never throw", () => {
    const fields = { a: 1 };
    expect(withFieldDefaults(undefined, fields)).toBe(fields);
    expect(withFieldDefaults(null, fields)).toBe(fields);
    expect(withFieldDefaults({ shape: null }, fields)).toBe(fields);
    const throwing = {
      shape: {
        a: {
          safeParse: () => {
            throw new Error("boom");
          },
        },
      },
    };
    expect(withFieldDefaults(throwing, fields)).toBe(fields);
  });

  for (const slug of TEMPLATE_SLUGS) {
    it(`${slug}: leaves its demo settings exactly as they are, and fills an empty gift as the editor seeds a new one`, async () => {
      const mod = await loadTemplate(slug);
      expect(mod).not.toBeNull();
      for (const locale of GIFT_LOCALES) {
        const fields = mod!.demoData[locale].fields as Record<string, unknown>;
        expect(withFieldDefaults(mod!.fieldsSchema, fields)).toBe(fields);
      }
      // The editor starts a new gift on fieldsSchema.parse({}): a gift with nothing saved reads the same,
      // and every setting with a default gets it.
      const seeded = mod!.fieldsSchema.safeParse({});
      const filled = withFieldDefaults(mod!.fieldsSchema, {});
      if (seeded.success) expect(filled).toEqual(seeded.data);
      const shape = (mod!.fieldsSchema as unknown as { shape?: Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }> }).shape ?? {};
      for (const [key, field] of Object.entries(shape)) {
        const fallback = field.safeParse(undefined);
        if (fallback.success && fallback.data !== undefined) expect(filled[key], `${slug}.${key}`).toEqual(fallback.data);
      }
    });
  }
});

describe("Arcade catches per level", () => {
  it("is always a number a level can be cleared with", () => {
    expect(catchesPerLevel(8)).toBe(8);
    expect(catchesPerLevel(17)).toBe(17);
    expect(catchesPerLevel(3)).toBe(3);
    expect(catchesPerLevel(20)).toBe(20);
    expect(catchesPerLevel(undefined)).toBe(8);
    expect(catchesPerLevel(null)).toBe(8);
    expect(catchesPerLevel(Number.NaN)).toBe(8);
    expect(catchesPerLevel("8")).toBe(8);
    expect(catchesPerLevel(88)).toBe(20);
    expect(catchesPerLevel(0)).toBe(3);
    expect(catchesPerLevel(7.6)).toBe(8);
  });
});
