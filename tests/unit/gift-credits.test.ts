import { describe, expect, it } from "vitest";
import { PAIR_OFFER_WINDOW_MS, grantGifts, pairAllowed, paidForGiftRecently, readyGifts, restoreGiftsOf, revokeGiftsOf, revokeOneUnusedOf, settlePairSessions, spendGift } from "@/lib/commerce/gift-credits";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

const NOW = Date.parse("2026-11-24T12:00:00.000Z");

/** Gifts ready: what two more gifts put on an account (lib/commerce/gift-credits.ts, migration 0024). */
describe("gifts ready", () => {
  it("are granted two per purchase, and granting again changes nothing", async () => {
    const fake = new FakeDb({}, NOW);
    expect(await grantGifts(fake.db, "u1", "p1", 2)).toEqual({});
    expect(await grantGifts(fake.db, "u1", "p1", 2)).toEqual({});
    expect(fake.rows("gift_credits")).toHaveLength(2);
    expect(fake.rows("gift_credits").map((r) => r.n)).toEqual([1, 2]);
    expect(await readyGifts(fake.db, "u1")).toBe(2);
    expect(await readyGifts(fake.db, "someone-else")).toBe(0);
  });

  it("read as null, never an error, when migration 0024 isn't applied", async () => {
    const fake = new FakeDb({}, NOW, { missingTables: ["gift_credits"] });
    expect(await readyGifts(fake.db, "u1")).toBeNull();
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
    await expect(revokeGiftsOf(fake.db, "p1", NOW)).resolves.toBeUndefined();
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual([]);
    // Granting does fail: fulfilment must not mark a pair paid with nothing on the account.
    expect((await grantGifts(fake.db, "u1", "p1", 2)).error).toBeTruthy();
  });

  it("are used one at a time, each writing the template's unlock for the purchase that paid", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("spent");
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(fake.rows("template_unlocks")).toEqual([expect.objectContaining({ user_id: "u1", template_slug: "vinyl", purchase_id: "p1" })]);
    // The same template again: already held, nothing used.
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(await spendGift(fake.db, "u1", "bouquet")).toBe("spent");
    expect(await spendGift(fake.db, "u1", "xoxo")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });

  it("are never used on a template Everything already covers", async () => {
    const fake = new FakeDb({ template_unlocks: [{ id: "t1", user_id: "u1", template_slug: "*", purchase_id: "e1" }] }, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(2);
  });

  it("all stop counting on a full refund, used or not", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await revokeGiftsOf(fake.db, "p1", NOW);
    expect(fake.rows("gift_credits").every((r) => r.revoked_at)).toBe(true);
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });

  it("lose one unused gift on half a refund, once only", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(true);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The same refund's event again takes nothing more.
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
  });

  it("keep a used gift on half a refund, and take the unused one", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(true);
    const [first, second] = fake.rows("gift_credits");
    expect(first).toMatchObject({ spent_slug: "vinyl", revoked_at: null });
    expect(second.revoked_at).toBeTruthy();
  });

  it("take nothing on half a refund when both were used", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await spendGift(fake.db, "u1", "bouquet");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
  });

  it("come back after a won dispute, naming the templates the used ones went on", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await revokeGiftsOf(fake.db, "p1", NOW, "dispute");
    expect(fake.rows("gift_credits").map((r) => r.revoked_for)).toEqual(["dispute", "dispute"]);
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual(["vinyl"]);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(fake.rows("gift_credits").map((r) => r.revoked_for)).toEqual([null, null]);
  });

  it("after half a refund, a won dispute gives back only what the dispute took", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    // Half the money back: the unused one goes, for good.
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(true);
    await revokeGiftsOf(fake.db, "p1", NOW, "dispute");
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual(["vinyl"]);
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(fake.rows("gift_credits").find((r) => r.spent_slug === null)).toMatchObject({ revoked_for: "refund" });
    expect(fake.rows("gift_credits").find((r) => r.spent_slug === null)?.revoked_at).toBeTruthy();
  });

  it("a full refund is never undone by a dispute won later", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await revokeGiftsOf(fake.db, "p1", NOW);
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual([]);
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });
});

describe("paidForGiftRecently: the share screen offers two more gifts only after paying for this gift", () => {
  const unlocks = [
    { template_slug: "vinyl", purchase_id: "s1" },
    { template_slug: "photos:the-letter", purchase_id: "ph1" },
    { template_slug: "bouquet", purchase_id: "pair1" },
    { template_slug: "xoxo", purchase_id: "old" },
  ];
  const at = (ms: number) => new Date(NOW - ms).toISOString();
  const purchases = [
    { id: "s1", product: "single", status: "paid", created_at: at(10 * 60_000) },
    { id: "ph1", product: "photos", status: "paid", created_at: at(60 * 60_000) },
    { id: "pair1", product: "pair", status: "paid", created_at: at(60_000) },
    { id: "old", product: "single", status: "paid", created_at: at(PAIR_OFFER_WINDOW_MS + 60_000) },
  ];
  it("yes for a template, or a note's photos, paid for in the last day", () => {
    expect(paidForGiftRecently(unlocks, purchases, "vinyl", NOW)).toBe(true);
    expect(paidForGiftRecently(unlocks, purchases, "the-letter", NOW)).toBe(true);
  });
  it("no for a template bought over a day ago, one sent on a gift ready, one never paid for, or a refunded one", () => {
    expect(paidForGiftRecently(unlocks, purchases, "xoxo", NOW)).toBe(false);
    expect(paidForGiftRecently(unlocks, purchases, "bouquet", NOW)).toBe(false);
    expect(paidForGiftRecently(unlocks, purchases, "balloons", NOW)).toBe(false);
    expect(paidForGiftRecently(unlocks, purchases.map((p) => ({ ...p, status: "refunded" })), "vinyl", NOW)).toBe(false);
  });
});

