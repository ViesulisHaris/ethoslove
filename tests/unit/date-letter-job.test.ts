import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The date letter's job and its cron (PLAN-letter 5.1, J1-J13), against the real store on the fake
 * database (its claims work as the real ones do), with the facts overridden where a test needs them.
 */
type Sent = { to: string; locale: "en" | "es"; slot: number; stopUrl: string; onceKey: string };
const state = vi.hoisted(() => ({ db: null as unknown, adminCalls: 0, resend: true, sent: [] as Sent[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => {
    state.adminCalls += 1;
    return state.db;
  },
}));
vi.mock("@/lib/email/notify", () => ({
  sendDateLetter: async (args: Sent) => {
    state.sent.push(args);
    return true;
  },
}));
vi.mock("@/lib/env", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...real,
    get isConfigured() {
      return { ...real.isConfigured, resend: state.resend };
    },
  };
});

const { sendDateLetters, supabaseLetterStore } = await import("@/lib/lifecycle/date-letter-job");
const { letterSlot, letterWeek } = await import("@/lib/lifecycle/date-letter");
const { forgetLetterProbe } = await import("@/lib/lifecycle/date-letter-store");
const { emailKey } = await import("@/lib/lifecycle/links");
const cron = await import("@/app/api/cron/date-letter/route");
const { FakeDb } = await import("./helpers/fake-db");

type Run = Parameters<typeof sendDateLetters>[0];
type Store = Run["store"];
type Facts = Awaited<ReturnType<Store["facts"]>> extends Map<string, infer F> ? F : never;

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const DAY = 86_400_000;
/** Thursday 11 March 2027, and the days around it. */
const THU = new Date("2027-03-11T09:00:00Z");
const day = (offset: number, hour = 9) => new Date(Date.UTC(2027, 2, 11 + offset, hour));
const MON = day(-3);
const FRI = day(1);
const SAT = day(2);
const SUN = day(3);
const NEXT_THU = day(7);

const letterRow = (over: Record<string, unknown> = {}) => ({
  id: A,
  email: "sam@mail.com",
  locale: "en",
  wording: "Email me one date idea every Thursday. I can stop any time.",
  source_path: "/dates",
  asked_at: "2027-01-01T10:00:00.000Z",
  confirm_sent_at: "2027-01-01T10:00:00.000Z",
  confirmed_at: "2027-01-01T10:05:00.000Z",
  last_week: null,
  held_on: null,
  stopped_at: null,
  ...over,
});

function setup(rows: Record<string, unknown>[], seed: Record<string, Record<string, unknown>[]> = {}, options: ConstructorParameters<typeof FakeDb>[2] = {}) {
  const fake = new FakeDb({ date_letter: rows, ...seed }, THU.getTime(), options);
  return { fake, store: supabaseLetterStore(fake.db as never, true) };
}

function job(store: Store, now: Date, over: Partial<Run> = {}) {
  const mail: Sent[] = [];
  const run = () =>
    sendDateLetters({
      store,
      send: async (args) => {
        mail.push(args as Sent);
        return true;
      },
      stopUrl: async (row) => `https://ethos.test/api/date-letter/stop?t=${row.id}.sig&l=${row.locale}`,
      now,
      inTime: () => true,
      pause: async () => {},
      ...over,
    });
  return { mail, run };
}

const withFacts = (store: Store, facts: (id: string) => Facts): Store => ({ ...store, facts: async (rows) => new Map(rows.map((r) => [r.id, facts(r.id)])) });

