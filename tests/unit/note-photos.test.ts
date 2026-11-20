import { describe, expect, it } from "vitest";
import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";
import { creditedPurchases, upgradeAmount } from "@/lib/commerce/pricing";
import { foreverRowsOfPurchase } from "@/lib/commerce/unlocks";
import { NOTE_PHOTOS_MAX, sellsNotePhotos } from "@/lib/gift/free-tier";
import { decidePublish, liveEditNeedsUnlock, premiumExtras } from "@/lib/gift/publish";
import type { GiftData } from "@/lib/gift/schema";
import { PRODUCTS, extrasAmount, hasPhotosUnlock, hasUnlock, photosUnlock, unlocksFor } from "@/lib/pricing/products";
import { getManifest } from "@/templates/manifests";
import { manifest as letter } from "@/templates/the-letter/manifest";

/**
 * "A note with photos" (the "photos" product): The Letter's short free note keeps up to five of the
 * sender's photos. What matters: it never stands in for the template's unlock, the footer and the
 * free length stay, anything more still needs "Make it special", a refund takes exactly it away,
 * and what was paid for it comes off the bigger thing later.
 */

const photo = (i: number) => ({ id: `p${i}`, url: `gifts/g1/p${i}.webp`, width: 10, height: 10 });
const note = (photos: number, extra: Partial<GiftData> = {}): GiftData => ({
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "Maya",
  senderName: "Leo",
  message: "Happy anniversary.",
  messageStyle: "typewriter",
  photos: Array.from({ length: photos }, (_, i) => photo(i)),
  accentColor: "#B23A2E",
  fontPairing: "editorial",
  showReactionCta: true,
  watermark: true,
  fields: {},
  freeTier: "note",
  ...extra,
});
const none = { removeWatermark: false, schedule: false, password: false };

describe("a note with photos: what it is sold on", () => {
  it("is sold on The Letter only", () => {
    expect(sellsNotePhotos(letter)).toBe(true);
    // Constellations is made of photos and has no free note for them to join.
    expect(sellsNotePhotos(getManifest("constellations"))).toBe(false);
    expect(sellsNotePhotos(getManifest("bouquet"))).toBe(false);
    expect(sellsNotePhotos(null)).toBe(false);
  });

  it("costs less than Make it special in every currency", () => {
    expect(PRODUCTS.photos.amounts).toEqual({ usd: 499, eur: 399, gbp: 349 });
    for (const currency of ["usd", "eur", "gbp"] as const) expect(PRODUCTS.photos.amounts[currency]).toBeLessThan(PRODUCTS.extras.amounts[currency]);
  });
});

describe("a note with photos: its own unlock row", () => {
  it("is a row of its own, which never unlocks the template", () => {
    expect(unlocksFor("photos", ["the-letter"])).toEqual(["photos:the-letter"]);
    expect(photosUnlock("the-letter")).toBe("photos:the-letter");
    expect(hasUnlock(["photos:the-letter"], "the-letter")).toBe(false);
    expect(hasPhotosUnlock(["photos:the-letter"], "the-letter")).toBe(true);
    // The template's own unlock, or every template, covers photos too.
    expect(hasPhotosUnlock(["the-letter"], "the-letter")).toBe(true);
    expect(hasPhotosUnlock(["*"], "the-letter")).toBe(true);
    expect(hasPhotosUnlock(["photos:constellations", "bouquet"], "the-letter")).toBe(false);
  });

  it("is granted again from its own purchase after another refund, and from nothing else", () => {
    expect(foreverRowsOfPurchase({ product: "photos", template_slugs: ["the-letter"], kind: "photos" })).toEqual(["photos:the-letter"]);
    expect(foreverRowsOfPurchase({ product: "extras", template_slugs: ["the-letter"], kind: "extras" })).toEqual(["the-letter"]);
  });
});

