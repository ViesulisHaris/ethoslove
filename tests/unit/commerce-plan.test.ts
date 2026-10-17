import { describe, expect, it } from "vitest";
import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";

const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true };
const req = (r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">): CheckoutRequest => ({ templateSlugs: [], currency: "eur", ...r });

function ok(r: ReturnType<typeof planCheckout>) {
  if (!r.ok) throw new Error(`expected a plan, got ${r.error}`);
  return r;
}

describe("checkout plan: prices come from the catalogue", () => {
  it("charges each product its catalogue price, with nothing taken from the request", () => {
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"] }), guest)).total).toBe(999);
    expect(ok(planCheckout(req({ product: "pick3", templateSlugs: ["vinyl", "bloom", "museum"] }), guest)).total).toBe(1499);
    expect(ok(planCheckout(req({ product: "everything" }), guest)).total).toBe(2499);
    expect(ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"] }), guest)).total).toBe(749);
    expect(ok(planCheckout(req({ product: "pass" }), guest)).total).toBe(2999);
    expect(ok(planCheckout(req({ product: "pack", packId: "deep" }), guest)).total).toBe(299);
    expect(ok(planCheckout(req({ product: "giftcard" }), guest)).total).toBe(2499);
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], currency: "gbp" }), guest)).total).toBe(899);
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], currency: "usd" }), guest)).total).toBe(1199);
  });
  it("says what each sale grants and records", () => {
    const single = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"] }), guest));
    expect(single).toMatchObject({ kind: "single", unlocks: ["vinyl"], templateSlugs: ["vinyl"], bump: false, creatorCode: null });
    const everything = ok(planCheckout(req({ product: "everything", templateSlugs: ["vinyl"] }), guest));
    expect(everything).toMatchObject({ unlocks: ["*"], templateSlugs: [] });
    const pack = ok(planCheckout(req({ product: "pack", packId: "spicy" }), guest));
    expect(pack).toMatchObject({ kind: "pack", packId: "spicy", unlocks: ["pack:spicy"], templateSlugs: ["pack:spicy"] });
    expect(ok(planCheckout(req({ product: "pass" }), guest)).unlocks).toEqual([]);
    expect(ok(planCheckout(req({ product: "giftcard" }), guest)).unlocks).toEqual([]);
  });
  it("wants the right number of real templates", () => {
    expect(planCheckout(req({ product: "single", templateSlugs: [] }), guest)).toMatchObject({ ok: false, error: "wrong_template_count", status: 400, needed: 1 });
    expect(planCheckout(req({ product: "pick3", templateSlugs: ["vinyl", "vinyl", "bloom"] }), guest)).toMatchObject({ ok: false, error: "wrong_template_count", needed: 3 });
    expect(planCheckout(req({ product: "single", templateSlugs: ["not-a-template"] }), guest)).toMatchObject({ ok: false, error: "wrong_template_count" });
  });
  it("sells 'make it special' only for a free template", () => {
    expect(ok(planCheckout(req({ product: "extras", templateSlugs: ["constellations"] }), guest)).unlocks).toEqual(["constellations"]);
    expect(planCheckout(req({ product: "extras", templateSlugs: ["vinyl"] }), guest)).toMatchObject({ ok: false, error: "extras_free_only", status: 400 });
  });
  it("sells a single only for a premium template: a free one's unlock is 'make it special', at its price", () => {
    for (const slug of ["the-letter", "constellations"])
      expect(planCheckout(req({ product: "single", templateSlugs: [slug] }), guest)).toMatchObject({ ok: false, error: "single_premium_only", status: 400 });
    // Three templates are a bundle: a free one may be among them.
    expect(ok(planCheckout(req({ product: "pick3", templateSlugs: ["vinyl", "bloom", "the-letter"] }), guest)).total).toBe(1499);
  });
  it("sells only the packs that exist", () => {
    expect(planCheckout(req({ product: "pack", packId: "nope" }), guest)).toMatchObject({ ok: false, error: "invalid_pack" });
    expect(planCheckout(req({ product: "pack" }), guest)).toMatchObject({ ok: false, error: "invalid_pack" });
  });
  it("refuses a gift card while gift cards aren't on sale", () => {
    expect(planCheckout(req({ product: "giftcard" }), { ...guest, giftCardsOnSale: false })).toMatchObject({ ok: false, error: "not_on_sale", status: 400 });
    expect(planCheckout(req({ product: "everything" }), { ...guest, giftCardsOnSale: false }).ok).toBe(true);
  });
});

