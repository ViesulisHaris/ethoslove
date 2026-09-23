import { expect, test } from "@playwright/test";

/**
 * The commerce endpoints, signed out. Nothing here reaches Stripe or writes to the database: every
 * checkout request below is refused by the plan before a session or a purchase row could exist.
 * A server without Stripe or the service key answers 503 to checkout, which these tests accept.
 */

test.describe("entitlements", () => {
  test("a visitor who isn't signed in owns nothing, and it is never cached", async ({ request }) => {
    const response = await request.get("/api/entitlements");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({ signedIn: false, templates: [], packs: [], pass: null, upgrade: null });
  });
});

test.describe("gift cards and the pass for two", () => {
  test("redeeming and joining need a sign-in", async ({ request }) => {
    const redeem = await request.post("/api/gift-cards/redeem", { data: { code: "ETHOS-ABCD-2345" } });
    expect(redeem.status()).toBe(401);
    expect(await redeem.json()).toEqual({ error: "unauthenticated" });
    const join = await request.post("/api/for-two/join", { data: { code: "abcdefghij" } });
    expect(join.status()).toBe(401);
    expect(await join.json()).toEqual({ error: "unauthenticated" });
  });

  test("the passes cron refuses a request without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/passes")).status()).toBe(401);
    expect((await request.get("/api/cron/passes", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  });
});

test.describe("checkout refuses what it can't sell", () => {
  const cases: { name: string; body: Record<string, unknown>; status: number; error: string }[] = [
    { name: "an unknown product", body: { product: "free-money" }, status: 400, error: "invalid_input" },
    { name: "a single without its template", body: { product: "single", templateSlugs: [] }, status: 400, error: "wrong_template_count" },
    { name: "'make it special' on a premium template", body: { product: "extras", templateSlugs: ["vinyl"] }, status: 400, error: "extras_free_only" },
    { name: "the order bump on anything but a single or extras", body: { product: "pick3", templateSlugs: ["vinyl", "bloom", "museum"], addEverything: true }, status: 400, error: "bump_not_available" },
    { name: "a pack that doesn't exist", body: { product: "pack", packId: "nope" }, status: 400, error: "invalid_pack" },
    { name: "the upgrade to a guest", body: { product: "upgrade" }, status: 401, error: "sign_in_required" },
  ];
  for (const { name, body, status, error } of cases) {
    test(name, async ({ request }) => {
      const response = await request.post("/api/stripe/checkout", { data: body });
      if (response.status() === 503) test.skip(true, "payments aren't configured on this server");
      expect(response.status()).toBe(status);
      expect(await response.json()).toMatchObject({ error });
    });
  }

  test("a price in the request is ignored, never charged", async ({ request }) => {
    // Amounts never travel: the schema has no field for one, and the plan reads the catalogue.
    const response = await request.post("/api/stripe/checkout", { data: { product: "single", templateSlugs: [], amount: 1, unit_amount: 1 } });
    if (response.status() === 503) test.skip(true, "payments aren't configured on this server");
    expect(await response.json()).toMatchObject({ error: "wrong_template_count", needed: 1 });
  });
});
