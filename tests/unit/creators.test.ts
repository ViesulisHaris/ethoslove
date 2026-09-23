import { describe, expect, it } from "vitest";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR, creatorCodeFromRef, creatorRef, creditedCreator } from "@/lib/commerce/creators";
import { deleteGiftCardDetails, giftCardDetails, saveGiftCardDetails, staleGiftCardDetailsBefore } from "@/lib/commerce/gift-cards";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { FakeDb } from "./helpers/fake-db";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");

describe("creators are credited through their personal link", () => {
  it("is the owner's deal: 30%, paid monthly over €20", () => {
    expect(CREATOR_COMMISSION_PCT).toBe(30);
    expect(CREATOR_PAYOUT_MIN_EUR).toBe(20);
  });

  it("reads the creator's code from a c- ref, and nothing else", () => {
    expect(creatorRef("MAYA")).toBe("c-maya");
    expect(REF_PATTERN.test(creatorRef("MAYA10"))).toBe(true);
    expect(creatorCodeFromRef("c-maya")).toBe("MAYA");
    expect(creatorCodeFromRef("c-maya10")).toBe("MAYA10");
    expect(creatorCodeFromRef("tt-couple")).toBeNull();
    expect(creatorCodeFromRef("maya")).toBeNull();
    expect(creatorCodeFromRef("c-ab")).toBeNull();
    expect(creatorCodeFromRef(undefined)).toBeNull();
  });

  it("credits an active creator, never a paused one, and never the creator buying for themselves", async () => {
    const fake = new FakeDb(
      {
        creators: [
          { code: "MAYA", name: "Maya", contact: "Maya@Example.com", commission_pct: 30, discount_pct: 10, active: true },
          { code: "GONE", name: "Gone", contact: null, commission_pct: 30, discount_pct: 10, active: false },
        ],
      },
      NOW,
    );
    expect(await creditedCreator(fake.db, "c-maya", null)).toBe("MAYA");
    expect(await creditedCreator(fake.db, "c-maya", "someone@else.co")).toBe("MAYA");
    expect(await creditedCreator(fake.db, "c-maya", " maya@example.com ")).toBeNull();
    expect(await creditedCreator(fake.db, "c-gone", null)).toBeNull();
    expect(await creditedCreator(fake.db, "c-nobody", null)).toBeNull();
    expect(await creditedCreator(fake.db, "tt-bio", null)).toBeNull();
  });
});

describe("a gift card's name and note wait in our database, not in Stripe", () => {
  const PURCHASE = "11111111-1111-4111-8111-111111111111";

  it("keeps them until fulfilment, trimmed and capped, and only when there is something to keep", async () => {
    const fake = new FakeDb({}, NOW);
    expect(await saveGiftCardDetails(fake.db, PURCHASE, { recipientName: "  ", note: "" })).toBe(true);
    expect(fake.rows("gift_card_details")).toEqual([]);
    expect(await saveGiftCardDetails(fake.db, PURCHASE, { recipientName: " Sam ", note: "x".repeat(400) })).toBe(true);
    expect(await giftCardDetails(fake.db, PURCHASE)).toEqual({ recipientName: "Sam", note: "x".repeat(300) });
    await deleteGiftCardDetails(fake.db, { purchaseId: PURCHASE });
    expect(await giftCardDetails(fake.db, PURCHASE)).toEqual({ recipientName: null, note: null });
  });

  it("forgets what abandoned checkouts left once their recovery link has run out", async () => {
    const fake = new FakeDb(
      {
        gift_card_details: [
          { purchase_id: "old", recipient_name: "A", note: null, created_at: new Date(NOW - 32 * 86_400_000).toISOString() },
          { purchase_id: "new", recipient_name: "B", note: null, created_at: new Date(NOW - 29 * 86_400_000).toISOString() },
        ],
      },
      NOW,
    );
    await deleteGiftCardDetails(fake.db, { olderThan: staleGiftCardDetailsBefore(NOW) });
    expect(fake.rows("gift_card_details").map((r) => r.purchase_id)).toEqual(["new"]);
  });
});
