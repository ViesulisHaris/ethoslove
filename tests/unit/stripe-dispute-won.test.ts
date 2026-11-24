import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/commerce/db";
import { grantForever } from "@/lib/commerce/unlocks";
import { handleStripeEvent, type StripeEventDeps } from "@/lib/stripe/events";
import { FakeDb } from "./helpers/fake-db";

const NOW = Date.parse("2026-11-22T12:00:00.000Z");

const seed = () =>
  new FakeDb(
    {
      purchases: [{ id: "s1", user_id: "u1", product: "single", status: "paid", amount: 749, currency: "eur", template_slugs: ["vinyl"], kind: null, membership_id: null, stripe_payment_intent_id: "pi_1" }],
      gifts: [
        { id: "g1", user_id: "u1", template_slug: "vinyl", status: "live", watermark: false, password_hash: null, unlock_at: null, published_at: "2026-09-22T05:00:00.000Z", data: { photos: [] } },
      ],
    },
    NOW,
  );

const deps = (db: Db, refunded = 0): StripeEventDeps => ({
  db,
  stripe: { charges: { retrieve: vi.fn(async () => ({ amount_refunded: refunded })) } } as unknown as Stripe,
  now: NOW,
  fulfil: vi.fn(),
  recover: vi.fn(),
  send: { ended: vi.fn(), paymentProblem: vi.fn() } as unknown as StripeEventDeps["send"],
});

const event = (type: string, object: Record<string, unknown>) => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;
const dispute = (status: string) => ({ id: "dp_1", object: "dispute", payment_intent: "pi_1", charge: "ch_1", status });

describe("charge.dispute.closed", () => {
  it("won: the purchase, its unlock and the gift come back", async () => {
    const fake = seed();
    await grantForever(fake.db, "u1", ["vinyl"], "s1");
    await handleStripeEvent(event("charge.dispute.created", dispute("needs_response")), deps(fake.db));
    expect(fake.rows("purchases")[0].status).toBe("refunded");
    expect(fake.rows("gifts")[0].status).toBe("draft");

    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await handleStripeEvent(event("charge.dispute.closed", dispute("won")), deps(fake.db))).toMatchObject({ status: 200, handled: "ours" });
    expect(fake.rows("purchases")[0].status).toBe("paid");
    expect(fake.rows("template_unlocks").map((r) => r.template_slug)).toEqual(["vinyl"]);
    expect(fake.rows("gifts")[0].status).toBe("live");
  });

  it("lost, or refunded meanwhile: nothing comes back", async () => {
    for (const [status, refunded] of [["lost", 0], ["won", 749]] as const) {
      const fake = seed();
      await grantForever(fake.db, "u1", ["vinyl"], "s1");
      await handleStripeEvent(event("charge.dispute.created", dispute("needs_response")), deps(fake.db));
      await handleStripeEvent(event("charge.dispute.closed", dispute(status)), deps(fake.db, refunded));
      expect(fake.rows("purchases")[0].status).toBe("refunded");
      expect(fake.rows("gifts")[0].status).toBe("draft");
    }
  });

  it("someone else's dispute on the shared account changes nothing", async () => {
    const fake = seed();
    expect(await handleStripeEvent(event("charge.dispute.closed", { ...dispute("won"), payment_intent: "pi_other" }), deps(fake.db))).toMatchObject({ status: 200, handled: "foreign" });
  });
});
