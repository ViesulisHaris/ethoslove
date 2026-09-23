import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decidePublish, liveEditNeedsUnlock } from "@/lib/gift/publish";
import { claimFreeReply, earnsFreeReply, freeReplyFor, releaseFreeReply, replyTokenForGift } from "@/lib/commerce/free-reply";
import { REPLY_TOKEN_PATTERN, mintReplyToken, readReplyToken } from "@/lib/commerce/reply-token";
import { replyTokenFrom } from "@/components/pricing/offers";
import { manifest as letter } from "@/templates/the-letter/manifest";
import type { GiftData } from "@/lib/gift/schema";
import { FakeDb } from "./helpers/fake-db";

const SECRET = "test-secret-that-is-long-enough";
const ANSWERED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REPLY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER_REPLY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOW = Date.parse("2026-09-23T12:00:00.000Z");

describe("the reply token", () => {
  it("names the gift answered and its template, and only we can read or make one", () => {
    const token = mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, SECRET);
    expect(readReplyToken(token, SECRET)).toEqual({ giftId: ANSWERED, templateSlug: "bouquet" });
    expect(readReplyToken(token, "another-secret")).toBeNull();
    expect(REPLY_TOKEN_PATTERN.test(token)).toBe(true);
    // What the browser accepts is exactly the server's shape.
    expect(replyTokenFrom(token)).toBe(token);
  });

  it("never shows the gift's id in the link", () => {
    const token = mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, SECRET);
    expect(token).not.toContain(ANSWERED);
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("aaaaaaaa");
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("bouquet");
    // Sealed afresh each time, so two links for one gift can't be matched up.
    expect(mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, SECRET)).not.toBe(token);
  });

  it("refuses a token that was altered, cut short or made up", () => {
    const token = mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, SECRET);
    const raw = Buffer.from(token, "base64url");
    for (const i of [0, 5, 20, raw.length - 1]) {
      const bent = Buffer.from(raw);
      bent[i] ^= 1;
      expect(readReplyToken(bent.toString("base64url"), SECRET)).toBeNull();
    }
    expect(readReplyToken(token.slice(0, -4), SECRET)).toBeNull();
    expect(readReplyToken("k7m2p9xqa", SECRET)).toBeNull();
    expect(readReplyToken("", SECRET)).toBeNull();
    expect(readReplyToken(null, SECRET)).toBeNull();
    expect(() => mintReplyToken({ giftId: "k7m2p9xqa", templateSlug: "bouquet" }, SECRET)).toThrow();
  });
});

