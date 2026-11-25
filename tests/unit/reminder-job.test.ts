import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-db";
import { PRODUCTS } from "@/lib/pricing/products";

/** The price line's figures: a gift's own price, and that plus the pair (the catalogue's, never typed). */
const SINGLE = PRODUCTS.single.amounts;
const EXTRAS = PRODUCTS.extras.amounts;
const PAIR = PRODUCTS.pair.amounts;

vi.mock("server-only", () => ({}));

const { paidLine, sendReminders, stageClaimFilter, supabaseReminderJobStore } = await import("@/lib/lifecycle/reminder-job");
type Staged = Parameters<Parameters<typeof sendReminders>[0]["send"]>[0];
type Old = Parameters<Parameters<typeof sendReminders>[0]["sendOld"]>[0];

const USER = "11111111-1111-4111-8111-111111111111";
const R = "22222222-2222-4222-8222-222222222222";
const GIFT = "33333333-3333-4333-8333-333333333333";

/** Mia's anniversary, Friday 5 March 2027. */
const reminder = (over: Record<string, unknown> = {}) => ({
  id: R,
  user_id: USER,
  recipient_name: "Mia",
  occasion: "anniversary",
  month: 3,
  day: 5,
  locale: "en",
  template_slug: "museum",
  last_sent_year: null,
  last_stage: 0,
  currency: null,
  created_at: "2026-11-01T00:00:00.000Z",
  ...over,
});

function world(rows: Record<string, unknown>[] = [reminder()], seed: Record<string, Record<string, unknown>[]> = {}, options: ConstructorParameters<typeof FakeDb>[2] = {}) {
  return new FakeDb({ reminders: rows, profiles: [{ id: USER, email: "leo@icloud.test" }], ...seed }, Date.parse("2026-11-24T07:00:00Z"), options);
}

function run(fake: FakeDb, today: string, over: Partial<Parameters<typeof sendReminders>[0]> = {}) {
  const sent: Staged[] = [];
  const old: Old[] = [];
  const result = sendReminders({
    store: supabaseReminderJobStore(fake.db as never),
    send: async (email) => {
      sent.push(email);
      return true;
    },
    sendOld: async (email) => {
      old.push(email);
      return true;
    },
    links: async (row, stage, year) => ({ openUrl: `open/${row.id}/${stage}`, moreUrl: `more/${row.id}`, skipUrl: `skip/${row.id}/${year}`, removeUrl: `remove/${row.id}` }),
    removeUrl: async (row) => `remove/${row.id}`,
    pairOnSale: true,
    now: new Date(`${today}T07:00:00Z`),
    inTime: () => true,
    pause: async () => {},
    ...over,
  });
  return { sent, old, result };
}

const state = (fake: FakeDb) => {
  const r = fake.rows("reminders")[0];
  return [r.last_sent_year, r.last_stage];
};

