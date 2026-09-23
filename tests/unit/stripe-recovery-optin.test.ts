import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { FakeDb } from "./helpers/fake-db";

// The checkout route, end to end, up to the call to Stripe: what the buyer's tick under the pay
// button becomes in the session's metadata, which is all the expired-session webhook will have.
const state = vi.hoisted(() => ({ db: null as unknown, created: [] as Stripe.Checkout.SessionCreateParams[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/stripe/server", () => ({
  stripeProductIds: () => ({}),
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams) => {
          state.created.push(params);
          return { id: "cs_test_route", url: "https://checkout.stripe.com/c/pay/cs_test_route" };
        },
      },
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/checkout/route");

const checkout = (body: Record<string, unknown>) =>
  POST(new NextRequest("https://ethos.test/api/stripe/checkout", { method: "POST", body: JSON.stringify({ product: "single", templateSlugs: ["vinyl"], currency: "eur", locale: "en", ...body }) }));

beforeEach(() => {
  state.db = new FakeDb({}).db;
  state.created = [];
});

describe("the recovery opt-in, from the pay button to the session", () => {
  it("records a tick as recovery_optin: \"1\"", async () => {
    const res = await checkout({ remindMe: true });
    expect(res.status).toBe(200);
    expect(state.created[0].metadata).toMatchObject({ recovery_optin: "1" });
  });

  it("records nothing when the box was left alone, unticked, or sent as anything but true", async () => {
    for (const remindMe of [undefined, false, "true", 1, "1", null]) {
      const res = await checkout(remindMe === undefined ? {} : { remindMe });
      // A malformed flag is a no, never a failed checkout.
      expect(res.status, String(remindMe)).toBe(200);
    }
    expect(state.created).toHaveLength(6);
    for (const params of state.created) expect(params.metadata).not.toHaveProperty("recovery_optin");
  });

  it("still asks Stripe for its own marketing box, ticked or not", async () => {
    await checkout({ remindMe: true });
    await checkout({});
    for (const params of state.created) expect(params.consent_collection).toEqual({ promotions: "auto", terms_of_service: "required" });
  });
});
