import { describe, expect, it } from "vitest";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { PASS_MS, joinPass, remindRenewals, shortenRefundedPass, startPass, sweepEndedPasses, type Pass } from "@/lib/commerce/passes";
import { foreverUnlocks, grantForever } from "@/lib/commerce/unlocks";
import { packsFromRows, passFromMembership, templatesFromRows, upgradeOffer } from "@/lib/commerce/entitlements";
import { summariseMembership } from "@/lib/commerce/memberships";
import { FakeDb } from "./helpers/fake-db";

const OWNER = "owner-1";
const PARTNER = "partner-1";
const START = Date.parse("2026-09-23T12:00:00.000Z");

function unlocks(fake: FakeDb, userId: string) {
  return fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => `${r.template_slug}@${r.purchase_id}`)
    .sort();
}

async function started(fake: FakeDb, purchaseId: string, ownerId = OWNER) {
  const result = await startPass(fake.db, { purchaseId, ownerId, now: fake.clock });
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("a yearly pass", () => {
  it("runs 365 days from purchase and unlocks every template and pack for the owner", async () => {
    const fake = new FakeDb({}, START);
    const { pass, created, paidUntil } = await started(fake, "p1");
    expect(created).toBe(true);
    expect(pass.starts_at).toBe(iso(START));
    expect(pass.ends_at).toBe(iso(START + 365 * DAY_MS));
    expect(paidUntil).toBe(START + PASS_MS);
    expect(pass.invite_code).toMatch(/^[a-z2-7]{10}$/);
    expect(unlocks(fake, OWNER)).toEqual(["*@p1", "pack:*@p1"]);
  });

  it("can be fulfilled twice (webhook and success page) without adding a second year", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    const again = await started(fake, "p1");
    expect(again.created).toBe(false);
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(fake.rows("template_unlocks")).toHaveLength(2);
  });

  it("renews by adding a year after the running one, keeping the partner", async () => {
    const fake = new FakeDb({}, START);
    const first = await started(fake, "p1");
    await joinPass(fake.db, { code: first.pass.invite_code, userId: PARTNER, now: START });
    fake.clock = START + 351 * DAY_MS;
    const renewal = await started(fake, "p2");
    expect(renewal.pass.starts_at).toBe(first.pass.ends_at);
    expect(renewal.pass.ends_at).toBe(iso(START + 2 * PASS_MS));
    expect(renewal.pass.partner_user_id).toBe(PARTNER);
    expect(renewal.paidUntil).toBe(START + 2 * PASS_MS);
    // Not running yet: the rows still come from the first year.
    expect(unlocks(fake, OWNER)).toEqual(["*@p1", "pack:*@p1"]);
  });

  it("starts from today when the last one already ended", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    fake.clock = START + 400 * DAY_MS;
    const next = await started(fake, "p2");
    expect(next.pass.starts_at).toBe(iso(fake.clock));
    expect(next.pass.partner_user_id).toBeNull();
  });

  it("leaves Everything bought outright where it was", async () => {
    const fake = new FakeDb({ template_unlocks: [{ id: "u0", user_id: OWNER, template_slug: "*", purchase_id: "everything-1" }] }, START);
    await started(fake, "p1");
    expect(unlocks(fake, OWNER)).toEqual(["*@everything-1", "pack:*@p1"]);
  });
});

describe("joining a pass", () => {
  it("lets the partner in once, with the same unlocks", async () => {
    const fake = new FakeDb({}, START);
    const { pass } = await started(fake, "p1");
    const joined = await joinPass(fake.db, { code: pass.invite_code, userId: PARTNER, now: START + DAY_MS });
    expect(joined).toMatchObject({ ok: true, paidUntil: START + PASS_MS });
    expect(fake.rows("couple_passes")[0].partner_user_id).toBe(PARTNER);
    expect(unlocks(fake, PARTNER)).toEqual(["*@p1", "pack:*@p1"]);
    // Opening the link again is harmless.
    expect(await joinPass(fake.db, { code: pass.invite_code, userId: PARTNER, now: START + DAY_MS })).toMatchObject({ ok: true });
  });

  it("refuses a second partner, the owner, a wrong code and an ended pass", async () => {
    const fake = new FakeDb({}, START);
    const { pass } = await started(fake, "p1");
    expect(await joinPass(fake.db, { code: pass.invite_code, userId: OWNER, now: START })).toEqual({ ok: false, error: "own_pass" });
    expect(await joinPass(fake.db, { code: "zzzzzzzzzz", userId: PARTNER, now: START })).toEqual({ ok: false, error: "not_found" });
    await joinPass(fake.db, { code: pass.invite_code, userId: PARTNER, now: START });
    expect(await joinPass(fake.db, { code: pass.invite_code, userId: "stranger", now: START })).toEqual({ ok: false, error: "taken" });
    expect(unlocks(fake, "stranger")).toEqual([]);

    const later = new FakeDb({}, START);
    const { pass: old } = await started(later, "p9");
    expect(await joinPass(later.db, { code: old.invite_code, userId: PARTNER, now: START + 366 * DAY_MS })).toEqual({ ok: false, error: "expired" });
  });

  it("joins every year already paid for, whichever year's link was used", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    fake.clock = START + 300 * DAY_MS;
    const renewal = await started(fake, "p2");
    const joined = await joinPass(fake.db, { code: renewal.pass.invite_code, userId: PARTNER, now: fake.clock });
    expect(joined).toMatchObject({ ok: true, paidUntil: START + 2 * PASS_MS });
    expect(fake.rows("couple_passes").map((p) => p.partner_user_id)).toEqual([PARTNER, PARTNER]);
    expect(unlocks(fake, PARTNER)).toEqual(["*@p1", "pack:*@p1"]);
  });
});

