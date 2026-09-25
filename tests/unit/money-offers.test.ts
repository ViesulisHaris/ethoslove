import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { MembershipSummary } from "@/lib/membership/types";
import { PRODUCTS, bumpAmount } from "@/lib/pricing/products";
import {
  GIFT_CARD_NAME_MAX,
  GIFT_CARD_NOTE_MAX,
  PASS_RENEW_WITHIN_DAYS,
  bumpOffered,
  checkoutErrorKey,
  defaultPaywallPlan,
  everythingPlan,
  giftCardTouch,
  heroMemberState,
  initialPlan,
  inviteCodeFrom,
  joinErrorKey,
  membershipRequest,
  payTotal,
  paywallRequest,
  pick3Href,
  pick3Offered,
  pricingFaq,
  purchaseOutcome,
  redeemErrorKey,
  replyTokenFrom,
  resumePath,
  safeReturnPath,
  templatePlan,
} from "@/components/pricing/offers";
import { parseEntitlements, parseMembership } from "@/components/pricing/entitlements";
import { membershipErrorKey } from "@/components/membership/actions";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

/** A running monthly subscription, owned, with no partner yet: each test changes what it's about. */
function member(over: Partial<MembershipSummary> = {}): MembershipSummary {
  return {
    provider: "stripe_subscription",
    plan: "monthly",
    status: "active",
    running: true,
    isOwner: true,
    partnerJoined: false,
    partner: null,
    inviteUrl: "https://tryethos.io/for-two/join?code=abcdefgh23",
    periodEnd: iso(NOW + 20 * DAY),
    renews: true,
    endsAt: null,
    pendingPlan: null,
    manage: "stripe",
    canSwitchToYearly: true,
    canSwitchToMonthly: false,
    ...over,
  };
}

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
    expect(pricingFaq(faq, { giftCards: false, subscriptions: true })).toEqual([{ q: "a", a: "a" }]);
    expect(pricingFaq(faq, { giftCards: true, subscriptions: true })).toEqual(faq);
    for (const messages of [en, es]) expect(messages.pricing.faq.filter((f) => "id" in f && f.id === "giftcard")).toHaveLength(1);
  });

  it("answers Ethos for Two's questions for the way it is sold now, never both ways", () => {
    const faq = [{ q: "shared", a: "" }, { id: "subscriptions", q: "sub", a: "" }, { id: "pass", q: "pass", a: "" }];
    expect(pricingFaq(faq, { giftCards: false, subscriptions: true }).map((f) => f.q)).toEqual(["shared", "sub"]);
    expect(pricingFaq(faq, { giftCards: false, subscriptions: false }).map((f) => f.q)).toEqual(["shared", "pass"]);
    for (const messages of [en, es]) {
      for (const subscriptions of [true, false]) {
        const asked = pricingFaq(messages.pricing.faq, { giftCards: true, subscriptions }).map((f) => f.q);
        // "Is this a subscription?" and "What is Ethos for Two?" each exist in both versions: one shows.
        expect(new Set(asked).size, `${subscriptions}`).toBe(asked.length);
      }
    }
  });
});

