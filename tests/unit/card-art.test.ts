import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cardArt, cardFiles, nameSize } from "@/lib/gift/card-art";
import { CARD_LOOKS, cardLookFor, shareCardUrl } from "@/lib/gift/share-card";

describe("the share card's envelope", () => {
  it("has every seal, bow and flower each paper draws on disk, as PNG", () => {
    for (const look of CARD_LOOKS) {
      expect(cardFiles(look).length, look).toBeGreaterThanOrEqual(3);
      for (const file of cardFiles(look)) expect(existsSync(join(process.cwd(), "src/share-card", `${file}.png`)), `${look} ${file}`).toBe(true);
    }
  });

  it("writes a short name big on one line, a long one smaller on two, and never below 96px", () => {
    expect(nameSize("Maya")).toEqual({ size: 300, lines: 1 });
    expect(nameSize("Alexandria").lines).toBe(1);
    expect(nameSize("Alexandria").size).toBeLessThan(300);
    expect(nameSize("Maximiliana Valentina Rose").lines).toBe(2);
    expect(nameSize("Bartholomewsworthington")).toEqual({ size: 96, lines: 1 });
  });

  it("draws each paper, in both languages, without the art if it is missing", () => {
    for (const look of CARD_LOOKS) {
      for (const locale of ["en", "es"] as const) expect(cardArt({ name: "Maya", look, locale, art: {} })).toBeTruthy();
    }
  });
});

describe("which paper a gift's card is on", () => {
  it("follows Coquette's and XOXO's looks, then the template, then the gift's own id (never black by chance)", () => {
    expect(cardLookFor("coquette", "rouge", "abc")).toBe("rouge");
    expect(cardLookFor("coquette", "bow", "abc")).toBe("noir");
    expect(cardLookFor("xoxo", "gothic", "abc")).toBe("noir");
    expect(cardLookFor("xoxo", "rose", "abc")).toBe("blush");
    expect(cardLookFor("coquette", "blush", "abc")).toBe("blush");
    expect(cardLookFor("fall-for-you", "sage", "abc")).toBe("pressed");
    expect(cardLookFor("bouquet", "rouge", "abc")).toBe("blush");
    const seeded = cardLookFor("photo-booth", undefined, "x7k2m9");
    expect(["blush", "rouge", "pressed"]).toContain(seeded);
    expect(cardLookFor("photo-booth", undefined, "x7k2m9")).toBe(seeded);
    expect(new Set(["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"].map((id) => cardLookFor(null, null, id))).size).toBeGreaterThan(1);
  });

  it("gives the card a new address when its paper changes", () => {
    const pink = shareCardUrl("abc123", { recipientName: "Ana", locale: "en", templateSlug: "coquette", look: "blush" });
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "en", templateSlug: "coquette", look: "bow" })).not.toBe(pink);
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "en", templateSlug: "coquette", look: "blush" })).toBe(pink);
  });
});
