import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { PRODUCTS, bumpAmount } from "@/lib/pricing/products";
import {
  GIFT_CARD_NAME_MAX,
  GIFT_CARD_NOTE_MAX,
  bumpOffered,
  checkoutErrorKey,
  defaultPaywallPlan,
  everythingPlan,
  giftCardTouch,
  inviteCodeFrom,
  joinErrorKey,
  payTotal,
  paywallRequest,
  pick3Href,
  pick3Offered,
  pricingFaq,
  publishAsksForMoney,
  purchaseOutcome,
  redeemErrorKey,
  replyTokenFrom,
  resumePath,
  safeReturnPath,
  templatePlan,
} from "@/components/pricing/offers";
import { parseEntitlements } from "@/components/pricing/entitlements";
import { decidePublish } from "@/lib/gift/publish";
import type { GiftData } from "@/lib/gift/schema";
import { manifest as letter } from "@/templates/the-letter/manifest";

describe("the paywall's offer", () => {
  it("sells a premium template as itself and a free one as its extras", () => {
    expect(templatePlan("premium")).toBe("single");
    expect(templatePlan("free")).toBe("extras");
  });

  it("offers every template at full price unless the upgrade is really cheaper, in the same currency", () => {
    const full = PRODUCTS.everything.amounts.eur;
    expect(everythingPlan("eur", null)).toEqual({ plan: "everything", amount: full });
    expect(everythingPlan("eur", { amount: 1500, currency: "eur" })).toEqual({ plan: "upgrade", amount: 1500 });
    // A quote in another currency can't be compared with the price on the page.
    expect(everythingPlan("eur", { amount: 1500, currency: "usd" })).toEqual({ plan: "everything", amount: full });
    // At (or above) the full price the "upgrade" is just Everything under a longer name.
    expect(everythingPlan("eur", { amount: full, currency: "eur" }).plan).toBe("everything");
    expect(everythingPlan("eur", { amount: 0, currency: "eur" }).plan).toBe("everything");
  });

  it("only puts the order bump beside a single template or a make-it-special", () => {
    const full = everythingPlan("eur", null);
    expect(bumpOffered("single", full)).toBe(true);
    expect(bumpOffered("extras", full)).toBe(true);
    expect(bumpOffered("everything", full)).toBe(false);
    expect(bumpOffered("upgrade", full)).toBe(false);
  });

  it("drops the bump once earlier purchases make every template cheaper than Everything's price", () => {
    // The bump always takes the order to Everything's full price: never offer it above the upgrade.
    for (const amount of [501, 1500, 2100]) {
      const upgrade = everythingPlan("eur", { amount, currency: "eur" });
      expect(bumpOffered("single", upgrade)).toBe(false);
      expect(bumpOffered("extras", upgrade)).toBe(false);
    }
  });

  it("opens on this gift's row unless every template costs no more for this buyer", () => {
    expect(defaultPaywallPlan("single", everythingPlan("eur", null), "eur")).toBe("single");
    expect(defaultPaywallPlan("extras", everythingPlan("eur", null), "eur")).toBe("extras");
    expect(defaultPaywallPlan("single", everythingPlan("eur", { amount: 501, currency: "eur" }), "eur")).toBe("upgrade");
    expect(defaultPaywallPlan("single", everythingPlan("eur", { amount: PRODUCTS.single.amounts.eur, currency: "eur" }), "eur")).toBe("upgrade");
    expect(defaultPaywallPlan("single", everythingPlan("eur", { amount: 1000, currency: "eur" }), "eur")).toBe("single");
    // At €7.49, "Make it special" can cost more than a returning buyer's upgrade (floor €4.99): then
    // every template is the row to open on.
    expect(defaultPaywallPlan("extras", everythingPlan("eur", { amount: PRODUCTS.upgrade.amounts.eur, currency: "eur" }), "eur")).toBe("upgrade");
    expect(defaultPaywallPlan("extras", everythingPlan("eur", { amount: 800, currency: "eur" }), "eur")).toBe("extras");
  });

  it("offers three templates on a premium template, while three cost less than every template", () => {
    expect(pick3Offered("premium", "eur", everythingPlan("eur", null))).toBe(true);
    expect(pick3Offered("free", "eur", everythingPlan("eur", null))).toBe(false);
    expect(pick3Offered("premium", "eur", everythingPlan("eur", { amount: 1000, currency: "eur" }))).toBe(false);
  });

  it("adds the bump to the pay button only when it is ticked, making it exactly Everything's price", () => {
    const single = PRODUCTS.single.amounts.eur;
    expect(payTotal("single", single, false, "eur")).toBe(single);
    for (const currency of ["eur", "usd", "gbp"] as const) {
      expect(payTotal("single", PRODUCTS.single.amounts[currency], true, currency)).toBe(PRODUCTS.everything.amounts[currency]);
      expect(payTotal("extras", PRODUCTS.extras.amounts[currency], true, currency)).toBe(PRODUCTS.everything.amounts[currency]);
    }
    expect(bumpAmount("single", "eur")).toBe(1500);
    expect(bumpAmount("extras", "eur")).toBe(1750);
    // Nothing to add to a plan the bump doesn't go on.
    expect(payTotal("everything", 2499, true, "eur")).toBe(2499);
  });

  it("builds the checkout body the server expects, with no amounts in it", () => {
    expect(paywallRequest({ plan: "single", slug: "bouquet", bump: true })).toEqual({ product: "single", templateSlugs: ["bouquet"], addEverything: true });
    // Every template: no slug and no bump.
    expect(paywallRequest({ plan: "everything", slug: "bouquet", bump: true })).toEqual({ product: "everything", templateSlugs: [] });
    expect(paywallRequest({ plan: "extras", slug: "the-letter", bump: false })).toEqual({ product: "extras", templateSlugs: ["the-letter"] });
    expect(paywallRequest({ plan: "upgrade", slug: "the-letter", bump: false })).toEqual({ product: "upgrade", templateSlugs: [] });
    for (const plan of ["single", "extras", "everything", "upgrade"] as const) {
      const body = paywallRequest({ plan, slug: "bouquet", bump: true });
      expect(Object.keys(body).some((k) => /amount|price/i.test(k))).toBe(false);
    }
  });
});