describe("Ethos for Two on the pricing page", () => {
  it("opens on yearly unless the link asked for monthly and monthly is sold", () => {
    expect(initialPlan(null, true)).toBe("yearly");
    expect(initialPlan("monthly", true)).toBe("monthly");
    expect(initialPlan("yearly", true)).toBe("yearly");
    expect(initialPlan("pick3", true)).toBe("yearly");
    // Subscriptions off: there is only the year.
    expect(initialPlan("monthly", false)).toBe("yearly");
  });

  it("asks checkout for the product and the plan, and never an amount", () => {
    for (const plan of ["monthly", "yearly"] as const) {
      const body = membershipRequest(plan);
      expect(body).toEqual({ product: "membership", plan });
      expect(Object.keys(body).some((k) => /amount|price|code/i.test(k))).toBe(false);
    }
  });

  const ctx = { subscriptions: true, renewAsked: false, now: NOW };
  it("offers it to nobody's member, and to someone whose membership has ended", () => {
    expect(heroMemberState(null, ctx)).toEqual({ kind: "buy" });
    expect(heroMemberState(member({ running: false, status: "active", renews: false, endsAt: iso(NOW - DAY) }), ctx)).toEqual({ kind: "buy" });
    // A partner whose couple's membership stopped running can buy their own.
    expect(heroMemberState(member({ isOwner: false, running: false, manage: null }), ctx)).toEqual({ kind: "buy" });
  });

  it("tells a member what they have instead of selling it again", () => {
    expect(heroMemberState(member(), ctx)).toEqual({ kind: "member", line: "monthlyRenews", date: iso(NOW + 20 * DAY), needsPayment: false });
    expect(heroMemberState(member({ plan: "yearly" }), ctx)).toMatchObject({ line: "yearlyRenews" });
    expect(heroMemberState(member({ renews: false, endsAt: iso(NOW + 5 * DAY) }), ctx)).toEqual({ kind: "member", line: "ends", date: iso(NOW + 5 * DAY), needsPayment: false });
    // A renewal being retried: the card, by the day the grace ends. Past it, paused.
    expect(heroMemberState(member({ status: "past_due", renews: false, endsAt: iso(NOW + 5 * DAY) }), ctx)).toEqual({ kind: "member", line: "paymentFailed", date: iso(NOW + 5 * DAY), needsPayment: true });
    expect(heroMemberState(member({ running: false, status: "past_due", renews: false }), ctx)).toMatchObject({ line: "paused", needsPayment: true });
    // A first payment the bank is confirming is not a failure.
    expect(heroMemberState(member({ running: false, status: "incomplete", renews: false }), ctx)).toMatchObject({ line: "processing", needsPayment: false });
    expect(heroMemberState(member({ provider: "app_store", manage: "app_store" }), ctx)).toMatchObject({ line: "appStore", date: iso(NOW + 20 * DAY) });
    // Apple's billing problem is Apple's: fixed in iOS, never "update your card" here.
    expect(heroMemberState(member({ provider: "app_store", manage: "app_store", status: "past_due", renews: false, endsAt: iso(NOW + 3 * DAY) }), ctx)).toMatchObject({ line: "appStoreBilling", date: iso(NOW + 3 * DAY), needsPayment: true });
    expect(heroMemberState(member({ isOwner: false, manage: null }), ctx)).toEqual({ kind: "partner" });
  });

  it("offers a pass owner the next year only while the pass is what's sold, near its end or when asked", () => {
    const pass = (days: number) => member({ provider: "stripe_pass", plan: "yearly", periodEnd: iso(NOW + days * DAY), endsAt: iso(NOW + days * DAY), renews: false, manage: "pass" });
    const off = { ...ctx, subscriptions: false };
    expect(heroMemberState(pass(PASS_RENEW_WITHIN_DAYS - 1), off)).toEqual({ kind: "renew", endsAt: iso(NOW + (PASS_RENEW_WITHIN_DAYS - 1) * DAY) });
    expect(heroMemberState(pass(200), off)).toMatchObject({ kind: "member", line: "passRuns" });
    expect(heroMemberState(pass(200), { ...off, renewAsked: true })).toMatchObject({ kind: "renew" });
    // Subscriptions on: a running pass can't be carried into one, so it just runs its year.
    expect(heroMemberState(pass(10), ctx)).toMatchObject({ kind: "member", line: "passRuns" });
    // A year bought in the iPhone app is renewed there.
    expect(heroMemberState({ ...pass(10), provider: "app_store_pass" }, off)).toMatchObject({ kind: "member", line: "passRuns" });
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
    // Ethos for Two's own refusals (docs/MEMBERSHIP.md 2.3).
    expect(checkoutErrorKey("already_member")).toBe("alreadyMember");
    expect(checkoutErrorKey("payment_issue")).toBe("paymentIssue");
    expect(checkoutErrorKey("not_on_sale")).toBe("notOnSale");
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
    expect(joinErrorKey("has_own")).toBe("hasOwn");
    expect(joinErrorKey("expired")).toBe("expired");
    expect(joinErrorKey(undefined, 401)).toBe("signIn");
    expect(joinErrorKey(undefined, 429)).toBe("tooMany");
    expect(joinErrorKey("failed")).toBe("generic");
  });
});

describe("what a finished checkout handed over", () => {
  it("tells a gift from everything, a pass, a membership, a card and a pack", () => {
    expect(purchaseOutcome({ product: "single", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "extras", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "pick3", bump: false })).toBe("gift");
    expect(purchaseOutcome({ product: "single", bump: true })).toBe("everything");
    expect(purchaseOutcome({ product: "extras", bump: true })).toBe("everything");
    expect(purchaseOutcome({ product: "upgrade", bump: false })).toBe("everything");
    expect(purchaseOutcome({ product: "everything", bump: false })).toBe("everything");
    expect(purchaseOutcome({ product: "pass", bump: false })).toBe("pass");
    expect(purchaseOutcome({ product: "membership", bump: false })).toBe("membership");
    expect(purchaseOutcome({ product: "giftcard", bump: false })).toBe("giftcard");
    expect(purchaseOutcome({ product: "pack", bump: false })).toBe("pack");
  });
});

