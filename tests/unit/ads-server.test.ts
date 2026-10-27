import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { planCheckout } from "@/lib/commerce/plan";
import { adPurchaseOf, consentedMatch, hashEmail, purchaseEventId, sha256 } from "@/lib/ads/purchase";
import { GRAPH_API_VERSION, metaPurchaseEvent, reportToMeta } from "@/lib/ads/meta";
import { TIKTOK_EVENTS_URL, reportToTikTok, tiktokPurchaseEvent } from "@/lib/ads/tiktok";
import { sessionMetadata } from "@/lib/stripe/line-items";

/**
 * The webhook's reports of a sale to Meta and TikTok. What they carry about the buyer is the part to
 * pin down: hashed, only with consent, never the session id. Every id and token here is made up, and
 * `fetch` is a fake: nothing in this file can reach either platform.
 */

const NOW = Date.parse("2026-10-24T20:00:00.000Z");
const ORIGIN = "https://tryethos.io";
const SESSION_ID = "cs_test_a1b2c3d4e5";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram";

function session(metadata: Record<string, string> = {}, extra: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    object: "checkout.session",
    payment_status: "paid",
    amount_total: 799,
    currency: "usd",
    customer_details: { email: "  Jane.Doe@Example.COM ", address: { country: "GB" } },
    metadata: {
      app: "ethos",
      product: "single",
      template_slugs: "halfway",
      locale: "en",
      ads_consent: "1",
      ads_fbc: "fb.1.1760000000000.IwAR0abc",
      ads_fbp: "fb.1.1760000000001.1234567890",
      ads_ttclid: "E.C.P.abc123",
      ads_ttp: "ttp-abc_123",
      ads_ua: UA,
      ...metadata,
    },
    ...extra,
  } as unknown as Stripe.Checkout.Session;
}

const at = { now: NOW, origin: ORIGIN };

describe("hashing", () => {
  it("normalises an email the way both platforms do before hashing it", () => {
    expect(hashEmail("  Test@Example.com ")).toBe("973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
    expect(hashEmail("test@example.com")).toBe(sha256("test@example.com"));
  });

  it("derives the event id from the session id without carrying it", () => {
    const id = purchaseEventId(SESSION_ID);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).toBe(purchaseEventId(SESSION_ID));
    expect(id).not.toContain(SESSION_ID);
  });
});

describe("what a sale is, for the ads", () => {
  it("is only a paid Ethos session that cost something", () => {
    expect(adPurchaseOf(session({ app: "secuora" }))).toBeNull();
    expect(adPurchaseOf(session({}, { payment_status: "unpaid" }))).toBeNull();
    expect(adPurchaseOf(session({}, { amount_total: 0 }))).toBeNull();
  });

  it("names the template and its tier, or what was bought", () => {
    expect(adPurchaseOf(session())).toEqual({ eventId: purchaseEventId(SESSION_ID), value: 7.99, currency: "USD", contents: [{ id: "halfway", category: "premium" }] });
    expect(adPurchaseOf(session({ product: "everything", template_slugs: "" }))?.contents).toEqual([{ id: "everything", category: "everything" }]);
  });

  it("matches the buyer only with consent, and drops a malformed id", () => {
    expect(consentedMatch(session({ ads_consent: "" }))).toBeNull();
    expect(consentedMatch(session({ ads_fbc: "<script>", ads_ttp: "" }))).toEqual({
      email: "  Jane.Doe@Example.COM ",
      country: "GB",
      fbp: "fb.1.1760000000001.1234567890",
      ttclid: "E.C.P.abc123",
      userAgent: UA,
    });
  });
});

describe("Meta's Conversions API event", () => {
  it("carries the sale, the hashed email and country, the click and browser ids, and the browser", () => {
    expect(metaPurchaseEvent(session(), at)).toEqual({
      event_name: "Purchase",
      event_time: NOW / 1000,
      event_id: purchaseEventId(SESSION_ID),
      action_source: "website",
      event_source_url: "https://tryethos.io/checkout/success",
      user_data: {
        em: [sha256("jane.doe@example.com")],
        country: [sha256("gb")],
        fbc: "fb.1.1760000000000.IwAR0abc",
        fbp: "fb.1.1760000000001.1234567890",
        client_user_agent: UA,
      },
      custom_data: { value: 7.99, currency: "USD", content_ids: ["halfway"], content_type: "product", contents: [{ id: "halfway", quantity: 1 }], content_category: "premium" },
    });
  });

  it("is nothing without consent", () => {
    expect(metaPurchaseEvent(session({ ads_consent: "" }), at)).toBeNull();
  });

  it("never carries the plain email or the session id", () => {
    const json = JSON.stringify(metaPurchaseEvent(session({ locale: "es" }), at));
    expect(json).not.toMatch(/jane|example\.com/i);
    expect(json).not.toContain(SESSION_ID);
    expect(json).toContain("https://tryethos.io/es/checkout/success");
  });
});

describe("TikTok's Events API event", () => {
  it("carries the sale, the hashed email, the click and browser ids, and the browser", () => {
    expect(tiktokPurchaseEvent(session(), at)).toEqual({
      event: "Purchase",
      event_time: NOW / 1000,
      event_id: purchaseEventId(SESSION_ID),
      user: { email: sha256("jane.doe@example.com"), ttclid: "E.C.P.abc123", ttp: "ttp-abc_123", user_agent: UA },
      page: { url: "https://tryethos.io/checkout/success" },
      properties: { value: 7.99, currency: "USD", content_type: "product", contents: [{ content_id: "halfway", content_type: "product", content_category: "premium" }] },
    });
    const json = JSON.stringify(tiktokPurchaseEvent(session(), at));
    expect(json).not.toMatch(/jane|example\.com/i);
    expect(json).not.toContain(SESSION_ID);
  });

  it("is nothing without consent", () => {
    expect(tiktokPurchaseEvent(session({ ads_consent: "" }), at)).toBeNull();
  });
});

