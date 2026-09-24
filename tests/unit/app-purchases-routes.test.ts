import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { iso } from "@/lib/commerce/db";
import { ingestAppStore } from "@/lib/commerce/app-store";
import { FakeDb } from "./helpers/fake-db";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-09-23T12:00:00.000Z");

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  db: null as unknown,
  secret: undefined as string | undefined,
  allowed: true,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => state.allowed }));
vi.mock("@/lib/env", () => ({
  env: {
    get revenueCatSecretKey() {
      return state.secret;
    },
  },
  isConfigured: {},
}));

const sync = await import("@/app/api/app/purchases/sync/route");
const apply = await import("@/app/api/app/credits/apply/route");

const request = (path: string, body?: unknown) => new NextRequest(`https://tryethos.io${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });

let fake: FakeDb;
beforeEach(async () => {
  fake = new FakeDb({ profiles: [{ id: USER }] }, NOW);
  state.db = fake.db;
  state.user = { id: USER };
  state.secret = undefined;
  state.allowed = true;
  await ingestAppStore(fake.db, USER, [{ productId: "xyz.secuora.ethos.template", transactionId: "7001", purchasedAt: iso(NOW - 1000), sandbox: true }], NOW);
});

describe("POST /api/app/purchases/sync", () => {
  it("reads what the account owns and the credits not spent, without RevenueCat when pull is false", async () => {
    const res = await sync.POST(request("/api/app/purchases/sync", { pull: false }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.entitlements).toMatchObject({ signedIn: true, templates: [], packs: [], pass: null });
    expect(body.credits).toEqual([{ purchaseId: expect.any(String), product: "single", storeProductId: "xyz.secuora.ethos.template", transactionId: "7001", purchasedAt: iso(NOW - 1000) }]);
  });

  it("needs RevenueCat's secret key to pull (the default), and a signed-in user", async () => {
    expect((await sync.POST(request("/api/app/purchases/sync", {}))).status).toBe(503);
    expect(await (await sync.POST(request("/api/app/purchases/sync"))).json()).toEqual({ error: "not_configured" });
    state.user = null;
    expect((await sync.POST(request("/api/app/purchases/sync", { pull: false }))).status).toBe(401);
  });

  it("says upstream when RevenueCat can't be asked", async () => {
    state.secret = "sk_test";
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("down", { status: 503 }));
    const res = await sync.POST(request("/api/app/purchases/sync", { pull: true }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream" });
    expect(String(fetch.mock.calls[0][0])).toBe(`https://api.revenuecat.com/v1/subscribers/${USER}`);
    fetch.mockRestore();
  });

  it("is rate limited per user", async () => {
    state.allowed = false;
    expect((await sync.POST(request("/api/app/purchases/sync", { pull: false }))).status).toBe(429);
  });
});

describe("POST /api/app/credits/apply", () => {
  it("spends the credit and says what the account owns now", async () => {
    const res = await apply.POST(request("/api/app/credits/apply", { templateSlug: "kawaii", transactionId: "7001" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.entitlements.templates).toEqual(["kawaii"]);
  });

  it("answers every refusal with its code and status", async () => {
    const post = async (body: unknown) => {
      const res = await apply.POST(request("/api/app/credits/apply", body));
      return [res.status, await res.json()];
    };
    expect(await post({ templateSlug: "the-letter", transactionId: "7001" })).toEqual([400, { error: "wrong_tier" }]);
    expect(await post({ templateSlug: "kawaii", transactionId: "0000" })).toEqual([404, { error: "not_found" }]);
    expect(await post({ templateSlug: "kawaii", transactionId: "7001" })).toEqual([200, expect.objectContaining({ ok: true })]);
    expect(await post({ templateSlug: "vinyl", transactionId: "7001" })).toEqual([409, { error: "already_applied", appliedTo: "kawaii" }]);
    expect(await post({ templateSlug: "kawaii" })).toEqual([400, { error: "invalid_input" }]);
    expect(await post({ templateSlug: "kawaii", transactionId: "7001", purchaseId: "11111111-1111-4111-8111-111111111111" })).toEqual([400, { error: "invalid_input" }]);
    expect(await post({ templateSlug: "Kawaii!", transactionId: "7001" })).toEqual([400, { error: "invalid_input" }]);
    expect(await post({ templateSlug: "kawaii", purchaseId: "not-a-uuid" })).toEqual([400, { error: "invalid_input" }]);
    expect(await post("{")).toEqual([400, { error: "invalid_input" }]);
  });

  it("needs a signed-in user", async () => {
    state.user = null;
    expect((await apply.POST(request("/api/app/credits/apply", { templateSlug: "kawaii", transactionId: "7001" }))).status).toBe(401);
  });
});