describe("GET /api/entitlements, as the pages read it", () => {
  it("reads the contract's shape", () => {
    const body = {
      signedIn: true,
      templates: ["*"],
      packs: ["*", "deep"],
      pass: { endsAt: "2027-09-23T00:00:00.000Z", isOwner: true, partnerJoined: false, inviteUrl: "https://tryethos.io/for-two/join?code=abcdefgh23" },
      membership: member(),
    };
    expect(parseEntitlements(body)).toEqual(body);
    expect(parseEntitlements({ signedIn: false, templates: [], packs: [], pass: null, membership: null })).toEqual({ signedIn: false, templates: [], packs: [], pass: null, membership: null });
    // The iPhone app's current build and older answers carry no membership: read as none.
    expect(parseEntitlements({ signedIn: false, templates: [], packs: [], pass: null })).toEqual({ signedIn: false, templates: [], packs: [], pass: null, membership: null });
  });

  it("reads a malformed field as nothing rather than breaking the page", () => {
    expect(parseEntitlements({ signedIn: true, templates: "x", packs: null, pass: { endsAt: 5 }, membership: { provider: "paypal" } })).toEqual({
      signedIn: true,
      templates: [],
      packs: [],
      pass: null,
      membership: null,
    });
    expect(parseEntitlements({ templates: [] })).toBeNull();
    expect(parseEntitlements(null)).toBeNull();
  });

  it("reads a membership only when the fields a page decides on are there", () => {
    expect(parseMembership(member())).toEqual(member());
    // An ended membership is never sent: "ended" isn't a status a summary can have.
    expect(parseMembership({ ...member(), status: "ended" })).toBeNull();
    expect(parseMembership({ ...member(), running: "yes" })).toBeNull();
    expect(parseMembership({ ...member(), periodEnd: null })).toBeNull();
    // The partner's name may be missing on its own; the switches default to off.
    const rest: Partial<MembershipSummary> = member({ partnerJoined: true, partner: { name: null, initial: "S" } });
    delete rest.canSwitchToYearly;
    delete rest.canSwitchToMonthly;
    expect(parseMembership({ ...rest, partner: { initial: "S" } })).toMatchObject({ partner: { name: null, initial: "S" }, canSwitchToYearly: false, canSwitchToMonthly: false });
    expect(parseMembership({ ...member(), pendingPlan: "weekly", manage: "paypal" })).toMatchObject({ pendingPlan: null, manage: null });
  });
});

describe("answers from /api/membership and /api/stripe/portal", () => {
  it("names each refusal the account page can meet", () => {
    expect(membershipErrorKey("unauthenticated")).toBe("signIn");
    expect(membershipErrorKey("rate_limited")).toBe("tooMany");
    expect(membershipErrorKey("not_available", "app_store")).toBe("appStore");
    expect(membershipErrorKey("not_available", "cancelling")).toBe("unavailable");
    expect(membershipErrorKey("not_owner")).toBe("unavailable");
    expect(membershipErrorKey("payment_failed")).toBe("paymentFailed");
    expect(membershipErrorKey("requires_action")).toBe("requiresAction");
    expect(membershipErrorKey("portal_not_configured")).toBe("notConfigured");
    expect(membershipErrorKey("stripe_failed")).toBe("generic");
  });
});

describe("the words for every answer", () => {
  // Each helper's every possible result, reached through the inputs that produce it.
  const codes = ["already_owned", "already_member", "payment_issue", "not_on_sale", "sign_in_required", "rate_limited", "payments_not_configured", "network", "unexpected"];
  const redeem = ["not_found", "already_redeemed", "expired", "voided", "already_owned", "unexpected"];
  const join = ["not_found", "taken", "own_pass", "has_own", "expired", "unexpected"];
  const membership = ["unauthenticated", "rate_limited", "not_available", "not_owner", "payment_failed", "requires_action", "not_configured", "stripe_failed"];

  for (const [name, catalogue] of [["en", en], ["es", es]] as const) {
    it(`has a message for each of them in ${name}`, () => {
      const money = catalogue.money as Record<string, Record<string, unknown>>;
      const errorsOf = (group: Record<string, unknown>) => group.errors as Record<string, string>;
      for (const key of new Set(codes.map(checkoutErrorKey))) expect(money.checkoutErrors[key], key).toEqual(expect.any(String));
      for (const key of new Set([...redeem.map((e) => redeemErrorKey(e)), redeemErrorKey(undefined, 401), redeemErrorKey(undefined, 429)]))
        expect(errorsOf(money.redeem)[key], key).toEqual(expect.any(String));
      for (const key of new Set([...join.map((e) => joinErrorKey(e)), joinErrorKey(undefined, 401), joinErrorKey(undefined, 429)]))
        expect(errorsOf(money.join)[key], key).toEqual(expect.any(String));
      const account = (catalogue.membership as { account: { errors: Record<string, string> } }).account;
      for (const key of new Set([...membership.map((e) => membershipErrorKey(e)), membershipErrorKey("not_available", "app_store")]))
        expect(account.errors[key], key).toEqual(expect.any(String));
    });
  }
});
