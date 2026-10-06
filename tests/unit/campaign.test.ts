import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_DAYS,
  CAMPAIGN_GIFT_LIMIT,
  CAMPAIGN_TEMPLATES,
  campaignCoversEdit,
  campaignCoversNewGift,
  campaignGiftsLeft,
  campaignState,
  isCampaignTemplate,
  newCampaignGrant,
  parseCampaignGrant,
} from "@/lib/commerce/campaign-rules";
import { decidePublish } from "@/lib/gift/publish";
import { manifest as letter } from "@/templates/the-letter/manifest";
import { getManifest } from "@/templates/manifests";
import type { GiftData } from "@/lib/gift/schema";

const DAY_MS = 86_400_000;
const now = Date.parse("2026-10-06T12:00:00Z");

const base: GiftData = {
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "Maya",
  senderName: "Leo",
  message: "Hi",
  messageStyle: "typewriter",
  // The Letter asks for one photo before it publishes.
  photos: [{ id: "a", url: "gifts/g1/a.webp", width: 10, height: 10 }],
  accentColor: "#B23A2E",
  fontPairing: "editorial",
  showReactionCta: true,
  watermark: true,
  fields: {},
};
const premium = { ...letter, slug: "x", tier: "premium" as const };
const none = { removeWatermark: false, schedule: false, password: false };

describe("creator campaign rules", () => {
  it("covers four premium templates that exist", () => {
    expect(CAMPAIGN_TEMPLATES).toEqual(["coquette", "xoxo", "bouquet", "birthday-cinema"]);
    for (const slug of CAMPAIGN_TEMPLATES) expect(getManifest(slug)?.tier, slug).toBe("premium");
    expect(isCampaignTemplate("bouquet")).toBe(true);
    expect(isCampaignTemplate("the-council")).toBe(false);
  });

  it("a new grant runs for its days from the moment the password is accepted", () => {
    const grant = newCampaignGrant(now);
    expect(grant).toEqual({ grantedAt: "2026-10-06T12:00:00.000Z", endsAt: new Date(now + CAMPAIGN_DAYS * DAY_MS).toISOString(), published: 0 });
    expect(campaignState(grant, now + CAMPAIGN_DAYS * DAY_MS - 1)).toBe("active");
    expect(campaignState(grant, now + CAMPAIGN_DAYS * DAY_MS)).toBe("ended");
    expect(campaignState({ ...grant, endsAt: null }, now + 365 * DAY_MS)).toBe("active");
    expect(campaignState({ ...grant, revokedAt: new Date(now).toISOString() }, now)).toBe("revoked");
  });

  it("reads a grant out of app_metadata and refuses anything malformed", () => {
    const grant = newCampaignGrant(now);
    expect(parseCampaignGrant({ provider: "email", campaign: grant })).toEqual({ ...grant, revokedAt: null });
    expect(parseCampaignGrant({ provider: "email" })).toBeNull();
    expect(parseCampaignGrant(null)).toBeNull();
    expect(parseCampaignGrant({ campaign: { grantedAt: "yesterday", endsAt: null } })).toBeNull();
    expect(parseCampaignGrant({ campaign: { grantedAt: grant.grantedAt, endsAt: 5 } })).toBeNull();
    // A missing or nonsense count reads as none published, never as a negative that adds slots.
    expect(parseCampaignGrant({ campaign: { grantedAt: grant.grantedAt, endsAt: null, published: -4 } })?.published).toBe(0);
  });

  it("counts down the gifts, and stops new ones at the cap but not edits", () => {
    const grant = { ...newCampaignGrant(now), published: CAMPAIGN_GIFT_LIMIT - 1 };
    expect(campaignGiftsLeft(grant)).toBe(1);
    expect(campaignCoversNewGift(grant, "xoxo", now)).toBe(true);
    const full = { ...grant, published: CAMPAIGN_GIFT_LIMIT };
    expect(campaignGiftsLeft(full)).toBe(0);
    expect(campaignCoversNewGift(full, "xoxo", now)).toBe(false);
    expect(campaignCoversEdit(full, "xoxo", now)).toBe(true);
  });

  it("covers nothing outside its templates, its window, or a revoked grant", () => {
    const grant = newCampaignGrant(now);
    expect(campaignCoversNewGift(grant, "the-council", now)).toBe(false);
    expect(campaignCoversNewGift(grant, "bouquet", now + CAMPAIGN_DAYS * DAY_MS)).toBe(false);
    expect(campaignCoversEdit(grant, "bouquet", now + CAMPAIGN_DAYS * DAY_MS)).toBe(false);
    expect(campaignCoversNewGift({ ...grant, revokedAt: grant.grantedAt }, "bouquet", now)).toBe(false);
    expect(campaignCoversNewGift(null, "bouquet", now)).toBe(false);
  });
});

describe("publishing through the campaign", () => {
  it("publishes a premium template free, with the footer on", () => {
    expect(decidePublish(premium, base, { unlocked: false }, { ...none, campaign: true })).toEqual({ ok: true, watermark: true, isPremium: true });
  });

  it("still charges for every extra a paying client would want", () => {
    expect(decidePublish(premium, base, { unlocked: false }, { ...none, campaign: true, removeWatermark: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(premium, base, { unlocked: false }, { ...none, campaign: true, schedule: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(premium, base, { unlocked: false }, { ...none, campaign: true, password: true })).toEqual({ ok: false, reason: "payment_required" });
    const clip = { ...base, video: { url: "gifts/g1/v.webm" } };
    expect(decidePublish(premium, clip, { unlocked: false }, { ...none, campaign: true })).toEqual({ ok: false, reason: "payment_required" });
  });

  it("changes nothing for someone who owns the template", () => {
    expect(decidePublish(premium, base, { unlocked: true }, { ...none, campaign: true })).toEqual({ ok: true, watermark: false, isPremium: true });
  });
});
