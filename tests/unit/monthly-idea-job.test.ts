import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IdeaFacts } from "@/lib/lifecycle/monthly-idea";

/**
 * The monthly idea's morning job and its cron (PLAN-monthly 4.1, J1-J8), against a store in memory
 * whose claims work like the real ones, and, for the store itself, the fake database.
 */
const state = vi.hoisted(() => ({ db: null as unknown, calls: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => {
    state.calls += 1;
    return state.db;
  },
}));

const { sendMonthlyIdeas, supabaseIdeaStore } = await import("@/lib/lifecycle/monthly-idea-job");
type Run = Parameters<typeof sendMonthlyIdeas>[0];
type Store = Run["store"];
const cron = await import("@/app/api/cron/monthly-idea/route");
const { FakeDb } = await import("./helpers/fake-db");

const OWNER = "55555555-5555-4555-8555-555555555555";
const at = (ymd: string) => new Date(`${ymd}T08:00:00Z`);
const facts = (over: Partial<IdeaFacts> = {}): IdeaFacts => ({ email: "sam@mail.com", optedOut: false, hasMonthsary: false, reminderDays: [], boxYes: false, customer: false, ownsEverything: false, holdsGift: false, ...over });

type Row = { user_id: string; since: string; template_slug: string | null; locale: "en" | "es"; basis: "notice" | "box" | "terms"; handled_for: string | null; last_sent_on: string | null; price_sent_at: string | null; off_at?: string | null };
const row = (over: Partial<Row> = {}): Row => ({ user_id: OWNER, since: "2026-10-20", template_slug: "bouquet", locale: "en", basis: "notice", handled_for: null, last_sent_on: null, price_sent_at: null, off_at: null, ...over });

function memoryStore(rows: Row[], known: (r: Row) => IdeaFacts = () => facts()) {
  let fetched = 0;
  const store: Store = {
    async due(window) {
      const found = rows.filter(
        (r) =>
          !r.off_at &&
          window.days.includes(Number(r.since.slice(8, 10))) &&
          r.since >= window.sinceFrom &&
          r.since <= window.sinceTo &&
          (r.handled_for === null || r.handled_for < window.handledBefore),
      );
      fetched = found.length;
      return found;
    },
    async facts(batch) {
      return new Map(batch.map((r) => [r.user_id, known(r as Row)]));
    },
    async claim(id, date) {
      const r = rows.find((x) => x.user_id === id)!;
      if (r.off_at || (r.handled_for !== null && r.handled_for >= date)) return false;
      r.handled_for = date;
      return true;
    },
    async release(id, previous) {
      rows.find((x) => x.user_id === id)!.handled_for = previous;
    },
    async sent(id, on, withPrice, when) {
      const r = rows.find((x) => x.user_id === id)!;
      r.last_sent_on = on;
      if (withPrice) r.price_sent_at = when.toISOString();
    },
  };
  return { store, rows, fetched: () => fetched };
}

function job(store: Store, now: Date, over: Partial<Run> = {}) {
  const mail: Parameters<Run["send"]>[0][] = [];
  return {
    mail,
    run: () =>
      sendMonthlyIdeas({
        store,
        mode: "all",
        send: async (args) => (mail.push(args), true),
        links: async (r, slug, withPrice) => ({
          stopUrl: `https://ethos.test/stop/${r.user_id}`,
          priceUrl: withPrice ? `https://ethos.test/api/offer/open?t=p&to=${slug}` : null,
          priceMoreUrl: withPrice ? "https://ethos.test/api/offer/open?t=p" : null,
        }),
        priceSpent: async () => false,
        now,
        inTime: () => true,
        pause: async () => {},
        ...over,
      }),
  };
}

