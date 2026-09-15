import { describe, expect, it } from "vitest";
import { decidePublish, liveEditNeedsUnlock, premiumExtras, readinessProblems } from "@/lib/gift/publish";
import { manifest as letter } from "@/templates/the-letter/manifest";
import type { GiftData } from "@/lib/gift/schema";

const photo = (url: string) => ({ id: url, url, width: 10, height: 10 });

const base: GiftData = {
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

const premium = { ...letter, slug: "x", tier: "premium" as const };
const none = { removeWatermark: false, schedule: false, password: false };

describe("publish rules", () => {
  it("free template publishes free with a watermark", () => {
    expect(decidePublish(letter, base, { unlocked: false }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
  });
  it("an unlock removes the watermark", () => {
    expect(decidePublish(letter, base, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: false });
  });
  it("premium features need an unlock", () => {
    expect(decidePublish(letter, base, { unlocked: false }, { ...none, schedule: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, base, { unlocked: false }, { ...none, password: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, base, { unlocked: false }, { ...none, removeWatermark: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(premium, base, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(premium, base, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: true });
  });
  it("more than ten photos is a premium feature", () => {
    const many = { ...base, photos: Array.from({ length: 11 }, (_, i) => photo(`gifts/g/${i}.webp`)) };
    expect(decidePublish(letter, many, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
  });
  it("a real song, a video clip or a voice note is a premium extra on any template", () => {
    const song = { ...base, music: { source: "catalog" as const, url: "https://audio.example/p.m4a", title: "Perfect", artist: "Ed", startAt: 0 } };
    expect(premiumExtras(song)).toEqual(["song"]);
    expect(decidePublish(letter, song, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, song, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: false });
    const clip = { ...base, video: { url: "gifts/g1/v.webm" } };
    expect(premiumExtras(clip)).toEqual(["video"]);
    const voice = { ...base, voiceNote: { url: "gifts/g1/vn.webm", duration: 12 } };
    expect(premiumExtras(voice)).toEqual(["voiceNote"]);
    expect(decidePublish(letter, voice, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    const lib = { ...base, music: { source: "library" as const, url: "/audio/library/first-light.mp3", trackId: "first-light", startAt: 0 } };
    expect(premiumExtras(lib)).toEqual([]);
    expect(readinessProblems(letter, { ...base, voiceNote: { url: "blob:x" } })).toContain("uploadsPending");
  });
  it("only our own library and the sender's upload count as free music", () => {
    const preview = "https://audio-ssl.itunes.apple.com/itunes-assets/p.m4a";
    expect(premiumExtras({ ...base, music: { source: "library" as const, url: preview, startAt: 0 } })).toEqual(["song"]);
    expect(premiumExtras({ ...base, music: { source: "upload" as const, url: preview, startAt: 0 } })).toEqual(["song"]);
    expect(premiumExtras({ ...base, music: { source: "upload" as const, url: "gifts/g1/song.mp3", startAt: 0 } })).toEqual([]);
    expect(premiumExtras({ ...base, music: { source: "upload" as const, url: "idb:song", startAt: 0 } })).toEqual([]);
  });
  it("edits to a live gift are held to the publish rules", () => {
    const plain = { hasSchedule: false, hasPassword: false, watermark: true };
    expect(liveEditNeedsUnlock(letter, base, plain)).toBe(false);
    expect(liveEditNeedsUnlock(letter, { ...base, video: { url: "gifts/g/v.webm" } }, plain)).toBe(true);
    expect(liveEditNeedsUnlock(letter, { ...base, voiceNote: { url: "gifts/g/vn.webm" } }, plain)).toBe(true);
    expect(liveEditNeedsUnlock(letter, base, { ...plain, hasPassword: true })).toBe(true);
    expect(liveEditNeedsUnlock(letter, base, { ...plain, watermark: false })).toBe(true);
    expect(liveEditNeedsUnlock(premium, base, plain)).toBe(true);
  });
  it("blocks when uploads are pending or fields are missing", () => {
    expect(readinessProblems(letter, { ...base, photos: [photo("blob:x")] })).toContain("uploadsPending");
    expect(readinessProblems(letter, { ...base, message: "  " })).toContain("message");
    expect(readinessProblems(letter, { ...base, photos: [] })).toContain("photosMin");
    expect(decidePublish(letter, { ...base, photos: [] }, { unlocked: true }, none)).toMatchObject({ ok: false, reason: "not_ready" });
  });
});