describe("checkout plan: the order bump", () => {
  it("adds every other template as its own line, only when ticked, taking the order to exactly Everything's price", () => {
    const plan = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: true }), guest));
    expect(plan.lines).toEqual([
      { key: "single", amount: 999 },
      { key: "bump", amount: 1500 },
    ]);
    expect(plan).toMatchObject({ kind: "bump", bump: true, total: 2499, unlocks: ["vinyl", "*"] });
    const extras = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], addEverything: true }), guest));
    expect(extras.lines).toEqual([
      { key: "extras", amount: 749 },
      { key: "bump", amount: 1750 },
    ]);
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: false }), guest)).lines).toHaveLength(1);
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"] }), guest)).lines).toHaveLength(1);
    for (const currency of ["eur", "usd", "gbp"] as const)
      for (const product of ["single", "extras"] as const) {
        const slugs = product === "single" ? ["vinyl"] : ["the-letter"];
        const withBump = ok(planCheckout(req({ product, templateSlugs: slugs, addEverything: true, currency }), guest));
        expect(withBump.total).toBe(ok(planCheckout(req({ product: "everything", currency }), guest)).total);
      }
  });
  it("isn't sold to a buyer whose earlier purchases already take Everything below its full price", () => {
    const returning: CheckoutContext = { ...guest, signedIn: true, purchases: [{ product: "single", amount: 999, currency: "eur", status: "paid" }] };
    for (const product of ["single", "extras"] as const)
      expect(planCheckout(req({ product, templateSlugs: [product === "single" ? "bloom" : "the-letter"], addEverything: true }), returning)).toMatchObject({ ok: false, error: "bump_not_available" });
    // Without the bump they buy as usual; a refunded purchase counts for nothing.
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["bloom"] }), returning)).total).toBe(999);
    const refunded = { ...returning, purchases: [{ product: "single", amount: 999, currency: "eur", status: "refunded" }] };
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["bloom"], addEverything: true }), refunded)).total).toBe(2499);
  });
  it("is only offered on a single or 'make it special'", () => {
    for (const product of ["pick3", "everything", "pass", "pack", "giftcard"] as const)
      expect(planCheckout(req({ product, templateSlugs: ["vinyl", "bloom", "museum"], packId: "deep", addEverything: true }), guest)).toMatchObject({ ok: false, error: "bump_not_available" });
  });
});

describe("checkout plan: creators", () => {
  it("credits the creator whose link brought the buyer, and never changes a price", () => {
    const plan = ok(planCheckout(req({ product: "everything" }), { ...guest, creatorCode: "MARIA" }));
    expect(plan).toMatchObject({ total: 2499, creatorCode: "MARIA" });
    const withBump = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: true }), { ...guest, creatorCode: "MARIA" }));
    expect(withBump.total).toBe(2499);
    expect(ok(planCheckout(req({ product: "pass" }), { ...guest, creatorCode: "MARIA" })).total).toBe(2999);
  });
});

describe("checkout plan: upgrade and what the buyer owns", () => {
  const signedIn: CheckoutContext = { ...guest, signedIn: true };

  it("prices the upgrade from what the buyer really paid", () => {
    const plan = ok(planCheckout(req({ product: "upgrade" }), { ...signedIn, purchases: [{ product: "single", amount: 999, currency: "eur", status: "paid" }] }));
    expect(plan).toMatchObject({ total: 1500, unlocks: ["*"], kind: "upgrade" });
    const floor = ok(planCheckout(req({ product: "upgrade" }), { ...signedIn, purchases: [{ product: "pick3", amount: 1499, currency: "eur", status: "paid" }, { product: "pick3", amount: 1499, currency: "eur", status: "paid" }] }));
    expect(floor.total).toBe(499);
  });
  it("needs an account for the upgrade", () => {
    expect(planCheckout(req({ product: "upgrade" }), guest)).toMatchObject({ ok: false, error: "sign_in_required", status: 401 });
  });
  it("won't sell what the buyer already owns for good", () => {
    const owner = { ...signedIn, ownedForever: ["*"] };
    for (const r of [req({ product: "everything" }), req({ product: "upgrade" }), req({ product: "single", templateSlugs: ["vinyl"] }), req({ product: "extras", templateSlugs: ["the-letter"] })])
      expect(planCheckout(r, owner)).toMatchObject({ ok: false, error: "already_owned", status: 409 });
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"] }), { ...signedIn, ownedForever: ["vinyl"] })).toMatchObject({ error: "already_owned" });
    expect(planCheckout(req({ product: "pack", packId: "deep" }), { ...signedIn, ownedForever: ["pack:deep"] })).toMatchObject({ error: "already_owned" });
  });
  it("still sells what only partly overlaps, and what doesn't unlock a template", () => {
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: true }), { ...signedIn, ownedForever: ["vinyl"] }).ok).toBe(true);
    expect(planCheckout(req({ product: "pick3", templateSlugs: ["vinyl", "bloom", "museum"] }), { ...signedIn, ownedForever: ["vinyl"] }).ok).toBe(true);
    expect(planCheckout(req({ product: "pack", packId: "deep" }), { ...signedIn, ownedForever: ["*"] }).ok).toBe(true);
    expect(planCheckout(req({ product: "pass" }), { ...signedIn, ownedForever: ["*"] }).ok).toBe(true);
    expect(planCheckout(req({ product: "giftcard" }), { ...signedIn, ownedForever: ["*"] }).ok).toBe(true);
  });
});

