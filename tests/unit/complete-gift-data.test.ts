import { describe, expect, it } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import { completeGiftData } from "@/lib/editor/complete-data";
import { TEMPLATE_SLUGS, loadTemplate } from "@/templates/registry";

/** A blank gift as the editor starts one (editor-shell's blankGift). */
const blank = (templateSlug = "the-letter", fields: Record<string, unknown> = { paper: "cream" }): GiftData => ({
  version: 1,
  templateSlug,
  locale: "en",
  title: "",
  recipientName: "",
  senderName: "",
  message: "",
  messageStyle: "typewriter",
  photos: [],
  accentColor: "#E8604C",
  fontPairing: "editorial",
  cover: "lilies",
  showReactionCta: true,
  watermark: true,
  fields,
});

describe("a gift the editor opens", () => {
  it("reads a draft saved before its first save (`{}`) as the blank gift a new one starts as", () => {
    const start = blank();
    // The 9 Nov crash: an empty draft row, opened for editing, stopped the editor at photos.map.
    expect(completeGiftData(start, {})).toBe(start);
    for (const nothing of [null, undefined, "", "x", 3, [], [{}]]) expect(completeGiftData(start, nothing)).toBe(start);
  });

  it("keeps a complete gift exactly as it was saved, every template's", async () => {
    for (const slug of TEMPLATE_SLUGS) {
      const mod = await loadTemplate(slug);
      for (const demo of Object.values(mod!.demoData)) {
        const stored = JSON.parse(JSON.stringify(demo));
        // Strict: not a key added, not one taken away, not a value changed.
        expect(completeGiftData(blank(slug, mod!.fieldsSchema.parse({}) as Record<string, unknown>), stored), slug).toStrictEqual(stored);
      }
    }
  }, 120_000);

  it("fills what the editor can't work without, and keeps what was saved as it was", () => {
    const partial = { recipientName: "Ana", senderName: "Marco", message: "Hi", fields: { ink: "blue" } };
    const done = completeGiftData(blank(), partial);
    expect(done).toMatchObject({ recipientName: "Ana", senderName: "Marco", message: "Hi", photos: [], title: "", watermark: true, locale: "en" });
    // Saved settings stay as saved; no cover, song or surprise the gift never had.
    expect(done.fields).toEqual({ ink: "blue" });
    for (const key of ["cover", "music", "voiceNote", "video", "countdown", "surprise", "dedication", "unwrap"]) expect(key in done, key).toBe(false);
    // And with no settings at all, the template's own.
    expect(completeGiftData(blank(), { recipientName: "Ana" }).fields).toEqual({ paper: "cream" });
  });

  it("swaps a piece of the wrong shape for the blank one's, and keeps the good ones", () => {
    const photo = { id: "p1", url: "gifts/g/p1.webp", width: 10, height: 10 };
    const odd = {
      recipientName: 7,
      photos: [photo, { id: 2 }, "x"],
      fields: "nope",
      accentColor: "red",
      locale: "fr",
      watermark: "yes",
      messageStyle: "slow",
      fontPairing: "comic",
      cover: "nope",
      music: "song.mp3",
      surprise: { text: "Pack a bag", reveal: "tap" },
    };
    const done = completeGiftData(blank(), odd);
    expect(done).toMatchObject({ recipientName: "", photos: [photo], fields: { paper: "cream" }, accentColor: "#E8604C", locale: "en", watermark: true, messageStyle: "typewriter", fontPairing: "editorial" });
    expect("cover" in done).toBe(false);
    expect("music" in done).toBe(false);
    expect(done.surprise).toEqual({ text: "Pack a bag", reveal: "tap" });
    expect(done.templateSlug).toBe("the-letter");
  });
});