const ok = (body: unknown = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("reporting to Meta", () => {
  const deps = (fetch: typeof globalThis.fetch) => ({ pixelId: "000000000000001", token: "test-token-not-real", origin: ORIGIN, now: NOW, fetch });

  it("posts the event to the pixel's endpoint", async () => {
    const fetch = vi.fn(async () => ok({ events_received: 1 }));
    expect(await reportToMeta(session(), { ...deps(fetch), testEventCode: "TEST123" })).toBe("sent");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://graph.facebook.com/${GRAPH_API_VERSION}/000000000000001/events`);
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ access_token: "test-token-not-real", test_event_code: "TEST123" });
    expect(body.data).toEqual([metaPurchaseEvent(session(), at)]);
  });

  it("sends nothing without a pixel, a token or consent", async () => {
    const fetch = vi.fn(async () => ok());
    expect(await reportToMeta(session(), { ...deps(fetch), token: undefined })).toBe("skipped");
    expect(await reportToMeta(session(), { ...deps(fetch), pixelId: undefined })).toBe("skipped");
    expect(await reportToMeta(session({ ads_consent: "" }), deps(fetch))).toBe("skipped");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never throws: an error answer or a dead network is logged and that's all", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = vi.fn(async () => new Response(JSON.stringify({ error: { code: 190, message: "Invalid OAuth access token" } }), { status: 400 }));
    expect(await reportToMeta(session(), deps(refused))).toBe("failed");
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await reportToMeta(session(), deps(down))).toBe("failed");
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});

describe("reporting to TikTok", () => {
  const deps = (fetch: typeof globalThis.fetch) => ({ pixelId: "CTESTPIXEL0000000000", token: "test-token-not-real", origin: ORIGIN, now: NOW, fetch });

  it("posts the event with the token in its header", async () => {
    const fetch = vi.fn(async () => ok({ code: 0, message: "OK" }));
    expect(await reportToTikTok(session(), deps(fetch))).toBe("sent");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TIKTOK_EVENTS_URL);
    expect((init.headers as Record<string, string>)["Access-Token"]).toBe("test-token-not-real");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ event_source: "web", event_source_id: "CTESTPIXEL0000000000", data: [tiktokPurchaseEvent(session(), at)] });
  });

  it("reads TikTok's own answer: a 200 with a non-zero code is a failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await reportToTikTok(session(), deps(vi.fn(async () => ok({ code: 40001, message: "Access token is invalid" }))))).toBe("failed");
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("sends nothing without consent", async () => {
    const fetch = vi.fn(async () => ok({ code: 0 }));
    expect(await reportToTikTok(session({ ads_consent: "" }), deps(fetch))).toBe("skipped");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("what a checkout writes to Stripe for the ads", () => {
  const options = { purchaseId: "p1", userId: null, email: null, locale: "en" as const, origin: ORIGIN, returnTo: "/", automaticTax: false, productIds: {} };
  const plan = planCheckout(
    { product: "single", templateSlugs: ["halfway"], currency: "usd" },
    { signedIn: false, creatorCode: null, giftCardsOnSale: false, subscriptions: false, membership: null, ownedForever: [], purchases: [] },
  );
  if (!plan.ok) throw new Error("plan");

  it("nothing for a buyer who didn't say yes", () => {
    expect(Object.keys(sessionMetadata(plan, options)).filter((k) => k.startsWith("ads_"))).toEqual([]);
  });

  it("the consent flag and the ids for one who did, the user agent cut to Stripe's limit", () => {
    const metadata = sessionMetadata(plan, { ...options, ads: { fbc: "fb.1.1760000000000.IwAR0abc", ttclid: "E.C.P.abc123", ua: "x".repeat(600) } });
    expect(metadata).toMatchObject({ ads_consent: "1", ads_fbc: "fb.1.1760000000000.IwAR0abc", ads_ttclid: "E.C.P.abc123" });
    expect(metadata.ads_ua).toHaveLength(500);
    expect(metadata).not.toHaveProperty("ads_fbp");
  });
});

describe("the webhook's after-payment hook", () => {
  const event = (object: Stripe.Checkout.Session) => ({ id: "evt_1", type: "checkout.session.completed", data: { object } }) as unknown as Stripe.Event;
  const deps = (fulfilled: { ok: boolean; reason?: string }, paid: (s: Stripe.Checkout.Session) => void) => ({
    db: {} as never,
    stripe: {} as never,
    now: NOW,
    fulfil: vi.fn(async () => fulfilled),
    recover: vi.fn(async () => undefined),
    paid,
    send: { ended: vi.fn(async () => true), paymentProblem: vi.fn(async () => true) },
  });

  it("runs only for a checkout fulfilment granted", async () => {
    const { handleStripeEvent } = await import("@/lib/stripe/events");
    const paid = vi.fn();
    expect(await handleStripeEvent(event(session()), deps({ ok: true }, paid))).toMatchObject({ status: 200 });
    expect(paid).toHaveBeenCalledTimes(1);
    await handleStripeEvent(event(session({}, { payment_status: "unpaid" })), deps({ ok: false, reason: "unpaid" }, paid));
    expect(paid).toHaveBeenCalledTimes(1);
  });

  it("can't change Stripe's answer, even when it throws", async () => {
    const { handleStripeEvent } = await import("@/lib/stripe/events");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await handleStripeEvent(
      event(session()),
      deps({ ok: true }, () => {
        throw new Error("boom");
      }),
    );
    expect(outcome).toEqual({ status: 200, handled: "ours" });
    error.mockRestore();
  });
});
