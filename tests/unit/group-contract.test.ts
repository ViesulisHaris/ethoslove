/**
 * A group card's contract: what `data.contributions` may hold, what a template that takes them
 * declares, and the places that must treat a contribution's photo like any other of the gift's
 * media (the publish checks, the recipient's copy, the storage walk, the editor's repair of a draft).
 */
import { describe, expect, it } from "vitest";
import { CONTRIBUTION_LIMITS, giftContributionSchema, giftDataBaseSchema, type GiftData } from "@/lib/gift/schema";
import { readinessProblems } from "@/lib/gift/publish";
import { BLANK_IMAGE, mediaUrlsAllowed, withoutForeignMedia } from "@/lib/gift/media-urls";
import { giftStoragePaths } from "@/lib/gift/storage-paths";
import { completeGiftData } from "@/lib/editor/complete-data";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { ADVENT_CALENDAR_LIVE } from "@/templates/held";
import { manifest as letter } from "@/templates/the-letter/manifest";
import type { TemplateManifest } from "@/templates/types";

/** A template made for a group card, as one declares it (the development one is checked in group-dev-template.test.ts). */
const reference: TemplateManifest = { ...letter, slug: "group-reference", tier: "premium", features: { ...letter.features, photos: { min: 0, max: 8 }, group: { min: 0, max: 25, noteMax: 140, photos: true } } };

const GIFT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const key = (n: number) => `k${String(n).padStart(9, "0")}`;
const note = (n: number, over: Record<string, unknown> = {}) => ({ key: key(n), name: `Guest ${n}`, note: "Happy birthday", ...over });

const base: GiftData = {
  version: 1,
  templateSlug: "group-reference",
  locale: "en",
  title: "",
  recipientName: "Ana",
  senderName: "Marco",
  message: "Hi",
  messageStyle: "typewriter",
  photos: [],
  accentColor: "#B23A2E",
  fontPairing: "editorial",
  showReactionCta: true,
  watermark: true,
  fields: {},
};

describe("what a contribution may be", () => {
  it("is a key, a name of up to 24 and a note of up to 280, with or without a photo", () => {
    expect(CONTRIBUTION_LIMITS).toEqual({ max: 25, name: 24, note: 280 });
    expect(giftContributionSchema.safeParse(note(1)).success).toBe(true);
    expect(giftContributionSchema.safeParse(note(1, { photo: { url: `gifts/${GIFT}/c${key(1)}.webp`, width: 800, height: 600 } })).success).toBe(true);
    expect(giftContributionSchema.safeParse(note(1, { name: "x".repeat(25) })).success).toBe(false);
    expect(giftContributionSchema.safeParse(note(1, { note: "x".repeat(281) })).success).toBe(false);
    expect(giftContributionSchema.safeParse(note(1, { name: "   " })).success).toBe(false);
    expect(giftContributionSchema.safeParse(note(1, { note: "" })).success).toBe(false);
    // A database id is never a key.
    expect(giftContributionSchema.safeParse(note(1, { key: GIFT })).success).toBe(false);
    expect(giftContributionSchema.safeParse(note(1, { key: "ABCDEFGHIJ" })).success).toBe(false);
  });

  it("a gift holds at most 25, each key once, and none at all when it isn't a group card", () => {
    const parse = (contributions: unknown) => giftDataBaseSchema.safeParse({ ...base, contributions });
    expect(giftDataBaseSchema.parse(base).contributions).toBeUndefined();
    expect(parse([]).success).toBe(true);
    expect(parse(Array.from({ length: 25 }, (_, i) => note(i))).success).toBe(true);
    expect(parse(Array.from({ length: 26 }, (_, i) => note(i))).success).toBe(false);
    expect(parse([note(1), note(1)]).success).toBe(false);
    expect(parse("six notes").success).toBe(false);
  });
});

