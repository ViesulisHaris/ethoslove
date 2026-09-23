import { describe, expect, it } from "vitest";
import { firstGrapheme, graphemes, initialOf, sliceGraphemes } from "@/lib/gift/graphemes";

describe("cutting names on characters a reader sees", () => {
  it("never leaves half an emoji", () => {
    expect(initialOf("😘Anna")).toBe("😘");
    expect(sliceGraphemes("Anna 😘😘😘😘", 8)).toBe("Anna 😘😘😘");
    expect(sliceGraphemes("Anna 😘😘😘😘", 8)).not.toContain("�");
  });

  it("keeps joined emoji, flags and accents whole", () => {
    expect(firstGrapheme("👩‍❤️‍👨 us")).toBe("👩‍❤️‍👨");
    expect(firstGrapheme("🇪🇸 Lucía")).toBe("🇪🇸");
    expect(graphemes("Zoé")).toHaveLength(3);
  });

  it("upper-cases a letter and falls back on an empty name", () => {
    expect(initialOf("  leo")).toBe("L");
    expect(initialOf("", "♥")).toBe("♥");
    expect(initialOf("   ", "♥")).toBe("♥");
  });
});