describe("the date letter's job", () => {
  it("J1 Monday to Wednesday it only tidies", async () => {
    for (const when of [MON, day(-2), day(-1)]) {
      const { fake, store } = setup([letterRow()]);
      const j = job(store, when);
      const counts = await j.run();
      expect(j.mail).toEqual([]);
      expect(counts.sent).toBe(0);
      expect(fake.calls.filter((c) => c.op === "select")).toEqual([]);
      expect(fake.calls.filter((c) => c.op === "delete")).toHaveLength(2);
    }
  });

  it("J2 on Thursday a confirmed address gets the week's letter, once", async () => {
    const { store } = setup([letterRow()]);
    const first = job(store, THU);
    const counts = await first.run();
    expect(counts).toMatchObject({ sent: 1, week: letterWeek(THU), slot: letterSlot(letterWeek(THU)) });
    expect(first.mail).toHaveLength(1);
    expect(first.mail[0].slot).toBe(letterSlot(letterWeek(THU)));
    for (const when of [new Date(THU.getTime() + 3_600_000), FRI, SAT, SUN]) {
      const again = job(store, when);
      await again.run();
      expect(again.mail, when.toISOString()).toEqual([]);
    }
    const next = job(store, NEXT_THU);
    await next.run();
    expect(next.mail).toHaveLength(1);
    expect(next.mail[0].slot).toBe((letterSlot(letterWeek(THU)) % 52) + 1);
  });

  it("J3 no letter before confirming, none after a stop", async () => {
    const { store } = setup([letterRow({ id: A, confirmed_at: null }), letterRow({ id: B, email: "kim@mail.com", stopped_at: "2027-03-01T10:00:00.000Z" }), letterRow({ id: C, email: "lee@mail.com" })]);
    const due = await store.due(letterWeek(THU), "2027-03-11", 100);
    expect(due.map((r) => r.id)).toEqual([C]);
    const j = job(store, THU);
    await j.run();
    expect(j.mail.map((m) => m.to)).toEqual(["lee@mail.com"]);
  });

  it("J4 two runs at once send one letter", async () => {
    const { fake, store } = setup([letterRow({ id: A }), letterRow({ id: B, email: "kim@mail.com" })]);
    const mail: Sent[] = [];
    const slow = { send: async (args: Sent) => (await new Promise((r) => setTimeout(r, 1)), mail.push(args), true) } as unknown as Partial<Run>;
    await Promise.all([job(store, THU, slow).run(), job(store, THU, slow).run()]);
    expect(mail.map((m) => m.to).sort()).toEqual(["kim@mail.com", "sam@mail.com"]);
    // The claim itself: once for a week.
    fake.tables.date_letter = [letterRow({ id: C, email: "lee@mail.com" })];
    expect(await store.claim(C, 100)).toBe(true);
    expect(await store.claim(C, 100)).toBe(false);
    expect(await store.claim(C, 101)).toBe(true);
  });

  it("J5 a failed send gives the week back and tries again tomorrow", async () => {
    const { fake, store } = setup([letterRow({ last_week: letterWeek(THU) - 1 })]);
    const failing = job(store, THU, { send: async () => false });
    expect(await failing.run()).toMatchObject({ failed: 1, sent: 0 });
    expect(fake.rows("date_letter")[0]).toMatchObject({ last_week: letterWeek(THU) - 1, held_on: "2027-03-11" });
    const later = job(store, new Date(THU.getTime() + 3_600_000));
    await later.run();
    expect(later.mail).toEqual([]);
    const friday = job(store, FRI);
    await friday.run();
    expect(friday.mail).toHaveLength(1);
  });

  it("J6 it waits a day when another e-mail goes today", async () => {
    const { fake, store } = setup([letterRow()]);
    const busy = withFacts(store, () => ({ optedOut: false, other: true }));
    const thu = job(busy, THU);
    expect(await thu.run()).toMatchObject({ held: 1, sent: 0 });
    expect(fake.rows("date_letter")[0]).toMatchObject({ last_week: null, held_on: "2027-03-11" });
    expect(await store.due(letterWeek(THU), "2027-03-11", 100)).toEqual([]);
    const fri = job(withFacts(store, () => ({ optedOut: false, other: false })), FRI);
    expect(await fri.run()).toMatchObject({ sent: 1 });

    // On Friday the letter that would still wait is skipped, and keeps its claim: it never comes on
    // Saturday or Sunday, when its line could name a day already gone (letter-C11).
    const other = setup([letterRow()]);
    const late = job(withFacts(other.store, () => ({ optedOut: false, other: true })), FRI);
    expect(await late.run()).toMatchObject({ skipped: 1, held: 0, sent: 0 });
    expect(other.fake.rows("date_letter")[0].last_week).toBe(letterWeek(FRI));
    expect(late.mail).toEqual([]);
    const weekend = setup([letterRow()]);
    for (const when of [SAT, SUN]) expect((await job(weekend.store, when).run()).sent, when.toISOString()).toBe(0);
    expect(weekend.fake.rows("date_letter")[0].last_week).toBeNull();
  });

  it("J7 the unsubscribe list and test addresses get none", async () => {
    const { fake, store } = setup([letterRow({ id: A }), letterRow({ id: B, email: "test@example.com" })], { email_optouts: [{ email_sha256: await emailKey("sam@mail.com") }] });
    const j = job(store, THU);
    expect(await j.run()).toMatchObject({ skipped: 2, sent: 0 });
    expect(j.mail).toEqual([]);
    expect(fake.rows("date_letter").map((r) => r.last_week)).toEqual([letterWeek(THU), letterWeek(THU)]);
    expect(await store.due(letterWeek(THU), "2027-03-12", 100)).toEqual([]);
  });

  it("J8 stops starting e-mails when time is up", async () => {
    const { fake, store } = setup([letterRow({ id: A }), letterRow({ id: B, email: "kim@mail.com" })]);
    const j = job(store, THU, { inTime: () => false });
    expect(await j.run()).toMatchObject({ deferred: 2, sent: 0 });
    expect(fake.rows("date_letter").map((r) => r.last_week)).toEqual([null, null]);
  });

  it("J9 everyone gets the same idea, in their own language, with their own stop link", async () => {
    const { store } = setup([letterRow({ id: A }), letterRow({ id: B, email: "kim@mail.com", locale: "es" })]);
    const j = job(store, THU);
    await j.run();
    const week = letterWeek(THU);
    expect(j.mail).toHaveLength(2);
    expect(new Set(j.mail.map((m) => m.slot)).size).toBe(1);
    expect(j.mail.map((m) => m.locale).sort()).toEqual(["en", "es"]);
    expect(new Set(j.mail.map((m) => m.stopUrl)).size).toBe(2);
    expect(j.mail.map((m) => m.onceKey).sort()).toEqual([`date-letter/${A}/${week}`, `date-letter/${B}/${week}`]);
  });

  it("J10 confirmed on a Friday, it comes that day; on a Saturday or a Monday, on Thursday", async () => {
    const fri = setup([letterRow({ confirmed_at: FRI.toISOString() })]);
    expect(await job(fri.store, FRI).run()).toMatchObject({ sent: 1 });
    const sat = setup([letterRow({ confirmed_at: SAT.toISOString() })]);
    expect((await job(sat.store, SAT).run()).sent).toBe(0);
    expect((await job(sat.store, NEXT_THU).run()).sent).toBe(1);
    const mon = setup([letterRow({ confirmed_at: day(4).toISOString() })]);
    expect((await job(mon.store, day(4)).run()).sent).toBe(0);
    expect((await job(mon.store, NEXT_THU).run()).sent).toBe(1);
  });

  it("J11 addresses that never confirmed go after thirty days, stopped ones thirty days after the stop", async () => {
    const ago = (days: number) => new Date(THU.getTime() - days * DAY).toISOString();
    const { fake, store } = setup([
      letterRow({ id: A, email: "a@mail.com", confirmed_at: null, asked_at: ago(31) }),
      letterRow({ id: B, email: "b@mail.com", confirmed_at: null, asked_at: ago(29) }),
      letterRow({ id: C, email: "c@mail.com", stopped_at: ago(31) }),
      letterRow({ id: "44444444-4444-4444-8444-444444444444", email: "d@mail.com", stopped_at: ago(29) }),
      letterRow({ id: "55555555-5555-4555-8555-555555555555", email: "e@mail.com", confirmed_at: ago(365), asked_at: ago(365) }),
    ]);
    expect(await store.purge(THU)).toBe(2);
    expect(fake.rows("date_letter").map((r) => r.email)).toEqual(["b@mail.com", "d@mail.com", "e@mail.com"]);
  });

  it("J13 a lookup that fails sends nothing", async () => {
    const broken = setup([letterRow()]);
    broken.fake.failNext("email_optouts", "select");
    const j = job(broken.store, THU);
    await expect(j.run()).rejects.toThrow(/opt-outs/);
    expect(j.mail).toEqual([]);
    expect(broken.fake.rows("date_letter")[0].last_week).toBeNull();

    // An account with a monthly idea, before 0022: no throw.
    const profile = { id: "99999999-9999-4999-8999-999999999999", email: "sam@mail.com" };
    const early = setup([letterRow()], { profiles: [profile] }, { missingTables: ["monthly_ideas"] });
    expect(await job(early.store, THU).run()).toMatchObject({ sent: 1 });

    // With the monthly idea switched off, its rows are never read.
    const off = new FakeDb({ date_letter: [letterRow()], profiles: [profile], monthly_ideas: [{ user_id: profile.id, since: "2027-01-11", handled_for: null, last_sent_on: null, off_at: null }] }, THU.getTime());
    expect(await job(supabaseLetterStore(off.db as never, false), THU).run()).toMatchObject({ sent: 1 });
    expect(off.calls.some((c) => c.table === "monthly_ideas")).toBe(false);
    // Switched on, the same row's monthly date today holds the letter.
    const on = new FakeDb({ date_letter: [letterRow()], profiles: [profile], monthly_ideas: [{ user_id: profile.id, since: "2027-01-11", handled_for: null, last_sent_on: null, off_at: null }] }, THU.getTime());
    expect(await job(supabaseLetterStore(on.db as never, true), THU).run()).toMatchObject({ held: 1, sent: 0 });
  });
});