describe("what a template that takes contributions declares", () => {
  it("stays inside the ceilings, in every manifest that declares it", () => {
    for (const manifest of [...TEMPLATE_MANIFESTS, reference]) {
      const group = manifest.features.group;
      if (!group) continue;
      expect(group.min, manifest.slug).toBeGreaterThanOrEqual(0);
      expect(group.max, manifest.slug).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.max);
      expect(group.max, manifest.slug).toBeGreaterThanOrEqual(Math.max(1, group.min));
      expect(group.noteMax, manifest.slug).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.note);
      expect(group.noteMax, manifest.slug).toBeGreaterThanOrEqual(20);
    }
  });

  it("no template in the gallery declares it until the Advent Calendar is put there, and then only it", () => {
    // While it is held back (src/templates/held.ts) nothing is on sale; its switch is the one thing that changes this.
    expect(TEMPLATE_MANIFESTS.filter((manifest) => manifest.features.group).map((manifest) => manifest.slug)).toEqual(ADVENT_CALENDAR_LIVE ? ["advent-calendar"] : []);
  });
});

describe("what stops a group card from being sent", () => {
  const strict = { ...reference, features: { ...reference.features, group: { min: 2, max: 3, noteMax: 20, photos: true } } };

  it("too few notes, too many, or one longer than the template has room for", () => {
    expect(readinessProblems(strict, { ...base, contributions: [note(1)] })).toEqual(["contributionsMin"]);
    expect(readinessProblems(strict, { ...base, contributions: [1, 2, 3, 4].map((n) => note(n)) })).toEqual(["contributionsMax"]);
    expect(readinessProblems(strict, { ...base, contributions: [note(1), note(2, { note: "x".repeat(21) })] })).toEqual(["contributionNote"]);
    expect(readinessProblems(strict, { ...base, contributions: [note(1), note(2)] })).toEqual([]);
    expect(readinessProblems(strict, base)).toEqual(["contributionsMin"]);
  });

  it("the reference template stands with none", () => {
    expect(readinessProblems(reference, base)).toEqual([]);
  });

  it("a template that takes none is never held to them", () => {
    const data = { ...base, templateSlug: "the-letter", photos: [{ id: "a", url: `gifts/${GIFT}/a.webp`, width: 1, height: 1 }], contributions: Array.from({ length: 25 }, (_, i) => note(i, { note: "x".repeat(280) })) };
    expect(readinessProblems(letter, data)).toEqual([]);
  });
});

describe("a contribution's photo is one of the gift's files", () => {
  const mine = `gifts/${GIFT}/c${key(1)}.webp`;

  it("is found by the storage walk, so it is owned, signed and kept like any other", () => {
    expect(giftStoragePaths({ ...base, contributions: [note(1, { photo: { url: mine, width: 8, height: 8 } }), note(2)] })).toEqual([mine]);
  });

  it("may only point where a photo may: the gift's own folder, never somewhere else", () => {
    const withPhoto = (url: string) => ({ ...base, contributions: [note(1, { photo: { url, width: 8, height: 8 } })] });
    expect(mediaUrlsAllowed(withPhoto(mine))).toBe(true);
    expect(mediaUrlsAllowed(withPhoto("https://evil.example/pixel.gif"))).toBe(false);
    expect(mediaUrlsAllowed(withPhoto("/auth/confirm?token_hash=abc"))).toBe(false);
    expect(mediaUrlsAllowed(withPhoto("contributions/a/b.webp"))).toBe(false);
  });

  it("a refused photo never reaches a recipient: the note keeps its words", () => {
    const shown = withoutForeignMedia({ ...base, contributions: [note(1, { photo: { url: "https://evil.example/pixel.gif", width: 8, height: 8 } }), note(2, { photo: { url: mine, width: 8, height: 8 } })] });
    expect(shown.contributions).toEqual([note(1), note(2, { photo: { url: mine, width: 8, height: 8 } })]);
    expect(JSON.stringify(shown)).not.toContain("evil.example");
    expect(JSON.stringify(shown)).not.toContain(BLANK_IMAGE);
  });

  it("a gift without contributions comes back with no such key", () => {
    expect("contributions" in withoutForeignMedia(base)).toBe(false);
  });
});

describe("a draft the editor opens", () => {
  it("keeps a list of whole notes and drops anything else", () => {
    expect(completeGiftData(base, { ...base, contributions: [note(1), { key: 5 }, "x", note(2, { photo: "nope" })] }).contributions).toEqual([note(1)]);
    expect("contributions" in completeGiftData(base, { ...base, contributions: "six" })).toBe(false);
    expect("contributions" in completeGiftData(base, { ...base })).toBe(false);
  });
});