describe("the three e-mails before a day", () => {
  it("sends each stage on its day, with words that say when", async () => {
    const fake = world();
    const first = run(fake, "2027-02-26");
    expect(await first.result).toEqual({ sent: 1, failed: 0, deferred: 0, mode: "stages" });
    expect(first.sent[0]).toMatchObject({ to: "leo@icloud.test", stage: 1, when: "next Friday", weekday: "Friday", date: "5 March", occasion: "anniversary", recipientName: "Mia", onceKey: `reminder/${R}:2027:1` });
    expect(state(fake)).toEqual([2027, 1]);

    for (const quiet of ["2027-02-27", "2027-02-28", "2027-03-01", "2027-03-02"]) expect((await run(fake, quiet).result).sent).toBe(0);

    const second = run(fake, "2027-03-03");
    await second.result;
    expect(second.sent.map((s) => [s.stage, s.when])).toEqual([[2, "this Friday"]]);
    expect(state(fake)).toEqual([2027, 2]);

    const third = run(fake, "2027-03-04");
    await third.result;
    expect(third.sent.map((s) => [s.stage, s.when])).toEqual([[3, "tomorrow"]]);
    expect(state(fake)).toEqual([2027, 3]);

    expect((await run(fake, "2027-03-05").result).sent).toBe(0);
  });

  it("sends nothing twice when the morning runs twice", async () => {
    const fake = world();
    expect((await run(fake, "2027-02-26").result).sent).toBe(1);
    expect((await run(fake, "2027-02-26").result).sent).toBe(0);
    await run(fake, "2027-03-04").result;
    expect((await run(fake, "2027-03-04").result).sent).toBe(0);
  });

  it("sends the first e-mail up to two days late, saying 'this Friday', and never later", async () => {
    const late = world();
    const two = run(late, "2027-02-28");
    await two.result;
    expect(two.sent.map((s) => [s.stage, s.when])).toEqual([[1, "this Friday"]]);
    const tooLate = world();
    expect((await run(tooLate, "2027-03-01").result).sent).toBe(0);
    expect(state(tooLate)).toEqual([null, 0]);
  });

  it("sends nothing for a reminder done for the year, or written done by the code before 0025", async () => {
    for (const done of [reminder({ last_sent_year: 2027, last_stage: 3 }), reminder({ last_sent_year: 2027, last_stage: 0 })]) {
      const fake = world([done]);
      for (const day of ["2027-02-26", "2027-03-03", "2027-03-04"]) expect((await run(fake, day).result).sent).toBe(0);
    }
  });

  it("gives a reminder that got the first e-mail the second and third on their days", async () => {
    const fake = world([reminder({ last_sent_year: 2027, last_stage: 1 })]);
    expect((await run(fake, "2027-02-27").result).sent).toBe(0);
    expect((await run(fake, "2027-03-03").result).sent).toBe(1);
    expect((await run(fake, "2027-03-04").result).sent).toBe(1);
    expect(state(fake)).toEqual([2027, 3]);
  });

  it("never sends the first e-mail after the third, even on a caught-up run", async () => {
    // The second already went (a stage written out of order by hand, say): a late first never follows it.
    const fake = world([reminder({ last_sent_year: 2027, last_stage: 2 })]);
    expect(await run(fake, "2027-02-28").result).toMatchObject({ sent: 0 });
  });

  it("sends one e-mail when two runs go at once", async () => {
    const fake = world();
    const a = run(fake, "2027-02-26");
    const b = run(fake, "2027-02-26");
    const [ra, rb] = await Promise.all([a.result, b.result]);
    expect(ra.sent + rb.sent).toBe(1);
    expect(a.sent.length + b.sent.length).toBe(1);
  });

  it("gives the claim back when an e-mail fails, and the next run sends it", async () => {
    const fake = world([reminder({ last_sent_year: 2027, last_stage: 1 })]);
    const failing = run(fake, "2027-03-03", { send: async () => false });
    expect(await failing.result).toMatchObject({ sent: 0, failed: 1 });
    expect(state(fake)).toEqual([2027, 1]);
    const again = run(fake, "2027-03-03");
    expect(await again.result).toMatchObject({ sent: 1, failed: 0 });
    expect(state(fake)).toEqual([2027, 2]);
  });

  it("stops cleanly when the time runs out, claiming nothing it doesn't send", async () => {
    const other = { ...reminder({ id: "44444444-4444-4444-8444-444444444444", recipient_name: "Ana", created_at: "2026-11-02T00:00:00.000Z" }) };
    const fake = world([reminder(), other]);
    let budget = 1;
    const out = run(fake, "2027-02-26", { inTime: () => budget-- > 0 });
    expect(await out.result).toEqual({ sent: 1, failed: 0, deferred: 1, mode: "stages" });
    expect(fake.rows("reminders").map((r) => [r.recipient_name, r.last_sent_year, r.last_stage])).toEqual([
      ["Mia", 2027, 1],
      ["Ana", null, 0],
    ]);
    // Tomorrow's catch-up sends the other.
    expect((await run(fake, "2027-02-27").result).sent).toBe(1);
  });

  it("sends a busy day's e-mails over the morning's runs: what one run's time can't hold, the next sends, once each", async () => {
    // Valentine's Day: 250 reminders all due their day-before e-mail on 13 February, and time for 90 a run.
    const rows = Array.from({ length: 250 }, (_, i) =>
      reminder({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
        occasion: "valentines",
        month: 2,
        day: 14,
        last_sent_year: 2027,
        last_stage: 2,
        created_at: `2026-11-01T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}.000Z`,
      }),
    );
    const fake = world(rows);
    const budget = (n: number) => () => n-- > 0;
    const first = run(fake, "2027-02-13", { inTime: budget(90) });
    expect(await first.result).toEqual({ sent: 90, failed: 0, deferred: 110, mode: "stages" });
    expect(first.sent.every((e) => e.stage === 3)).toBe(true);
    // The 08:00 run, the same day.
    const second = run(fake, "2027-02-13", { inTime: budget(500) });
    expect(await second.result).toEqual({ sent: 160, failed: 0, deferred: 0, mode: "stages" });
    expect(new Set([...first.sent, ...second.sent].map((e) => e.onceKey)).size).toBe(250);
    expect(fake.rows("reminders").every((r) => r.last_stage === 3)).toBe(true);
    // A third run finds nothing left.
    expect((await run(fake, "2027-02-13").result).sent).toBe(0);
  });

  it("suggests a paid template for a day of someone else's, never the free note", async () => {
    const mum = run(world([reminder({ recipient_name: "Mum", occasion: "other", template_slug: null, currency: "eur" })]), "2027-02-26");
    await mum.result;
    expect(mum.sent[0]).toMatchObject({ templateSlug: "jar-of-reasons", paid: "price", prices: { single: SINGLE.eur, three: SINGLE.eur + PAIR.eur, currency: "eur" } });
  });

  it("sends a 29 February birthday's e-mails on the 28th's days in a common year", async () => {
    const fake = world([reminder({ occasion: "birthday", month: 2, day: 29 })]);
    const first = run(fake, "2027-02-21");
    await first.result;
    expect(first.sent.map((s) => [s.stage, s.date])).toEqual([[1, "28 February"]]);
    expect((await run(fake, "2027-02-27").result).sent).toBe(1);
  });

  it("works on a database without migration 0025: one e-mail nine days before, as before", async () => {
    const fake = world([reminder()], {}, { missingColumns: { reminders: ["last_stage", "currency"] } });
    fake.tables.reminders = fake.tables.reminders.map((row) => Object.fromEntries(Object.entries(row).filter(([column]) => column !== "last_stage" && column !== "currency")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const early = run(fake, "2027-02-24");
    expect(await early.result).toEqual({ sent: 1, failed: 0, deferred: 0, mode: "old" });
    expect(early.sent).toEqual([]);
    expect(early.old).toEqual([{ to: "leo@icloud.test", locale: "en", recipientName: "Mia", occasion: "anniversary", date: "5 March", avoid: "museum", removeUrl: `remove/${R}`, onceKey: `reminder-old/${R}:2027` }]);
    expect(fake.rows("reminders")[0].last_sent_year).toBe(2027);
    expect((await run(fake, "2027-02-24").result).sent).toBe(0);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe("what each e-mail says it holds", () => {
  it("says photos only when a live or scheduled gift for that name has some, compared trimmed and lower-case", async () => {
    const gifts = [
      { id: "55555555-5555-4555-8555-555555555555", user_id: USER, status: "draft", updated_at: "2026-12-01", data: { recipientName: "Mia", photos: [{ id: "p", url: "gifts/x/p.jpg" }] } },
      { id: GIFT, user_id: USER, status: "live", updated_at: "2026-10-01", data: { recipientName: " mia ", photos: [{ id: "p", url: "gifts/y/p.jpg" }] } },
    ];
    const withPhotos = run(world([reminder()], { gifts }), "2027-02-26");
    await withPhotos.result;
    expect(withPhotos.sent[0].started).toBe("photos");

    const noPhotos = run(world([reminder()], { gifts: [{ ...gifts[1], data: { recipientName: "Mia", photos: [] } }] }), "2027-02-26");
    await noPhotos.result;
    expect(noPhotos.sent[0].started).toBe("name");

    // Someone no gift was made for (mum, a friend): never photos.
    const nobody = run(world([reminder({ recipient_name: "Mum", occasion: "birthday" })], { gifts }), "2027-02-26");
    await nobody.result;
    expect(nobody.sent[0].started).toBe("name");
  });

  it("puts the gift ready, the price in the reminder's currency or the last purchase's, or nothing under the button", async () => {
    const ready = run(world([reminder()], { gift_credits: [{ id: "c1", user_id: USER, purchase_id: "p", n: 1, spent_slug: null, revoked_at: null }] }), "2027-02-26");
    await ready.result;
    expect(ready.sent[0]).toMatchObject({ paid: "ready" });

    const saved = run(world([reminder({ currency: "eur" })]), "2027-02-26");
    await saved.result;
    expect(saved.sent[0]).toMatchObject({ paid: "price", prices: { single: SINGLE.eur, three: SINGLE.eur + PAIR.eur, currency: "eur" } });

    const bought = run(world([reminder()], { purchases: [{ id: "p1", user_id: USER, status: "paid", currency: "usd", created_at: "2026-11-01" }] }), "2027-02-26");
    await bought.result;
    expect(bought.sent[0]).toMatchObject({ paid: "price", prices: { single: SINGLE.usd, three: SINGLE.usd + PAIR.usd, currency: "usd" } });

    const unknown = run(world(), "2027-02-26");
    await unknown.result;
    expect(unknown.sent[0]).toMatchObject({ paid: "none" });

    const everything = run(world([reminder({ currency: "gbp" })], { template_unlocks: [{ id: "u", user_id: USER, template_slug: "*" }] }), "2027-02-26");
    await everything.result;
    expect(everything.sent[0]).toMatchObject({ paid: "none" });
  });

  it("prices a free template as 'Make it special', and names no three while two more gifts aren't on sale", () => {
    const facts = { ready: 0, owned: [], currency: null };
    expect(paidLine(facts, "eur", "the-letter", "free", true)).toEqual({ paid: "price", prices: { single: EXTRAS.eur, three: EXTRAS.eur + PAIR.eur, currency: "eur" } });
    expect(paidLine(facts, "gbp", "museum", "premium", false)).toEqual({ paid: "price", prices: { single: SINGLE.gbp, three: null, currency: "gbp" } });
    expect(paidLine({ ...facts, owned: ["museum"] }, "gbp", "museum", "premium", true)).toEqual({ paid: "none" });
    expect(paidLine({ ...facts, ready: null }, null, "museum", "premium", true)).toEqual({ paid: "none" });
  });

  it("claims with a condition that never takes a year written without a stage", () => {
    expect(stageClaimFilter(2027, 2)).toBe("last_sent_year.is.null,last_sent_year.lt.2027,and(last_sent_year.eq.2027,last_stage.gt.0,last_stage.lt.2)");
  });
});

describe("the price line while two more gifts are in preview (GIFT_PAIR_ENABLED=preview)", () => {
  it("in preview the three is named for a listed address only", async () => {
    const listed = run(world([reminder({ currency: "eur" })]), "2027-02-26", { pairOnSale: false, pairOnSaleFor: (to) => to === "leo@icloud.test" });
    await listed.result;
    expect(listed.sent).toHaveLength(1);
    expect(listed.sent[0]).toMatchObject({ paid: "price", prices: { three: SINGLE.eur + PAIR.eur } });
    const unlisted = run(world([reminder({ currency: "eur" })]), "2027-02-26", { pairOnSale: false, pairOnSaleFor: () => false });
    await unlisted.result;
    expect(unlisted.sent).toHaveLength(1);
    expect(unlisted.sent[0]).toMatchObject({ paid: "price", prices: { three: null } });
  });

  it("the function is asked with the address the e-mail goes to", async () => {
    const ask = vi.fn((_to: string) => false);
    const { sent, result } = run(world([reminder({ currency: "eur" })]), "2027-02-26", { pairOnSale: false, pairOnSaleFor: ask });
    await result;
    expect(sent.length).toBeGreaterThan(0);
    expect(ask.mock.calls).toEqual(sent.map(() => ["leo@icloud.test"]));
  });

  it("left out, the run's own switch decides, as before; and the cron hands both over", async () => {
    const on = run(world([reminder({ currency: "eur" })]), "2027-02-26");
    await on.result;
    expect(on.sent[0]).toMatchObject({ paid: "price", prices: { three: SINGLE.eur + PAIR.eur } });
    const off = run(world([reminder({ currency: "eur" })]), "2027-02-26", { pairOnSale: false });
    await off.result;
    expect(off.sent[0]).toMatchObject({ paid: "price", prices: { three: null } });
    const cron = readFileSync("src/app/api/cron/reminders/route.ts", "utf8");
    expect(cron).toContain("pairOnSale: pairOnSale(),");
    expect(cron).toContain("pairOnSaleFor: (to) => pairOnSaleFor(to),");
  });
});