describe("the date letter's cron", () => {
  const call = (auth = "Bearer cron-secret") => cron.GET(new NextRequest("https://ethos.test/api/cron/date-letter", { headers: auth ? { authorization: auth } : {} }));
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.VIEWER_HASH_SECRET = "date-letter-cron-secret";
    state.adminCalls = 0;
    state.resend = true;
    state.sent = [];
    forgetLetterProbe();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(THU);
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DATE_LETTER;
    delete process.env.CRON_SECRET;
  });

  it("J12 the cron is closed, and does nothing it cannot finish", async () => {
    // Switched off: a bearer gets "off" and nothing is read; no bearer gets 401.
    const fake = new FakeDb({ date_letter: [letterRow()] }, THU.getTime());
    state.db = fake.db;
    expect((await call("")).status).toBe(401);
    expect(await (await call()).json()).toEqual({ ok: true, skipped: "off" });
    expect(state.adminCalls).toBe(0);
    expect(fake.calls).toEqual([]);

    process.env.DATE_LETTER = "on";
    expect((await call("Bearer nope")).status).toBe(401);
    state.db = null;
    expect((await call()).status).toBe(503);
    state.db = fake.db;
    state.resend = false;
    // Without e-mail the list is still tidied (letter-C16): the privacy policy's thirty days hold.
    fake.rows("date_letter").push(letterRow({ id: "66666666-6666-4666-8666-666666666666", email: "old@mail.com", confirmed_at: null, asked_at: new Date(THU.getTime() - 31 * DAY).toISOString() }));
    expect(await (await call()).json()).toEqual({ ok: true, skipped: "email_not_configured", purged: 1 });
    expect(fake.rows("date_letter").map((r) => r.email)).toEqual(["sam@mail.com"]);
    state.resend = true;
    forgetLetterProbe();
    // Before 0027.
    state.db = new FakeDb({}, THU.getTime(), { missingTables: ["date_letter"] }).db;
    expect(await (await call()).json()).toEqual({ ok: true, skipped: "no_table" });
    forgetLetterProbe();
    // The store throwing.
    const broken = new FakeDb({ date_letter: [letterRow()] }, THU.getTime());
    state.db = broken.db;
    broken.failNext("date_letter", "delete");
    expect((await call()).status).toBe(503);
    expect(state.sent).toEqual([]);
    // And working: one letter, with a signed stop link in the row's language.
    const working = new FakeDb({ date_letter: [letterRow({ locale: "es" })] }, THU.getTime());
    state.db = working.db;
    const res = await call();
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sent: 1, totals: { on: 1, pending: 0, stopped: 0 } });
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].stopUrl).toMatch(/\/api\/date-letter\/stop\?t=11111111-1111-4111-8111-111111111111\.[\w-]+&l=es$/);
  });
});