describe("the passes cron", () => {
  it("takes the rows away when the year ends, from both people", async () => {
    const fake = new FakeDb({}, START);
    const { pass } = await started(fake, "p1");
    await joinPass(fake.db, { code: pass.invite_code, userId: PARTNER, now: START });
    fake.clock = START + 364 * DAY_MS;
    expect(await sweepEndedPasses(fake.db, fake.clock)).toEqual({ ended: 0, users: 0 });
    expect(unlocks(fake, OWNER)).toHaveLength(2);
    fake.clock = START + 366 * DAY_MS;
    expect(await sweepEndedPasses(fake.db, fake.clock)).toEqual({ ended: 1, users: 2 });
    expect(unlocks(fake, OWNER)).toEqual([]);
    expect(unlocks(fake, PARTNER)).toEqual([]);
  });

  it("hands over to the renewal without a gap", async () => {
    const fake = new FakeDb({}, START);
    const { pass } = await started(fake, "p1");
    await joinPass(fake.db, { code: pass.invite_code, userId: PARTNER, now: START });
    fake.clock = START + 360 * DAY_MS;
    await started(fake, "p2");
    fake.clock = START + 366 * DAY_MS;
    await sweepEndedPasses(fake.db, fake.clock);
    expect(unlocks(fake, OWNER)).toEqual(["*@p2", "pack:*@p2"]);
    expect(unlocks(fake, PARTNER)).toEqual(["*@p2", "pack:*@p2"]);
  });

  it("never takes away Everything bought outright, before or during the pass", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    // Bought Everything while the pass ran: the pass's "*" row becomes theirs for good.
    await grantForever(fake.db, OWNER, ["*"], "everything-1");
    expect(unlocks(fake, OWNER)).toEqual(["*@everything-1", "pack:*@p1"]);
    expect(await foreverUnlocks(fake.db, OWNER)).toEqual(["*"]);
    fake.clock = START + 366 * DAY_MS;
    await sweepEndedPasses(fake.db, fake.clock);
    expect(unlocks(fake, OWNER)).toEqual(["*@everything-1"]);
  });

  it("reminds the owner once, 14 days before the end, unless they already renewed", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    await started(fake, "q1", "owner-2");
    const sent: string[] = [];
    const send = async (pass: Pass) => {
      sent.push(pass.owner_user_id);
      return true;
    };
    fake.clock = START + 340 * DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, send)).toEqual({ due: 0, sent: 0 });
    // owner-2 renews before the reminder window.
    await started(fake, "q2", "owner-2");
    fake.clock = START + 352 * DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, send)).toMatchObject({ sent: 1 });
    expect(sent).toEqual([OWNER]);
    fake.clock += DAY_MS;
    await remindRenewals(fake.db, fake.clock, send);
    expect(sent).toEqual([OWNER]);
  });

  it("doesn't remind twice when a refunded renewal left a zero-length year behind", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    await started(fake, "p2");
    await shortenRefundedPass(fake.db, "p2", START + DAY_MS);
    const sent: string[] = [];
    fake.clock = START + 355 * DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, async (pass) => (sent.push(pass.purchase_id), true))).toMatchObject({ sent: 1 });
    expect(sent).toEqual(["p1"]);
  });

  it("marks a year already renewed as handled, so it never crowds out one that isn't", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    await started(fake, "p2");
    fake.clock = START + 355 * DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, async () => true)).toEqual({ due: 1, sent: 0 });
    expect((fake.rows("couple_passes").find((p) => p.purchase_id === "p1") as Pass).renewal_reminded_at).toBe(iso(fake.clock));
    fake.clock += DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, async () => true)).toEqual({ due: 0, sent: 0 });
  });

  it("reminds again when the renewal that stopped the reminder is refunded", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    await started(fake, "p2");
    fake.clock = START + 355 * DAY_MS;
    const sent: string[] = [];
    const send = async (pass: Pass) => (sent.push(pass.purchase_id), true);
    await remindRenewals(fake.db, fake.clock, send);
    expect(sent).toEqual([]);
    await shortenRefundedPass(fake.db, "p2", fake.clock);
    fake.clock += DAY_MS;
    await remindRenewals(fake.db, fake.clock, send);
    expect(sent).toEqual(["p1"]);
  });

  it("tries again tomorrow when the email didn't go", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    fake.clock = START + 355 * DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, async () => false)).toEqual({ due: 1, sent: 0 });
    expect(fake.rows("couple_passes")[0].renewal_reminded_at).toBeNull();
    fake.clock += DAY_MS;
    expect(await remindRenewals(fake.db, fake.clock, async () => true)).toEqual({ due: 1, sent: 1 });
  });
});

