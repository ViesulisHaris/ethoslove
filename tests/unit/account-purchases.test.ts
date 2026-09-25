import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));

const { listMyPurchases } = await import("@/lib/gift/dashboard");

const USER = "user-a";
const purchase = (id: string, status: string, created: string, user = USER) => ({ id, user_id: user, product: "membership", status, amount: 499, currency: "eur", template_slugs: [], created_at: created });

describe("the account page's purchases", () => {
  let fake: FakeDb;
  beforeEach(() => {
    fake = new FakeDb({
      purchases: [
        // A checkout left on Stripe's page without paying: a pending row nothing will ever move on.
        purchase("abandoned", "pending", "2026-09-25T08:00:00.000Z"),
        purchase("paid", "paid", "2026-09-25T08:05:00.000Z"),
        purchase("refunded", "refunded", "2026-09-20T08:00:00.000Z"),
        purchase("someone-else", "paid", "2026-09-25T09:00:00.000Z", "user-b"),
      ],
      template_unlocks: [],
    });
    state.db = fake.db;
  });

  it("lists what was paid and what was refunded, newest first, and no abandoned checkout", async () => {
    const { purchases } = await listMyPurchases(USER);
    expect(purchases.map((p) => [p.id, p.status])).toEqual([
      ["paid", "paid"],
      ["refunded", "refunded"],
    ]);
  });
});