describe("a note with photos: what goes out", () => {
  it("lets a note carry up to five photos, footer on, and nothing else", () => {
    // Without it, any photo on a note needs the unlock.
    expect(decidePublish(letter, note(3), { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
    // With it, the note goes out with its photos and the footer.
    expect(decidePublish(letter, note(3), { unlocked: false, photos: true }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
    expect(decidePublish(letter, note(NOTE_PHOTOS_MAX), { unlocked: false, photos: true }, none)).toMatchObject({ ok: true, watermark: true });
    // A sixth photo is more than a note with photos holds.
    expect(decidePublish(letter, note(NOTE_PHOTOS_MAX + 1), { unlocked: false, photos: true }, none)).toEqual({ ok: false, reason: "payment_required" });
  });

  it("leaves everything else paid: a long letter, a video, no footer, a schedule, a password", () => {
    const held = { unlocked: false, photos: true };
    expect(decidePublish(letter, note(2, { message: "x".repeat(501) }), held, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, note(2, { video: { url: "gifts/g1/v.mp4" } as GiftData["video"] }), held, none)).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, note(2), held, { ...none, removeWatermark: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, note(2), held, { ...none, schedule: true })).toEqual({ ok: false, reason: "payment_required" });
    expect(decidePublish(letter, note(2), held, { ...none, password: true })).toEqual({ ok: false, reason: "payment_required" });
  });

  it("changes nothing for an account that owns the template, or for a gift that is not a note", () => {
    expect(decidePublish(letter, note(12, { message: "x".repeat(900) }), { unlocked: true, photos: true }, none)).toEqual({ ok: true, watermark: false, isPremium: false });
    // A free Letter from before the note keeps its own rules: ten photos, the whole letter, free.
    const old = note(8, { freeTier: undefined, message: "x".repeat(900) });
    expect(decidePublish(letter, old, { unlocked: false }, none)).toEqual({ ok: true, watermark: true, isPremium: false });
    expect(premiumExtras(old, { note: false, photosOwned: true })).toEqual([]);
  });

  it("names photos as the paid part only past what is held", () => {
    expect(premiumExtras(note(3), { note: true })).toEqual(["photos"]);
    expect(premiumExtras(note(3), { note: true, photosOwned: true })).toEqual([]);
    expect(premiumExtras(note(6), { note: true, photosOwned: true })).toEqual(["photos"]);
    expect(premiumExtras(note(0), { note: true, photosOwned: true })).toEqual([]);
  });

  it("holds an edit of a note that is already out to the same rules", () => {
    const row = { hasSchedule: false, hasPassword: false, watermark: true };
    expect(liveEditNeedsUnlock(letter, note(3), row)).toBe(true);
    expect(liveEditNeedsUnlock(letter, note(3), { ...row, photosOwned: true })).toBe(false);
    expect(liveEditNeedsUnlock(letter, note(6), { ...row, photosOwned: true })).toBe(true);
    // The footer can't come off with it.
    expect(liveEditNeedsUnlock(letter, note(3), { ...row, watermark: false, photosOwned: true })).toBe(true);
  });
});

describe("a note with photos: checkout", () => {
  const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true };
  const req = (r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">): CheckoutRequest => ({ templateSlugs: [], currency: "eur", ...r });
  const ok = (r: ReturnType<typeof planCheckout>) => {
    if (!r.ok) throw new Error(`expected a plan, got ${r.error}`);
    return r;
  };

  it("charges its catalogue price and grants its own row", () => {
    const plan = ok(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"], currency: "usd" }), guest));
    expect(plan).toMatchObject({ product: "photos", kind: "photos", total: 499, unlocks: ["photos:the-letter"], templateSlugs: ["the-letter"], bump: false, second: null, personalPrice: null });
    expect(ok(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"] }), guest)).total).toBe(399);
    expect(ok(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"], currency: "gbp" }), guest)).total).toBe(349);
  });

  it("is refused anywhere but The Letter, without a template, with an add-on or a personal price", () => {
    expect(planCheckout(req({ product: "photos", templateSlugs: ["constellations"] }), guest)).toMatchObject({ ok: false, error: "photos_note_only" });
    expect(planCheckout(req({ product: "photos", templateSlugs: ["bouquet"] }), guest)).toMatchObject({ ok: false, error: "photos_note_only" });
    expect(planCheckout(req({ product: "photos" }), guest)).toMatchObject({ ok: false, error: "wrong_template_count" });
    expect(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"], addEverything: true }), guest)).toMatchObject({ ok: false, error: "bump_not_available" });
    expect(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"], secondSlug: "bouquet" }), guest)).toMatchObject({ ok: false, error: "second_not_available" });
    expect(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"], personalPrice: true }), { ...guest, personalPrice: { id: "a" } })).toMatchObject({ ok: false, error: "personal_price_unavailable" });
  });

  it("is not sold twice, nor to someone who owns the whole template", () => {
    for (const ownedForever of [["photos:the-letter"], ["the-letter"], ["*"]])
      expect(planCheckout(req({ product: "photos", templateSlugs: ["the-letter"] }), { ...guest, signedIn: true, ownedForever }), ownedForever[0]).toMatchObject({ ok: false, error: "already_owned" });
  });

  it("comes off Make it special for the same template later, and only there", () => {
    const holder = { ...guest, signedIn: true, ownedForever: ["photos:the-letter"] };
    expect(ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], currency: "usd" }), holder)).total).toBe(899 - 499);
    expect(ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"] }), holder)).total).toBe(749 - 399);
    // Another template's Make it special is its full price.
    expect(ok(planCheckout(req({ product: "extras", templateSlugs: ["constellations"] }), holder)).total).toBe(749);
    expect(extrasAmount("usd", ["photos:the-letter"], "the-letter")).toBe(400);
    expect(extrasAmount("usd", [], "the-letter")).toBe(899);
    expect(extrasAmount("usd", ["photos:constellations"], "the-letter")).toBe(899);
  });

  it("counts towards every template like the other purchases do", () => {
    const paid = [{ product: "photos", amount: 399, currency: "eur", status: "paid" }];
    expect(creditedPurchases(paid)).toHaveLength(1);
    expect(upgradeAmount("eur", paid)).toBe(PRODUCTS.everything.amounts.eur - 399);
  });
});