describe("refunding a pass", () => {
  it("ends the refunded year now and moves the renewal up", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    fake.clock = START + 100 * DAY_MS;
    await started(fake, "p2");
    await shortenRefundedPass(fake.db, "p1", fake.clock);
    const [first, second] = fake.rows("couple_passes") as Pass[];
    expect(first.ends_at).toBe(iso(fake.clock));
    expect(second.starts_at).toBe(iso(fake.clock));
    expect(second.ends_at).toBe(iso(fake.clock + PASS_MS));
  });

  it("closes a year that hadn't started, and leaves a used-up one alone", async () => {
    const fake = new FakeDb({}, START);
    await started(fake, "p1");
    fake.clock = START + 100 * DAY_MS;
    const renewal = await started(fake, "p2");
    await shortenRefundedPass(fake.db, "p2", fake.clock);
    const refunded = fake.rows("couple_passes").find((p) => p.purchase_id === "p2") as Pass;
    expect(refunded.ends_at).toBe(renewal.pass.starts_at);
    expect(refunded.starts_at).toBe(renewal.pass.starts_at);
    fake.clock = START + 400 * DAY_MS;
    await shortenRefundedPass(fake.db, "p1", fake.clock);
    expect((fake.rows("couple_passes").find((p) => p.purchase_id === "p1") as Pass).ends_at).toBe(iso(START + PASS_MS));
  });
});

describe("entitlements", () => {
  it("splits unlock rows into templates and packs", () => {
    expect(templatesFromRows(["*", "vinyl", "pack:*"])).toEqual(["*", "vinyl"]);
    expect(packsFromRows(["*", "pack:*"])).toEqual(["*", "deep", "distance", "spicy"]);
    expect(packsFromRows(["pack:deep", "vinyl"])).toEqual(["deep"]);
    expect(packsFromRows(["*"])).toEqual([]);
  });

  it("describes the pass as the owner and as the partner (the `pass` field the app's current build reads)", async () => {
    const fake = new FakeDb({}, START);
    const first = await started(fake, "p1");
    await started(fake, "p2");
    const passes = fake.rows("couple_passes") as Pass[];
    const invite = (code: string) => `https://x/join?code=${code}`;
    const summarisePass = (rows: Pass[], userId: string, now: number, link: (code: string) => string) => passFromMembership(summariseMembership(rows, userId, now, { invite: link }));
    expect(summarisePass(passes, OWNER, START + DAY_MS, invite)).toEqual({
      endsAt: iso(START + 2 * PASS_MS),
      isOwner: true,
      partnerJoined: false,
      inviteUrl: `https://x/join?code=${first.pass.invite_code}`,
    });
    await joinPass(fake.db, { code: first.pass.invite_code, userId: PARTNER, now: START + DAY_MS });
    const joined = fake.rows("couple_passes") as Pass[];
    expect(summarisePass(joined, OWNER, START + DAY_MS, invite)).toEqual({ endsAt: iso(START + 2 * PASS_MS), isOwner: true, partnerJoined: true });
    expect(summarisePass(joined, PARTNER, START + DAY_MS, invite)).toEqual({ endsAt: iso(START + 2 * PASS_MS), isOwner: false, partnerJoined: true });
    expect(summarisePass(joined, "stranger", START + DAY_MS, invite)).toBeNull();
    expect(summarisePass(joined, OWNER, START + 3 * PASS_MS, invite)).toBeNull();
  });

  it("offers the upgrade only to someone with singles to upgrade from", () => {
    const single = { product: "single", amount: 999, currency: "eur", status: "paid" };
    expect(upgradeOffer([], [single], "eur")).toEqual({ amount: 1500, currency: "eur" });
    expect(upgradeOffer(["*"], [single], "eur")).toBeNull();
    expect(upgradeOffer([], [], "eur")).toBeNull();
    expect(upgradeOffer([], [{ ...single, product: "pass" }], "eur")).toBeNull();
  });
});
