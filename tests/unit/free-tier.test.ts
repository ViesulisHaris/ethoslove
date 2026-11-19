import { beforeEach, describe, expect, it, vi } from "vitest";
import { decidePublish, liveEditNeedsUnlock, premiumExtras, readinessProblems } from "@/lib/gift/publish";
import { FREE_NOTE_MAX_CHARS, noteCanBeFree, noteLength, noteRules } from "@/lib/gift/free-tier";
import { freeTestEvent } from "@/lib/analytics/track";
import { completeGiftData } from "@/lib/editor/complete-data";
import { createGiftSchema } from "@/lib/gift/schema";
import { manifest as letter } from "@/templates/the-letter/manifest";
import { fieldsSchema as letterSchema } from "@/templates/the-letter/schema";
import { manifest as constellations } from "@/templates/constellations/manifest";
import type { GiftData } from "@/lib/gift/schema";

const photo = (url: string) => ({ id: url, url, width: 10, height: 10 });

const classic: GiftData = {
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "Ana",
  senderName: "Marco",
  message: "Hi",
  messageStyle: "typewriter",
  photos: [photo("gifts/g1/a.webp")],
  accentColor: "#B23A2E",
  fontPairing: "editorial",
  showReactionCta: true,
  watermark: true,
  fields: {},
};
const note: GiftData = { ...classic, freeTier: "note", photos: [] };
const none = { removeWatermark: false, schedule: false, password: false };
const premium = { ...letter, slug: "coquette", tier: "premium" as const };
const flags = { hasSchedule: false, hasPassword: false, watermark: true };
const long = "a".repeat(FREE_NOTE_MAX_CHARS + 1);