describe("the publish sheet's “One payment, no subscription”", () => {
  const ready: GiftData = {
    version: 1,
    templateSlug: "the-letter",
    locale: "en",
    title: "",
    recipientName: "Ana",
    senderName: "Marco",
    message: "Hi",
    messageStyle: "typewriter",
    photos: [{ id: "a", url: "gifts/g1/a.webp", width: 10, height: 10 }],
    accentColor: "#B23A2E",
    fontPairing: "editorial",
    showReactionCta: true,
    watermark: true,
    fields: {},
  };
  const premium = { ...letter, slug: "x", tier: "premium" as const };
  const none = { removeWatermark: false, schedule: false, password: false };
  const web = { supabaseConfigured: true, inApp: false, paymentsEnabled: true };
  const signedIn = (decision: ReturnType<typeof decidePublish> | null, over: Partial<typeof web> = {}) =>
    publishAsksForMoney({ ...web, ...over, authed: true, wouldNeedPayment: false, decision });
  const guest = (wouldNeedPayment: boolean, over: Partial<typeof web> = {}) =>
    publishAsksForMoney({ ...web, ...over, authed: false, wouldNeedPayment, decision: null });

  it("is said wherever the sheet asks for money: the paywall, make it special, the upgrade, the app's unlock", () => {
    // A premium template (the paywall, with the upgrade row when earlier purchases count).
    expect(signedIn(decidePublish(premium, ready, { unlocked: false }, none))).toBe(true);
    // A free template's extras (make it special).
    expect(signedIn(decidePublish(letter, ready, { unlocked: false }, { ...none, removeWatermark: true }))).toBe(true);
    // A free reply that asks for an extra is back at the template's price.
    expect(signedIn(decidePublish(premium, ready, { unlocked: false }, { ...none, schedule: true, freeReply: true }))).toBe(true);
    // Inside the iPhone app the App Store's sheet takes the money.
    expect(signedIn(decidePublish(premium, ready, { unlocked: false }, none), { inApp: true, paymentsEnabled: false })).toBe(true);
    // A guest sees the paywall, or the sign-in that names its price.
    expect(guest(true)).toBe(true);
  });

  it("is not said when sending costs nothing", () => {
    // A free template with nothing paid in it.
    expect(signedIn(decidePublish(letter, ready, { unlocked: false }, none))).toBe(false);
    expect(guest(false)).toBe(false);
    // A free reply.
    expect(signedIn(decidePublish(premium, ready, { unlocked: false }, { ...none, freeReply: true }))).toBe(false);
    // A template they own already, extras and all.
    expect(signedIn(decidePublish(premium, ready, { unlocked: true }, { ...none, removeWatermark: true }))).toBe(false);
  });

  it("is not said before there is a price to show", () => {
    // Their entitlement is still loading, or the gift is missing a name.
    expect(signedIn(null)).toBe(false);
    expect(signedIn(decidePublish(premium, { ...ready, recipientName: "" }, { unlocked: false }, none))).toBe(false);
    // A build without payments says payments aren't connected instead.
    expect(signedIn(decidePublish(premium, ready, { unlocked: false }, none), { paymentsEnabled: false })).toBe(false);
    expect(guest(true, { paymentsEnabled: false })).toBe(false);
    // A guest in the app signs in there first; nobody can sign in where Supabase isn't set up.
    expect(guest(true, { inApp: true })).toBe(false);
    expect(guest(true, { supabaseConfigured: false })).toBe(false);
  });
});

