import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => null }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => null }));

const { settledSession, stillSettling } = await import("@/lib/commerce/after-checkout");

type Read = Pick<Stripe.Checkout.Session, "metadata" | "ui_mode" | "payment_status" | "status">;
const oneTap = (over: Partial<Read> = {}): Read => ({ metadata: { app: "ethos", withdrawal_notice: "pay_sheet" }, ui_mode: "elements" as Stripe.Checkout.Session["ui_mode"], payment_status: "unpaid", status: "open", ...over });
const hosted = (over: Partial<Read> = {}): Read => ({ metadata: { app: "ethos", withdrawal_notice: "tickbox" }, ui_mode: "hosted", payment_status: "unpaid", status: "open", ...over });

/** Stripe answering each read with the next session in line, the last one for good. */
function stripeReading(...answers: Read[]) {
  let reads = 0;
  const stripe = { checkout: { sessions: { retrieve: async () => answers[Math.min(reads++, answers.length - 1)] } } } as unknown as Stripe;
  return { stripe, reads: () => reads };
}

describe("a one-tap checkout read before Stripe marks it paid", () => {
  it("is still settling only when it was paid on our pay sheet, is unpaid, and hasn't expired", () => {
    expect(stillSettling(oneTap())).toBe(true);
    expect(stillSettling(oneTap({ metadata: { app: "ethos" } }))).toBe(true);
    expect(stillSettling(oneTap({ payment_status: "paid", status: "complete" }))).toBe(false);
    expect(stillSettling(oneTap({ status: "expired" }))).toBe(false);
    // Stripe's own page comes back only once paid: an unpaid one there is a slow bank method, not this.
    expect(stillSettling(hosted())).toBe(false);
  });

  it("is read again until it is paid, so the page can fulfil it and sign its guest in", async () => {
    const { stripe, reads } = stripeReading(oneTap(), oneTap(), oneTap({ payment_status: "paid", status: "complete" }));
    const waits: number[] = [];
    const session = await settledSession(stripe, "cs_test_1", async (ms) => void waits.push(ms));
    expect(session.payment_status).toBe("paid");
    expect(reads()).toBe(3);
    expect(waits).toEqual([750, 750]);
  });

  it("gives up after about four and a half seconds and hands back what Stripe last said", async () => {
    const { stripe, reads } = stripeReading(oneTap());
    const waits: number[] = [];
    const session = await settledSession(stripe, "cs_test_1", async (ms) => void waits.push(ms));
    expect(session.payment_status).toBe("unpaid");
    expect(waits.reduce((a, b) => a + b, 0)).toBe(4500);
    expect(reads()).toBe(7);
  });

  it("never waits for Stripe's own checkout page, a paid session or an expired one", async () => {
    for (const answer of [hosted(), oneTap({ payment_status: "paid", status: "complete" }), oneTap({ status: "expired" })]) {
      const { stripe, reads } = stripeReading(answer);
      const wait = vi.fn(async () => {});
      await settledSession(stripe, "cs_test_1", wait);
      expect(reads()).toBe(1);
      expect(wait).not.toHaveBeenCalled();
    }
  });
});
