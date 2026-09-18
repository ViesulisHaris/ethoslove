import { describe, expect, it } from "vitest";
import { arrange, expandStems } from "@/templates/bouquet/arrange";
import { FLOWERS, MAX_STEMS, toneOf } from "@/templates/bouquet/catalogue";
import { DEFAULT_STEMS } from "@/templates/bouquet/catalogue";
import { fieldsSchema } from "@/templates/bouquet/schema";

describe("bouquet", () => {
  it("arranges the same stems the same way every time, and differently per seed", () => {
    expect(arrange(DEFAULT_STEMS, 3)).toEqual(arrange(DEFAULT_STEMS, 3));
    expect(arrange(DEFAULT_STEMS, 3)).not.toEqual(arrange(DEFAULT_STEMS, 4));
  });

  it("draws one head per bloom and frames every bouquet with greens", () => {
    const a = arrange(DEFAULT_STEMS, 1);
    const blooms = expandStems(DEFAULT_STEMS).filter((s) => FLOWERS[s.id].role === "focal").length;
    expect(a.heads).toHaveLength(blooms);
    expect(a.greens.length).toBeGreaterThanOrEqual(2);
  });

  it("never holds more than the stem limit", () => {
    const many = [
      { flower: "rose" as const, color: "red", count: 12 },
      { flower: "tulip" as const, color: "red", count: 12 },
      { flower: "daisy" as const, color: "white", count: 1 },
    ];
    expect(expandStems(many)).toHaveLength(MAX_STEMS);
    expect(fieldsSchema.safeParse({ stems: many }).success).toBe(false);
  });

  it("falls back to a flower's first colour", () => {
    expect(toneOf("sunflower", "blue").color).toBe("yellow");
  });

  it("starts a new gift with the default bouquet", () => {
    expect(fieldsSchema.parse({}).stems).toEqual(DEFAULT_STEMS);
  });
});