describe("the morning job", () => {
  it("J1 sends a due row once, and not on the two catch-up days after", async () => {
    const { store, rows } = memoryStore([row()]);
    const first = job(store, at("2026-11-20"));
    expect(await first.run()).toEqual({ sent: 1, skipped: 0, failed: 0, deferred: 0 });
    expect(first.mail[0]).toMatchObject({ to: "sam@mail.com", locale: "en", onceKey: `monthly-idea/${OWNER}/2026-11-20`, stopUrl: `https://ethos.test/stop/${OWNER}` });
    expect(rows[0]).toMatchObject({ handled_for: "2026-11-20", last_sent_on: "2026-11-20" });
    for (const d of ["2026-11-20", "2026-11-21", "2026-11-22"]) {
      const again = job(store, at(d));
      expect((await again.run()).sent).toBe(0);
      expect(again.mail).toHaveLength(0);
    }
  });

  it("J2 a failed send gives the month back, and the next run sends", async () => {
    const { store, rows } = memoryStore([row()]);
    const failing = job(store, at("2026-11-20"), { send: async () => false });
    expect(await failing.run()).toEqual({ sent: 0, skipped: 0, failed: 1, deferred: 0 });
    expect(rows[0].handled_for).toBeNull();
    expect(rows[0].last_sent_on).toBeNull();
    const next = job(store, at("2026-11-21"));
    expect((await next.run()).sent).toBe(1);
    expect(next.mail[0].onceKey).toBe(`monthly-idea/${OWNER}/2026-11-20`);
  });

  it("J3 a skipped month is not retried", async () => {
    const m = memoryStore([row()], () => facts({ hasMonthsary: true }));
    const first = job(m.store, at("2026-11-20"));
    expect(await first.run()).toEqual({ sent: 0, skipped: 1, failed: 0, deferred: 0 });
    expect(m.rows[0].handled_for).toBe("2026-11-20");
    await job(m.store, at("2026-11-21")).run();
    expect(m.fetched()).toBe(0);
  });

  it("J3b a month near a reminder e-mail is skipped, not moved to later", async () => {
    // A birthday on 1 December: its e-mails go from 22 November. 20 November is within 14 days.
    const m = memoryStore([row()], () => facts({ reminderDays: [{ month: 12, day: 1 }] }));
    expect(await job(m.store, at("2026-11-20")).run()).toEqual({ sent: 0, skipped: 1, failed: 0, deferred: 0 });
    for (const d of ["2026-11-21", "2026-11-22", "2026-11-30"]) expect((await job(m.store, at(d)).run()).sent).toBe(0);
    // The month after is its own month again: the last of those e-mails went on 30 November, 20 days before.
    expect((await job(m.store, at("2026-12-20")).run()).sent).toBe(1);
  });

  it("J4 stops starting emails when time is up", async () => {
    const { store, rows } = memoryStore([row(), row({ user_id: "66666666-6666-4666-8666-666666666666" })]);
    const late = job(store, at("2026-11-20"), { inTime: () => false });
    expect(await late.run()).toEqual({ sent: 0, skipped: 0, failed: 0, deferred: 2 });
    expect(rows.every((r) => r.handled_for === null)).toBe(true);
  });

  it("J5 the first email carries the price link, and marks it", async () => {
    const { store, rows } = memoryStore([row({ since: "2026-11-20", template_slug: "bouquet" })]);
    const run = job(store, at("2026-12-20"));
    await run.run();
    expect(run.mail[0]).toMatchObject({ ideaUrl: "https://ethos.test/api/offer/open?t=p&to=snow-globe", moreUrl: "https://ethos.test/api/offer/open?t=p", priceUntil: "27 December", templateSlug: "snow-globe", season: "christmas" });
    expect(rows[0].price_sent_at).toEqual(expect.any(String));

    const spent = memoryStore([row({ since: "2026-11-20" })]);
    const noPrice = job(spent.store, at("2026-12-20"), { priceSpent: async () => true });
    await noPrice.run();
    expect(noPrice.mail[0].priceUntil).toBeUndefined();
    expect(spent.rows[0].price_sent_at).toBeNull();

    const unsigned = memoryStore([row({ since: "2026-11-20" })]);
    const noLink = job(unsigned.store, at("2026-12-20"), { links: async (r) => ({ stopUrl: `https://ethos.test/stop/${r.user_id}`, priceUrl: null, priceMoreUrl: null }) });
    await noLink.run();
    expect(noLink.mail[0].priceUntil).toBeUndefined();
    expect(noLink.mail[0].ideaUrl).toMatch(/^https?:\/\/[^/]+\/create\/snow-globe\?ref=email-monthly$/);
    expect(unsigned.rows[0].price_sent_at).toBeNull();

    const holding = memoryStore([row({ since: "2026-11-20" })], () => facts({ holdsGift: true }));
    const ready = job(holding.store, at("2026-12-20"));
    await ready.run();
    expect(ready.mail[0].priceUntil).toBeUndefined();
  });

  it("J6 later emails are the same without the price, and say it in Spanish for a Spanish account", async () => {
    const { store } = memoryStore([row({ last_sent_on: "2026-10-20", since: "2026-09-20", locale: "es" })]);
    const run = job(store, at("2026-11-20"));
    await run.run();
    expect(run.mail[0].priceUntil).toBeUndefined();
    expect(run.mail[0].ideaUrl).toMatch(/\/es\/create\/jar-of-reasons\?ref=email-monthly$/);
    expect(run.mail[0].moreUrl).toMatch(/\/es\/templates\?ref=email-monthly$/);
    expect(run.mail[0].locale).toBe("es");
  });

  it("J7 picks the season by the month's date, and steps round their last template", async () => {
    const { store } = memoryStore([row({ since: "2026-10-24", template_slug: "jar-of-reasons", last_sent_on: "2026-10-01" })]);
    const run = job(store, at("2026-11-25"));
    await run.run();
    expect(run.mail[0]).toMatchObject({ season: "november", templateSlug: "fall-for-you", onceKey: `monthly-idea/${OWNER}/2026-11-24` });
  });
});