describe("checkout plan: Ethos for Two", () => {
  const on: CheckoutContext = { ...guest, signedIn: true, subscriptions: true, membership: null };
  const off: CheckoutContext = { ...on, subscriptions: false };
  const member = (over: Partial<NonNullable<CheckoutContext["membership"]>> = {}): NonNullable<CheckoutContext["membership"]> => ({ running: true, isOwner: true, provider: "stripe_subscription", status: "active", ...over });

  it("sells a monthly or yearly subscription while subscriptions are on, at the catalogue's price", () => {
    const monthly = ok(planCheckout(req({ product: "membership", plan: "monthly" }), on));
    expect(monthly).toMatchObject({ product: "membership", kind: "membership", plan: "monthly", billing: "subscription", total: 499, unlocks: [], templateSlugs: [], bump: false });
    expect(monthly.lines).toEqual([{ key: "membership", amount: 499 }]);
    expect(ok(planCheckout(req({ product: "membership", plan: "yearly" }), on)).total).toBe(2999);
    expect(ok(planCheckout(req({ product: "membership", plan: "yearly", currency: "usd" }), on)).total).toBe(3499);
    expect(ok(planCheckout(req({ product: "membership", plan: "monthly", currency: "gbp" }), on)).total).toBe(449);
    // A creator earns on the first payment like any sale: the checkout's purchase carries the code.
    expect(ok(planCheckout(req({ product: "membership", plan: "monthly" }), { ...on, creatorCode: "MARIA" })).creatorCode).toBe("MARIA");
  });

  it("while they are off, sells the one-time year for yearly and nothing for monthly", () => {
    expect(ok(planCheckout(req({ product: "membership", plan: "yearly" }), off))).toMatchObject({ product: "pass", kind: "pass", plan: "yearly", billing: "one_time", total: 2999 });
    expect(planCheckout(req({ product: "membership", plan: "monthly" }), off)).toMatchObject({ ok: false, error: "not_on_sale", status: 400 });
    // Pages from before keep buying the year while the switch is off, and can't once it's on.
    expect(ok(planCheckout(req({ product: "pass" }), off))).toMatchObject({ product: "pass", billing: "one_time" });
    expect(planCheckout(req({ product: "pass" }), on)).toMatchObject({ ok: false, error: "not_on_sale", status: 400 });
  });

  it("needs a plan", () => {
    expect(planCheckout(req({ product: "membership" }), on)).toMatchObject({ ok: false, error: "invalid_input", status: 400 });
    // The order bump rides on a single or "make it special" only.
    expect(planCheckout(req({ product: "membership", addEverything: true, plan: "yearly" }), on)).toMatchObject({ ok: false, error: "bump_not_available" });
  });

  it("never sells a second membership while one runs", () => {
    expect(planCheckout(req({ product: "membership", plan: "yearly" }), { ...on, membership: member() })).toMatchObject({ ok: false, error: "already_member", status: 409 });
    expect(planCheckout(req({ product: "membership", plan: "monthly" }), { ...on, membership: member({ isOwner: false }) })).toMatchObject({ error: "already_member" });
    expect(planCheckout(req({ product: "membership", plan: "monthly" }), { ...on, membership: member({ provider: "app_store" }) })).toMatchObject({ error: "already_member" });
    // A running pass isn't carried over into a subscription (not in this build): it runs its year first.
    expect(planCheckout(req({ product: "membership", plan: "yearly" }), { ...on, membership: member({ provider: "stripe_pass" }) })).toMatchObject({ error: "already_member" });
    // A partner buying the pass is buying a second one.
    expect(planCheckout(req({ product: "pass" }), { ...off, membership: member({ provider: "stripe_pass", isOwner: false }) })).toMatchObject({ error: "already_member" });
  });

  it("lets a pass owner renew their year while subscriptions are off, as before", () => {
    for (const provider of ["stripe_pass", "app_store_pass"] as const) {
      expect(ok(planCheckout(req({ product: "pass" }), { ...off, membership: member({ provider }) }))).toMatchObject({ product: "pass", total: 2999 });
      expect(ok(planCheckout(req({ product: "membership", plan: "yearly" }), { ...off, membership: member({ provider }) }))).toMatchObject({ product: "pass" });
    }
  });

  it("sends a buyer whose subscription Stripe is still collecting to the account page, not to a second one", () => {
    for (const status of ["past_due", "incomplete"] as const)
      for (const running of [true, false])
        expect(planCheckout(req({ product: "membership", plan: "monthly" }), { ...on, membership: member({ status, running }) })).toMatchObject({ ok: false, error: "payment_issue", status: 409 });
  });
});