describe("the publish rule for a free reply", () => {
  const photo = (url: string) => ({ id: url, url, width: 10, height: 10 });
  const data = {
    version: 1,
    templateSlug: "x",
    locale: "en",
    title: "",
    recipientName: "Mia",
    senderName: "Leo",
    message: "Back at you",
    messageStyle: "typewriter",
    photos: [photo("gifts/g1/a.webp")],
    accentColor: "#B23A2E",
    fontPairing: "editorial",
    showReactionCta: true,
    watermark: true,
    fields: {},
  } as GiftData;
  const premium = { ...letter, slug: "x", tier: "premium" as const };
  const none = { removeWatermark: false, schedule: false, password: false };

  it("sends a premium template free, footer on", () => {
    expect(decidePublish(premium, data, { unlocked: false }, { ...none, freeReply: true })).toEqual({ ok: true, watermark: true, isPremium: true });
    expect(decidePublish(premium, data, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
  });

  it("still charges the normal price for extras, no footer, scheduling or a password", () => {
    for (const options of [{ removeWatermark: true }, { schedule: true }, { password: true }])
      expect(decidePublish(premium, data, { unlocked: false }, { ...none, ...options, freeReply: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(premium, { ...data, video: { url: "gifts/g1/v.webm" } } as GiftData, { unlocked: false }, { ...none, freeReply: true })).toEqual({ ok: false, reason: "payment_required" });
  });

  it("lets a free reply be edited in its own template, and nothing more", () => {
    const plain = { hasSchedule: false, hasPassword: false, watermark: true };
    expect(liveEditNeedsUnlock(premium, data, { ...plain, freeReply: true })).toBe(false);
    expect(liveEditNeedsUnlock(premium, data, plain)).toBe(true);
    expect(liveEditNeedsUnlock(premium, { ...data, voiceNote: { url: "gifts/g1/vn.webm" } } as GiftData, { ...plain, freeReply: true })).toBe(true);
    expect(liveEditNeedsUnlock(premium, data, { ...plain, watermark: false, freeReply: true })).toBe(true);
  });
});

describe("who gets a free reply, and only once", () => {
  let fake: FakeDb;
  const paidGift = { id: ANSWERED, short_id: "k7m2p9xqa", user_id: "sender", template_slug: "bouquet", status: "live", watermark: false };
  beforeEach(() => {
    vi.stubEnv("VIEWER_HASH_SECRET", SECRET);
    fake = new FakeDb({ gifts: [paidGift, { id: REPLY, short_id: "r1r1r1r1r", user_id: "replier", template_slug: "bouquet", status: "draft", watermark: true }] }, NOW);
  });
  afterEach(() => vi.unstubAllEnvs());
  const token = () => mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, SECRET);

  it("earns one only for a live, paid, premium gift", () => {
    expect(earnsFreeReply(paidGift)).toBe(true);
    expect(earnsFreeReply({ ...paidGift, watermark: true })).toBe(false);
    expect(earnsFreeReply({ ...paidGift, template_slug: "the-letter" })).toBe(false);
    expect(earnsFreeReply({ ...paidGift, status: "draft" })).toBe(false);
  });

  it("hands the token out for a paid premium gift, and nothing for any other", async () => {
    const minted = await replyTokenForGift(fake.db, paidGift);
    expect(minted && readReplyToken(minted, SECRET)).toEqual({ giftId: ANSWERED, templateSlug: "bouquet" });
    expect(await replyTokenForGift(fake.db, { ...paidGift, watermark: true })).toBeNull();
    expect(await replyTokenForGift(fake.db, { ...paidGift, template_slug: "the-letter" })).toBeNull();
    expect(await replyTokenForGift(fake.db, { ...paidGift, status: "scheduled" })).toBeNull();
  });

  it("hands out nothing without a secret to seal it with", async () => {
    vi.stubEnv("VIEWER_HASH_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await replyTokenForGift(fake.db, paidGift)).toBeNull();
  });

  it("hands out no token once the gift's free reply has been sent, so nobody is promised it again", async () => {
    expect(await claimFreeReply(fake.db, ANSWERED, REPLY)).toBe(true);
    expect(await replyTokenForGift(fake.db, paidGift)).toBeNull();
    // The row outlives the reply (0012: on delete set null), so deleting the reply gives nothing back.
    fake.tables.free_replies = fake.rows("free_replies").map((r) => ({ ...r, reply_gift_id: null }));
    expect(await replyTokenForGift(fake.db, paidGift)).toBeNull();
    expect(await freeReplyFor(fake.db, { replyGiftId: OTHER_REPLY, templateSlug: "bouquet", userId: "someone", token: token() })).toEqual({ free: false, reason: "reply_used" });
    expect(await claimFreeReply(fake.db, ANSWERED, OTHER_REPLY)).toBe(false);
  });

  it("frees a reply in the same template, once", async () => {
    const offer = await freeReplyFor(fake.db, { replyGiftId: REPLY, templateSlug: "bouquet", userId: "replier", token: token() });
    expect(offer).toEqual({ free: true, originalGiftId: ANSWERED, held: false });
    expect(await claimFreeReply(fake.db, ANSWERED, REPLY)).toBe(true);
    // Publishing the same reply again, or editing it: it holds the free reply already.
    expect(await claimFreeReply(fake.db, ANSWERED, REPLY)).toBe(true);
    expect(await freeReplyFor(fake.db, { replyGiftId: REPLY, templateSlug: "bouquet", userId: "replier" })).toEqual({ free: true, originalGiftId: ANSWERED, held: true });
    // Another reply with a token for the same gift: already used.
    expect(await freeReplyFor(fake.db, { replyGiftId: OTHER_REPLY, templateSlug: "bouquet", userId: "someone", token: token() })).toEqual({ free: false, reason: "reply_used" });
    expect(await claimFreeReply(fake.db, ANSWERED, OTHER_REPLY)).toBe(false);
  });

  it("refuses another template, the sender's own gift, a gift that isn't paid, and a forged token", async () => {
    const ask = (over: Partial<Parameters<typeof freeReplyFor>[1]>) => freeReplyFor(fake.db, { replyGiftId: REPLY, templateSlug: "bouquet", userId: "replier", token: token(), ...over });
    expect(await ask({ templateSlug: "vinyl" })).toEqual({ free: false, reason: "reply_invalid" });
    expect(await ask({ userId: "sender" })).toEqual({ free: false, reason: "reply_invalid" });
    expect(await ask({ token: mintReplyToken({ giftId: ANSWERED, templateSlug: "bouquet" }, "not-our-secret") })).toEqual({ free: false, reason: "reply_invalid" });
    expect(await ask({ token: undefined })).toEqual({ free: false, reason: null });
    fake.tables.gifts = fake.rows("gifts").map((g) => (g.id === ANSWERED ? { ...g, watermark: true } : g));
    expect(await ask({})).toEqual({ free: false, reason: "reply_invalid" });
  });

  it("gives the free reply back when the publish it was taken for fails", async () => {
    expect(await claimFreeReply(fake.db, ANSWERED, REPLY)).toBe(true);
    await releaseFreeReply(fake.db, ANSWERED, REPLY);
    expect(fake.rows("free_replies")).toEqual([]);
    expect(await claimFreeReply(fake.db, ANSWERED, OTHER_REPLY)).toBe(true);
  });
});