describe("settlePairSessions: one open checkout for two more gifts at a time", () => {
  const HOUR = 60 * 60 * 1000;
  const setup = () => {
    const stripe = new FakeStripe(() => NOW);
    const fake = new FakeDb({ purchases: [] }, NOW);
    const open = (id: string, uiMode: "elements" | "hosted", amount = 799, currency = "eur", ageMs = HOUR) => {
      stripe.sessions[id] = { id, object: "checkout.session", status: "open", ui_mode: uiMode, client_secret: uiMode === "elements" ? `${id}_secret` : null, url: uiMode === "hosted" ? `https://checkout.stripe.test/c/${id}` : null };
      fake.tables.purchases.push({ id: `p-${id}`, user_id: "u1", product: "pair", status: "pending", amount, currency, stripe_session_id: id, created_at: new Date(NOW - ageMs).toISOString() });
    };
    return { stripe, fake, open };
  };
  const expired = (stripe: FakeStripe) => stripe.calls.filter((c) => c.method === "checkout.sessions.expire").map((c) => c.args[0]);

  it("keeps the wallet session to go back to, and closes the Stripe page and the other currency's", async () => {
    const { stripe, fake, open } = setup();
    open("cs_wallet", "elements", 799, "eur", 2 * HOUR);
    open("cs_page", "hosted", 799, "eur", HOUR);
    open("cs_usd", "elements", 899, "usd", 30 * 60_000);
    const kept = await settlePairSessions(stripe.client, fake.db, "u1", NOW, { amount: 799, currency: "eur", oneTap: true });
    expect(kept?.id).toBe("cs_wallet");
    expect(expired(stripe).sort()).toEqual(["cs_page", "cs_usd"]);
  });

  it("a card request after a wallet session closes the wallet's before a new one is made", async () => {
    const { stripe, fake, open } = setup();
    open("cs_wallet", "elements");
    expect(await settlePairSessions(stripe.client, fake.db, "u1", NOW, { amount: 799, currency: "eur", oneTap: false })).toBeNull();
    expect(expired(stripe)).toEqual(["cs_wallet"]);
    expect(stripe.sessions.cs_wallet.status).toBe("expired");
  });

  it("goes back only to one made in the last 12 hours, and closes an older one", async () => {
    const { stripe, fake, open } = setup();
    open("cs_old", "elements", 799, "eur", 13 * HOUR);
    expect(await settlePairSessions(stripe.client, fake.db, "u1", NOW, { amount: 799, currency: "eur", oneTap: true })).toBeNull();
    expect(expired(stripe)).toEqual(["cs_old"]);
  });

  it("once one is paid, closes every other still open, and leaves the paid one and other accounts alone", async () => {
    const { stripe, fake, open } = setup();
    open("cs_wallet", "elements");
    open("cs_page", "hosted");
    stripe.sessions.cs_page.status = "complete";
    fake.tables.purchases.push({ id: "p-other", user_id: "u2", product: "pair", status: "pending", amount: 799, currency: "eur", stripe_session_id: "cs_other", created_at: new Date(NOW - HOUR).toISOString() });
    stripe.sessions.cs_other = { id: "cs_other", status: "open", ui_mode: "elements" };
    expect(await settlePairSessions(stripe.client, fake.db, "u1", NOW)).toBeNull();
    expect(expired(stripe)).toEqual(["cs_wallet"]);
    expect(stripe.sessions.cs_other.status).toBe("open");
  });
});

describe("pairAllowed", () => {
  const yes = { onSale: true, signedIn: true, ready: 0, ownedForever: ["vinyl"], memberRunning: false, paidProducts: ["single"] };

  it("lets a signed-in buyer of a gift with nothing ready buy two more", () => {
    expect(pairAllowed(yes)).toEqual({ ok: true });
    for (const product of ["single", "extras", "photos", "pick3"]) expect(pairAllowed({ ...yes, paidProducts: [product] })).toEqual({ ok: true });
  });

  it("refuses while it is off, or while the table isn't there", () => {
    expect(pairAllowed({ ...yes, onSale: false })).toEqual({ ok: false, error: "not_on_sale" });
    expect(pairAllowed({ ...yes, ready: null })).toEqual({ ok: false, error: "not_on_sale" });
  });

  it("refuses a guest", () => {
    expect(pairAllowed({ ...yes, signedIn: false, ready: null })).toEqual({ ok: false, error: "sign_in_required" });
  });

  it("refuses someone who has gifts ready", () => {
    expect(pairAllowed({ ...yes, ready: 1 })).toEqual({ ok: false, error: "pair_ready" });
  });

  it("refuses someone who holds every template, or whose Ethos for Two runs", () => {
    expect(pairAllowed({ ...yes, ownedForever: ["*"] })).toEqual({ ok: false, error: "already_owned" });
    expect(pairAllowed({ ...yes, memberRunning: true })).toEqual({ ok: false, error: "already_owned" });
  });

  it("refuses someone who has never paid for a gift", () => {
    expect(pairAllowed({ ...yes, paidProducts: [] })).toEqual({ ok: false, error: "pair_needs_purchase" });
    for (const product of ["pack", "giftcard", "pass", "pair", "upgrade", "everything"]) expect(pairAllowed({ ...yes, paidProducts: [product] })).toEqual({ ok: false, error: "pair_needs_purchase" });
  });
});