describe("the free Letter as a short note", () => {
  it("only a Letter that says so is held to it", () => {
    expect(noteRules(letter, note)).toBe(true);
    expect(noteRules(letter, classic)).toBe(false);
    // Constellations is in the test too; it differs in having no free version (below).
    expect(noteRules(constellations, { freeTier: "note" })).toBe(true);
    expect(noteRules(constellations, {})).toBe(false);
    expect(noteRules(premium, { freeTier: "note" })).toBe(false);
    expect(noteRules(letter, { freeTier: "something else" })).toBe(false);
    // The editor asks before its gift has loaded: that must be a plain no, never a crash.
    expect(noteRules(letter, null)).toBe(false);
    expect(noteRules(letter, undefined)).toBe(false);
  });

  it("goes out free with no photos at all, footer on", () => {
    expect(readinessProblems(letter, note)).toEqual([]);
    expect(decidePublish(letter, note, { unlocked: false }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
  });

  it("a Letter under the earlier rules still needs its photo, and still sends ten free", () => {
    expect(readinessProblems(letter, { ...classic, photos: [] })).toContain("photosMin");
    const ten = { ...classic, photos: Array.from({ length: 10 }, (_, i) => photo(`gifts/g1/${i}.webp`)) };
    expect(decidePublish(letter, ten, { unlocked: false }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
  });

  it("one photo makes it the paid version", () => {
    const withPhoto = { ...note, photos: [photo("gifts/g1/a.webp")] };
    expect(premiumExtras(withPhoto, { note: true })).toEqual(["photos"]);
    expect(decidePublish(letter, withPhoto, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, withPhoto, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: false });
  });

  it("a letter past the free length makes it the paid version; one at the length does not", () => {
    const atLimit = { ...note, message: "a".repeat(FREE_NOTE_MAX_CHARS) };
    expect(decidePublish(letter, atLimit, { unlocked: false }, none).ok).toBe(true);
    expect(premiumExtras({ ...note, message: long }, { note: true })).toEqual(["longLetter"]);
    expect(decidePublish(letter, { ...note, message: long }, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, { ...note, message: long }, { unlocked: true }, none).ok).toBe(true);
  });

  it("counts the letter the way a person does", () => {
    expect(noteLength("  hi  ")).toBe(2);
    expect(noteLength("💌💌")).toBe(2);
    expect(noteLength("")).toBe(0);
    // Blank space at the edges never tips a note over.
    expect(premiumExtras({ ...note, message: `${"a".repeat(FREE_NOTE_MAX_CHARS)}   \n` }, { note: true })).toEqual([]);
  });

  it("names photos and length in place of 'more than ten photos'", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => photo(`gifts/g1/${i}.webp`));
    expect(premiumExtras({ ...classic, photos: eleven })).toEqual(["morePhotos"]);
    expect(premiumExtras({ ...note, photos: eleven, message: long }, { note: true })).toEqual(["photos", "longLetter"]);
  });

  it("leaves every other gift's rules as they were", () => {
    // A premium template, a free reply in one, a classic Letter: ten photos and any length, as before.
    const ten = Array.from({ length: 10 }, (_, i) => photo(`gifts/g1/${i}.webp`));
    expect(premiumExtras({ ...classic, photos: ten, message: long })).toEqual([]);
    expect(decidePublish(premium, { ...classic, photos: ten, message: long, freeTier: "note" }, { unlocked: false }, { ...none, freeReply: true }).ok).toBe(true);
    // A Constellations under the earlier rules: three to ten photos, free, as before.
    expect(decidePublish(constellations, { ...classic, templateSlug: "constellations", photos: ten.slice(0, 3) }, { unlocked: false }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
    expect(decidePublish(constellations, { ...classic, templateSlug: "constellations", photos: ten }, { unlocked: false }, none).ok).toBe(true);
  });

  it("Constellations, held to the note's rules, has no free version: it is made of photos", () => {
    const sky = (photos: number): GiftData => ({ ...classic, templateSlug: "constellations", freeTier: "note", photos: Array.from({ length: photos }, (_, i) => photo(`gifts/g1/${i}.webp`)) });
    expect(noteCanBeFree(letter)).toBe(true);
    expect(noteCanBeFree(constellations)).toBe(false);
    // Three photos make it a sky, and photos are paid.
    expect(decidePublish(constellations, sky(3), { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(constellations, sky(3), { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: false });
    // Without its photos it is not a gift yet: there is no photo-less sky to send free.
    expect(readinessProblems(constellations, sky(0))).toContain("photosMin");
    expect(readinessProblems(constellations, sky(2))).toContain("photosMin");
    expect(decidePublish(constellations, sky(0), { unlocked: true }, none)).toMatchObject({ ok: false, reason: "not_ready" });
  });

  it("names the test's events per template, step and version", () => {
    expect(freeTestEvent("the-letter", "started", "note")).toBe("letter_started_note");
    expect(freeTestEvent("the-letter", "pay", "classic")).toBe("letter_pay_classic");
    expect(freeTestEvent("constellations", "sheet", "note")).toBe("sky_sheet_note");
    expect(freeTestEvent("constellations", "started", "classic")).toBe("sky_started_classic");
  });

  it("an edit to a note that is already out is held to the note's rules", () => {
    expect(liveEditNeedsUnlock(letter, { photos: [], message: "Hi", freeTier: "note" }, flags)).toBe(false);
    expect(liveEditNeedsUnlock(letter, { photos: [photo("gifts/g1/a.webp")], message: "Hi", freeTier: "note" }, flags)).toBe(true);
    expect(liveEditNeedsUnlock(letter, { photos: [], message: long, freeTier: "note" }, flags)).toBe(true);
    // The same edit to a Letter sent under the earlier rules stays free.
    expect(liveEditNeedsUnlock(letter, { photos: [photo("gifts/g1/a.webp")], message: long }, flags)).toBe(false);
  });

  it("travels with the gift: the schema keeps it, a draft from this device keeps it, nonsense is dropped", () => {
    const schema = createGiftSchema(letterSchema);
    const parsed = schema.parse({ ...note, fields: letterSchema.parse({}) });
    expect(parsed.freeTier).toBe("note");
    expect(schema.safeParse({ ...note, freeTier: "roomy", fields: letterSchema.parse({}) }).success).toBe(false);
    expect(completeGiftData(classic, { ...note }).freeTier).toBe("note");
    expect("freeTier" in completeGiftData(classic, { ...note, freeTier: "roomy" })).toBe(false);
    expect("freeTier" in completeGiftData(classic, { ...classic })).toBe(false);
  });
});

describe("which version a new Letter gets", () => {
  // The unit tests run without a browser: the device's storage is a map standing in for it.
  let device: Map<string, string>;
  beforeEach(() => {
    vi.resetModules();
    device = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => device.get(key) ?? null,
      setItem: (key: string, value: string) => void device.set(key, value),
      removeItem: (key: string) => void device.delete(key),
    });
  });
  const load = () => import("@/lib/editor/free-tier-split");

  it("is off until the owner sets a share: everyone keeps the earlier rules", async () => {
    const { noteShare, pickFreeTier } = await load();
    expect(noteShare(undefined)).toBe(0);
    expect(noteShare("")).toBe(0);
    expect(noteShare("abc")).toBe(0);
    expect(noteShare("0.5")).toBe(0.5);
    expect(noteShare("7")).toBe(1);
    expect(pickFreeTier({ userId: null, share: 0, draw: () => 0, inApp: false })).toBe("classic");
  });

  it("draws once, and the same tab then answers the same", async () => {
    const { pickFreeTier } = await load();
    expect(pickFreeTier({ userId: null, share: 0.5, draw: () => 0.1, inApp: false })).toBe("note");
    expect(pickFreeTier({ userId: null, share: 0.5, draw: () => 0.9, inApp: false })).toBe("note");
  });

  it("splits by the share", async () => {
    const { pickFreeTier, forgetFreeTier } = await load();
    expect(pickFreeTier({ userId: null, share: 0.5, draw: () => 0.49, inApp: false })).toBe("note");
    forgetFreeTier();
    expect(pickFreeTier({ userId: null, share: 0.5, draw: () => 0.5, inApp: false })).toBe("classic");
    forgetFreeTier();
    expect(pickFreeTier({ userId: null, share: 1, draw: () => 0.999, inApp: false })).toBe("note");
  });

  it("gives one account one answer, on any device", async () => {
    const { accountDraw, pickFreeTier, forgetFreeTier } = await load();
    const id = "3f0c1f6e-8b1a-4a59-9a55-0d6a3f1f2b11";
    expect(accountDraw(id)).toBe(accountDraw(id));
    expect(accountDraw(id)).toBeGreaterThanOrEqual(0);
    expect(accountDraw(id)).toBeLessThan(1);
    const first = pickFreeTier({ userId: id, share: 0.5, draw: () => 0, inApp: false });
    forgetFreeTier();
    expect(pickFreeTier({ userId: id, share: 0.5, draw: () => 0.99, inApp: false })).toBe(first);
    // Across many accounts the halves are close to even.
    const notes = Array.from({ length: 2000 }, (_, i) => accountDraw(`user-${i}-${i * 7919}`)).filter((draw) => draw < 0.5).length;
    expect(notes).toBeGreaterThan(900);
    expect(notes).toBeLessThan(1100);
  });

  it("follows ?free= on the address, for trying a version out", async () => {
    const { armFromSearch, pickFreeTier } = await load();
    expect(armFromSearch("?free=note")).toBe("note");
    expect(armFromSearch("?free=classic&x=1")).toBe("classic");
    expect(armFromSearch("?free=other")).toBeUndefined();
    expect(armFromSearch("")).toBeUndefined();
    expect(pickFreeTier({ userId: null, search: "?free=note", share: 0, draw: () => 0.99, inApp: false })).toBe("note");
    expect(pickFreeTier({ userId: null, search: "?free=classic", share: 1, draw: () => 0, inApp: false })).toBe("classic");
  });

  it("writes nothing to the device without a yes to cookies, and remembers with one", async () => {
    const { FREE_TIER_KEY, pickFreeTier } = await load();
    pickFreeTier({ userId: null, share: 1, draw: () => 0, inApp: false });
    expect(device.has(FREE_TIER_KEY)).toBe(false);

    vi.resetModules();
    const { CONSENT_KEY } = await import("@/lib/analytics/consent");
    device.set(CONSENT_KEY, "granted");
    const again = await load();
    expect(again.pickFreeTier({ userId: null, share: 1, draw: () => 0, inApp: false })).toBe("note");
    expect(device.get(FREE_TIER_KEY)).toBe("note");
    // A later visit (a new tab's memory) reads it back, whatever the draw would say now.
    again.forgetFreeTier();
    expect(again.pickFreeTier({ userId: null, share: 0, draw: () => 0.99, inApp: false })).toBe("note");
  });

  it("is always the earlier rules inside the iPhone app", async () => {
    const { pickFreeTier } = await load();
    expect(pickFreeTier({ userId: null, search: "?free=note", share: 1, draw: () => 0, inApp: true })).toBe("classic");
  });
});