describe("reply tokens and codes", () => {
  const token = "AQ" + "x".repeat(118);
  it("takes a reply token from the link, and never a gift's short id", () => {
    expect(replyTokenFrom(token)).toBe(token);
    expect(replyTokenFrom(` ${token} `)).toBe(token);
    expect(replyTokenFrom("k7m2p9xqa")).toBeUndefined();
    expect(replyTokenFrom("not a token at all, with spaces and more than forty characters")).toBeUndefined();
    expect(replyTokenFrom("x".repeat(300))).toBeUndefined();
    expect(replyTokenFrom(null)).toBeUndefined();
  });

  it("finds the invite code in a pasted link or on its own", () => {
    expect(inviteCodeFrom("https://tryethos.io/for-two/join?code=abcdefgh23")).toBe("abcdefgh23");
    expect(inviteCodeFrom("  ABCDEFGH23 ")).toBe("abcdefgh23");
    expect(inviteCodeFrom("https://tryethos.io/for-two/join")).toBeNull();
    expect(inviteCodeFrom("not a code")).toBeNull();
    expect(inviteCodeFrom("abcdefgh01")).toBeNull();
  });

  it("only returns to a path on this site", () => {
    expect(safeReturnPath("/create/bouquet?resume=publish", "/dashboard")).toBe("/create/bouquet?resume=publish");
    expect(safeReturnPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("https://evil.example", "/dashboard")).toBe("/dashboard");
    // Browsers read a backslash as a slash, and drop tabs and newlines: checkout refuses these.
    expect(safeReturnPath("/\\evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("/\t/evil.example", "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath(`/${"a".repeat(300)}`, "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath(null, "/dashboard")).toBe("/dashboard");
  });
});

describe("links the paywall builds", () => {
  it("resumes publishing after sign-in or checkout, still as a free reply when it was one", () => {
    const token = "AQ" + "x".repeat(118);
    expect(resumePath("bouquet")).toBe("/create/bouquet?resume=publish");
    expect(resumePath("bouquet", token)).toBe(`/create/bouquet?resume=publish&reply=${token}`);
    // The token survives the round trip: the resumed page reads it back from its own URL.
    const back = new URL(resumePath("bouquet", token), "https://tryethos.io");
    expect(replyTokenFrom(back.searchParams.get("reply"))).toBe(token);
    expect(safeReturnPath(resumePath("bouquet", token), "/dashboard")).toBe(`/create/bouquet?resume=publish&reply=${token}`);
  });

  it("opens the pick-three picker with this template chosen and the way back", () => {
    const url = new URL(pick3Href("bouquet", "/create/bouquet?resume=publish"), "https://tryethos.io");
    expect(url.pathname).toBe("/pricing");
    expect(url.searchParams.get("template")).toBe("bouquet");
    expect(url.searchParams.get("plan")).toBe("pick3");
    expect(url.searchParams.get("return")).toBe("/create/bouquet?resume=publish");
    expect(url.searchParams.has("code")).toBe(false);
  });

  it("asks nothing about the gift card on the pricing page while it isn't sold", () => {
    const faq = [{ q: "a", a: "a" }, { id: "giftcard", q: "b", a: "b" }];
    expect(pricingFaq(faq, { giftCards: false })).toEqual([{ q: "a", a: "a" }]);
    expect(pricingFaq(faq, { giftCards: true })).toEqual(faq);
    for (const messages of [en, es]) expect(messages.pricing.faq.filter((f) => "id" in f && f.id === "giftcard")).toHaveLength(1);
  });
});

describe("answers from checkout", () => {
  it("names why checkout didn't open", () => {
    expect(checkoutErrorKey("already_owned")).toBe("alreadyOwned");
    expect(checkoutErrorKey("sign_in_required")).toBe("signIn");
    expect(checkoutErrorKey("rate_limited")).toBe("tooMany");
    expect(checkoutErrorKey("payments_not_configured")).toBe("unavailable");
    expect(checkoutErrorKey("network")).toBe("network");
    expect(checkoutErrorKey("wrong_template_count")).toBe("generic");
    expect(checkoutErrorKey("checkout")).toBe("generic");
  });

  it("sends a gift card's name and note only when there is one, within checkout's limits", () => {
    expect(giftCardTouch("", "  ")).toBeUndefined();
    expect(giftCardTouch(" Leo ", "")).toEqual({ recipientName: "Leo" });
    expect(giftCardTouch("", " Happy birthday ")).toEqual({ note: "Happy birthday" });
    const long = giftCardTouch("a".repeat(100), "b".repeat(400));
    expect(long?.recipientName).toHaveLength(GIFT_CARD_NAME_MAX);
    expect(long?.note).toHaveLength(GIFT_CARD_NOTE_MAX);
  });
});

describe("answers from the redeem and join endpoints", () => {
  it("names each gift card failure", () => {
    expect(redeemErrorKey("not_found")).toBe("notFound");
    expect(redeemErrorKey("already_redeemed")).toBe("used");
    expect(redeemErrorKey("expired")).toBe("expired");
    expect(redeemErrorKey("voided")).toBe("voided");
    expect(redeemErrorKey("already_owned")).toBe("owned");
    expect(redeemErrorKey(undefined, 401)).toBe("signIn");
    expect(redeemErrorKey("anything", 429)).toBe("tooMany");
    expect(redeemErrorKey("failed")).toBe("generic");
    expect(redeemErrorKey(undefined, 0)).toBe("generic");
  });

  it("names each join failure", () => {
    expect(joinErrorKey("not_found")).toBe("notFound");
    expect(joinErrorKey("taken")).toBe("taken");
    expect(joinErrorKey("own_pass")).toBe("own");
    expect(joinErrorKey("expired")).toBe("expired");
    expect(joinErrorKey(undefined, 401)).toBe("signIn");
    expect(joinErrorKey(undefined, 429)).toBe("tooMany");
    expect(joinErrorKey("failed")).toBe("generic");
  });
});

describe("what a finished checkout handed over", () => {
  it("tells a gift from everything, a pass, a card and a pack", () => {
    expect(purchaseOutcome({ product: "single", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "extras", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "pick3", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "single", bump: true })).toBe("everything");
    expect(purchaseOutcome({ product: "extras", bump: true })).toBe("everything");
    expect(purchaseOutcome({ product: "upgrade", bump: false })).toBe("everything");
    expect(purchaseOutcome({ product: "everything", bump: false })).toBe("everything");
    expect(purchaseOutcome({ product: "pass", bump: false })).toBe("pass");
    expect(purchaseOutcome({ product: "giftcard", bump: false })).toBe("giftcard");
    expect(purchaseOutcome({ product: "pack", bump: false })).toBe("pack");
  });
});

describe("GET /api/entitlements, as the pages read it", () => {
  it("reads the contract's shape", () => {
    const body = { signedIn: true, templates: ["*"], packs: ["*", "deep"], pass: { endsAt: "2027-09-23T00:00:00.000Z", isOwner: true, partnerJoined: false, inviteUrl: "https://tryethos.io/for-two/join?code=abcdefgh23" } };
    expect(parseEntitlements(body)).toEqual(body);
    expect(parseEntitlements({ signedIn: false, templates: [], packs: [], pass: null })).toEqual({ signedIn: false, templates: [], packs: [], pass: null });
  });

  it("reads a malformed field as nothing rather than breaking the page", () => {
    expect(parseEntitlements({ signedIn: true, templates: "x", packs: null, pass: { endsAt: 5 } })).toEqual({ signedIn: true, templates: [], packs: [], pass: null });
    expect(parseEntitlements({ templates: [] })).toBeNull();
    expect(parseEntitlements(null)).toBeNull();
  });
});

describe("the words for every answer", () => {
  // Each helper's every possible result, reached through the inputs that produce it.
  const codes = ["already_owned", "sign_in_required", "rate_limited", "payments_not_configured", "network", "unexpected"];
  const redeem = ["not_found", "already_redeemed", "expired", "voided", "already_owned", "unexpected"];
  const join = ["not_found", "taken", "own_pass", "expired", "unexpected"];

  for (const [name, catalogue] of [["en", en], ["es", es]] as const) {
    it(`has a message for each of them in ${name}`, () => {
      const money = catalogue.money as Record<string, Record<string, unknown>>;
      const errorsOf = (group: Record<string, unknown>) => group.errors as Record<string, string>;
      for (const key of new Set(codes.map(checkoutErrorKey))) expect(money.checkoutErrors[key], key).toEqual(expect.any(String));
      for (const key of new Set([...redeem.map((e) => redeemErrorKey(e)), redeemErrorKey(undefined, 401), redeemErrorKey(undefined, 429)]))
        expect(errorsOf(money.redeem)[key], key).toEqual(expect.any(String));
      for (const key of new Set([...join.map((e) => joinErrorKey(e)), joinErrorKey(undefined, 401), joinErrorKey(undefined, 429)]))
        expect(errorsOf(money.join)[key], key).toEqual(expect.any(String));
    });
  }
});