describe("the store, on the database", () => {
  it("finds due rows only, claims once, and reads every fact in one go", async () => {
    const db = new FakeDb({
      monthly_ideas: [
        { ...row(), since_day: 20, off_at: null },
        { ...row({ user_id: "66666666-6666-4666-8666-666666666666", since: "2026-11-19" }), since_day: 19, off_at: null },
        { ...row({ user_id: "77777777-7777-4777-8777-777777777777" }), since_day: 20, off_at: "2026-11-01T00:00:00Z" },
      ],
      profiles: [{ id: OWNER, email: "sam@mail.com" }],
      purchases: [{ id: "p1", user_id: OWNER, status: "paid", store: null }],
      reminders: [{ id: "r1", user_id: OWNER, month: 12, day: 1 }],
      offer_emails: [],
      monthsaries: [],
      template_unlocks: [],
      email_optouts: [],
      gift_keeps: [],
    });
    const store = supabaseIdeaStore(db.db as never);
    const { ideaWindow } = await import("@/lib/lifecycle/monthly-idea");
    const due = await store.due(ideaWindow(at("2026-11-20")), 100);
    expect(due.map((r) => r.user_id)).toEqual([OWNER]);
    const known = await store.facts(due);
    expect(known.get(OWNER)).toEqual({ email: "sam@mail.com", optedOut: false, hasMonthsary: false, reminderDays: [{ month: 12, day: 1 }], boxYes: false, customer: true, ownsEverything: false, holdsGift: false });
    expect(await store.claim(OWNER, "2026-11-20")).toBe(true);
    expect(await store.claim(OWNER, "2026-11-20")).toBe(false);
    db.failNext("email_optouts", "select", "down");
    await expect(store.facts(due)).rejects.toThrow(/opt-outs/);
  });
});

describe("the cron", () => {
  const get = (auth?: string) => cron.GET(new NextRequest("https://ethos.test/api/cron/monthly-idea", { headers: auth ? { authorization: auth } : {} }));
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    state.calls = 0;
    state.db = null;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("J8 is closed, off by default, can be paused, and needs its database", async () => {
    expect((await get()).status).toBe(401);
    expect((await get("Bearer wrong")).status).toBe(401);
    vi.stubEnv("MONTHLY_IDEA_EMAILS", "");
    const off = await get("Bearer cron-secret");
    expect(await off.json()).toEqual({ ok: true, skipped: "off" });
    expect(state.calls).toBe(0);
    vi.stubEnv("MONTHLY_IDEA_EMAILS", "all");
    vi.stubEnv("MONTHLY_IDEA_PAUSE_UNTIL", "2999-01-01");
    expect(await (await get("Bearer cron-secret")).json()).toEqual({ ok: true, skipped: "paused" });
    expect(state.calls).toBe(0);
    vi.stubEnv("MONTHLY_IDEA_PAUSE_UNTIL", "");
    expect((await get("Bearer cron-secret")).status).toBe(503);
  });
});
