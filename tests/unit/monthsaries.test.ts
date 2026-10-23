import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { signToken } from "@/lib/lifecycle/links";
import {
  answerYes,
  daysLandingOn,
  isValidSince,
  monthsaryIn,
  monthsaryOn,
  monthsaryWork,
  nextMonthsary,
  parseYmd,
  type MonthsaryState,
} from "@/lib/lifecycle/monthsaries";
import { monthsaryInput } from "@/lib/lifecycle/reminder-input";
import { FakeDb } from "./helpers/fake-db";

const at = (iso: string) => new Date(`${iso}T07:00:00Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const since = (iso: string) => parseYmd(iso)!;

describe("when a monthsary falls", () => {
  it("is the same day each month, or the month's last day when it is shorter", () => {
    const s = since("2026-01-31");
    expect(ymd(monthsaryIn(s, 2026, 2))).toBe("2026-02-28");
    expect(ymd(monthsaryIn(s, 2028, 2))).toBe("2028-02-29");
    expect(ymd(monthsaryIn(s, 2026, 4))).toBe("2026-04-30");
    expect(ymd(monthsaryIn(s, 2026, 5))).toBe("2026-05-31");
    expect(ymd(monthsaryIn(since("2026-03-30"), 2027, 2))).toBe("2027-02-28");
  });

  it("knows the months each one marks, and that the day they met isn't one", () => {
    const s = since("2026-01-31");
    expect(monthsaryOn(s, at("2026-01-31"))).toBeNull();
    expect(monthsaryOn(s, at("2026-02-28"))).toBe(1);
    expect(monthsaryOn(s, at("2026-02-27"))).toBeNull();
    expect(monthsaryOn(s, at("2026-03-31"))).toBe(2);
    expect(monthsaryOn(s, at("2026-04-30"))).toBe(3);
    expect(monthsaryOn(s, at("2026-04-29"))).toBeNull();
    expect(monthsaryOn(s, at("2027-01-31"))).toBe(12);
    // Before they met, nothing.
    expect(monthsaryOn(since("2026-05-10"), at("2026-04-10"))).toBeNull();
  });

  it("handles a leap day: 29 February is the 28th in other years, and the 29th in the next leap year", () => {
    const s = since("2024-02-29");
    expect(monthsaryOn(s, at("2024-03-29"))).toBe(1);
    expect(monthsaryOn(s, at("2025-02-28"))).toBe(12);
    expect(monthsaryOn(s, at("2028-02-28"))).toBeNull();
    expect(monthsaryOn(s, at("2028-02-29"))).toBe(48);
  });

  it("finds the next one, today included", () => {
    expect(nextMonthsary(since("2026-03-03"), at("2026-10-22"))).toEqual({ date: new Date("2026-11-03T00:00:00Z"), months: 8 });
    expect(nextMonthsary(since("2026-03-22"), at("2026-10-22"))).toEqual({ date: new Date("2026-10-22T00:00:00Z"), months: 7 });
    // Met today: the first is a month away.
    expect(nextMonthsary(since("2026-10-22"), at("2026-10-22"))).toEqual({ date: new Date("2026-11-22T00:00:00Z"), months: 1 });
    expect(nextMonthsary(since("2026-01-31"), at("2026-02-01"))).toEqual({ date: new Date("2026-02-28T00:00:00Z"), months: 1 });
  });

  it("asks the database for every day that lands on a short month's last", () => {
    expect(daysLandingOn(at("2027-02-28"))).toEqual([28, 29, 30, 31]);
    expect(daysLandingOn(at("2028-02-28"))).toEqual([28]);
    expect(daysLandingOn(at("2028-02-29"))).toEqual([29, 30, 31]);
    expect(daysLandingOn(at("2026-04-30"))).toEqual([30, 31]);
    expect(daysLandingOn(at("2026-05-31"))).toEqual([31]);
    expect(daysLandingOn(at("2026-05-15"))).toEqual([15]);
  });

  it("takes only a real day that has come, from 1950 on", () => {
    const today = at("2026-10-22");
    expect(isValidSince(parseYmd("2026-10-22"), today)).toBe(true);
    expect(isValidSince(parseYmd("2026-10-23"), today)).toBe(false);
    expect(isValidSince(parseYmd("1949-12-31"), today)).toBe(false);
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("2025-02-29")).toBeNull();
    expect(parseYmd("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseYmd("26-1-1")).toBeNull();
    expect(monthsaryInput.safeParse({ partnerName: "  Ana  ", since: "2026-03-03" }).data).toEqual({ partnerName: "Ana", since: "2026-03-03", locale: "en" });
    expect(monthsaryInput.safeParse({ partnerName: "", since: "2026-03-03" }).success).toBe(false);
    expect(monthsaryInput.safeParse({ partnerName: "x".repeat(61), since: "2026-03-03" }).success).toBe(false);
  });
});

describe("the morning job's rule", () => {
  const base: MonthsaryState = { since: "2026-03-03", checkinFor: null, confirmedFor: null, remindedFor: null };

  it("checks in the day before, once", () => {
    expect(monthsaryWork(base, at("2026-11-02"))).toEqual({ checkIn: { date: "2026-11-03", months: 8 } });
    expect(monthsaryWork({ ...base, checkinFor: "2026-11-03" }, at("2026-11-02"))).toEqual({});
    // Not the day before: nothing.
    expect(monthsaryWork(base, at("2026-11-01"))).toEqual({});
  });

  it("never checks in late: on the day itself, 'tomorrow' would be wrong", () => {
    expect(monthsaryWork(base, at("2026-11-03"))).toEqual({});
  });

  it("reminds on the day only after a yes to that very day, and only once", () => {
    expect(monthsaryWork({ ...base, checkinFor: "2026-11-03", confirmedFor: "2026-11-03" }, at("2026-11-03"))).toEqual({ remind: { date: "2026-11-03", months: 8 } });
    expect(monthsaryWork({ ...base, checkinFor: "2026-11-03", confirmedFor: "2026-11-03", remindedFor: "2026-11-03" }, at("2026-11-03"))).toEqual({});
    // No answer: nothing more that month.
    expect(monthsaryWork({ ...base, checkinFor: "2026-11-03" }, at("2026-11-03"))).toEqual({});
    // A yes to last month's doesn't carry over.
    expect(monthsaryWork({ ...base, checkinFor: "2026-12-03", confirmedFor: "2026-11-03", remindedFor: "2026-11-03" }, at("2026-12-03"))).toEqual({});
  });

  it("checks in for a 31st on the 29th of a 30-day month, and on 27 February", () => {
    const s: MonthsaryState = { ...base, since: "2026-01-31" };
    expect(monthsaryWork(s, at("2026-04-29"))).toEqual({ checkIn: { date: "2026-04-30", months: 3 } });
    expect(monthsaryWork(s, at("2027-02-27"))).toEqual({ checkIn: { date: "2027-02-28", months: 13 } });
    expect(monthsaryWork(s, at("2028-02-28"))).toEqual({ checkIn: { date: "2028-02-29", months: 25 } });
  });

  it("knows what a yes means by when it comes", () => {
    expect(answerYes("2026-11-03", at("2026-11-02"))).toBe("remind_tomorrow");
    expect(answerYes("2026-11-03", at("2026-11-03"))).toBe("today");
    expect(answerYes("2026-11-03", at("2026-11-04"))).toBe("passed");
  });
});

// --- The job, the email links and the API ---------------------------------------------------

const state = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string; email: string } | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
  },
}));

const { sendMonthsaries } = await import("@/lib/lifecycle/monthsary-job");
type Store = Parameters<typeof sendMonthsaries>[0]["store"];
const yesRoute = await import("@/app/api/monthsaries/yes/route");
const stopRoute = await import("@/app/api/monthsaries/stop/route");
const api = await import("@/app/api/monthsaries/route");

const ID = "44444444-4444-4444-8444-444444444444";
const OWNER = "55555555-5555-4555-8555-555555555555";
const SECRET = "monthsary-test-secret";

/** The table as the job sees it, with claims that work like the real ones (a row once per day). */
function memoryStore(rows: Record<string, unknown>[]) {
  const sent: string[] = [];
  const store: Store = {
    async landingOn(days) {
      return rows.filter((r) => days.includes(Number(String(r.since).slice(8, 10)))) as never;
    },
    async claim(id, kind, date) {
      const row = rows.find((r) => r.id === id)!;
      const col = kind === "checkin" ? "checkin_for" : "reminded_for";
      if (row[col] === date) return false;
      row[col] = date;
      return true;
    },
    async release(id, kind, previous) {
      rows.find((r) => r.id === id)![kind === "checkin" ? "checkin_for" : "reminded_for"] = previous;
    },
    async emailOf() {
      return "buyer@example.com";
    },
  };
  return { store, sent, rows };
}

function job(store: Store, now: Date, results: { checkIn?: boolean; remind?: boolean } = {}) {
  const mail: { kind: string; args: Record<string, unknown> }[] = [];
  return {
    mail,
    run: () =>
      sendMonthsaries({
        store,
        checkIn: async (args) => (mail.push({ kind: "checkin", args }), results.checkIn ?? true),
        remind: async (args) => (mail.push({ kind: "remind", args }), results.remind ?? true),
        links: async (row, date) => ({ yesUrl: `https://ethos.test/yes/${row.id}/${date}`, stopUrl: `https://ethos.test/stop/${row.id}` }),
        now,
        inTime: () => true,
        pause: async () => {},
      }),
  };
}

describe("the morning job", () => {
  const row = (over: Record<string, unknown> = {}) => ({ id: ID, user_id: OWNER, partner_name: "Ana", since: "2026-03-03", locale: "en", checkin_for: null, confirmed_for: null, reminded_for: null, ...over });

  it("sends the check-in the day before, once, with the day and the two links, and nothing about it to the partner", async () => {
    const { store, rows } = memoryStore([row()]);
    const first = job(store, at("2026-11-02"));
    expect(await first.run()).toEqual({ checkIns: 1, reminders: 0, failed: 0, deferred: 0 });
    expect(first.mail).toEqual([{ kind: "checkin", args: { to: "buyer@example.com", locale: "en", partnerName: "Ana", date: "3 November", yesUrl: `https://ethos.test/yes/${ID}/2026-11-03`, stopUrl: `https://ethos.test/stop/${ID}` } }]);
    expect(rows[0].checkin_for).toBe("2026-11-03");
    // Run twice the same morning: still one email.
    const again = job(store, at("2026-11-02"));
    expect((await again.run()).checkIns).toBe(0);
  });

  it("yes: the reminder on the day, with the months it marks", async () => {
    const { store, rows } = memoryStore([row({ checkin_for: "2026-11-03", confirmed_for: "2026-11-03" })]);
    const day = job(store, at("2026-11-03"));
    expect(await day.run()).toEqual({ checkIns: 0, reminders: 1, failed: 0, deferred: 0 });
    expect(day.mail[0]).toEqual({ kind: "remind", args: { to: "buyer@example.com", locale: "en", partnerName: "Ana", months: 8, stopUrl: `https://ethos.test/stop/${ID}` } });
    expect(rows[0].reminded_for).toBe("2026-11-03");
  });

  it("no answer: nothing on the day, and the next month asks again", async () => {
    const { store } = memoryStore([row({ checkin_for: "2026-11-03" })]);
    const day = job(store, at("2026-11-03"));
    expect(await day.run()).toEqual({ checkIns: 0, reminders: 0, failed: 0, deferred: 0 });
    const nextMonth = job(store, at("2026-12-02"));
    expect((await nextMonth.run()).checkIns).toBe(1);
    expect(nextMonth.mail[0].args.date).toBe("3 December");
  });

  it("a failed email gives its claim back for the next run", async () => {
    const { store, rows } = memoryStore([row()]);
    const failing = job(store, at("2026-11-02"), { checkIn: false });
    expect(await failing.run()).toEqual({ checkIns: 0, reminders: 0, failed: 1, deferred: 0 });
    expect(rows[0].checkin_for).toBeNull();
  });

  it("asks in Spanish for a Spanish buyer, and finds a 31st on the last of a short month", async () => {
    const { store } = memoryStore([row({ since: "2026-01-31", locale: "es" })]);
    const run = job(store, at("2026-04-29"));
    await run.run();
    expect(run.mail[0].args).toMatchObject({ locale: "es", date: "30 de abril" });
  });
});

async function linkPage(route: typeof yesRoute | typeof stopRoute, path: string, method: "GET" | "POST", token: string, locale = "en") {
  const res = await route[method](new NextRequest(`https://ethos.test/api/monthsaries/${path}?t=${encodeURIComponent(token)}&l=${locale}`, { method }));
  // The page escapes what it prints; compare what a reader sees.
  return { status: res.status, text: (await res.text()).replace(/&#39;/g, "'").replace(/&amp;/g, "&") };
}

describe("answering the check-in from the email", () => {
  let fake: FakeDb;
  const NOV2 = Date.parse("2026-11-02T10:00:00Z");
  beforeAll(() => {
    process.env.VIEWER_HASH_SECRET = SECRET;
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOV2);
    fake = new FakeDb({
      monthsaries: [
        { id: ID, user_id: OWNER, partner_name: "Ana", since: "2026-03-03", locale: "en", checkin_for: "2026-11-03", confirmed_for: null, reminded_for: null },
        { id: "66666666-6666-4666-8666-666666666666", user_id: "someone-else", partner_name: "Leo", since: "2026-01-10", locale: "en", checkin_for: null, confirmed_for: null, reminded_for: null },
      ],
    });
    state.db = fake.db;
  });
  afterEach(() => vi.useRealTimers());

  it("yes, the day before: a page that asks first (a mail scanner's visit does nothing), then confirms", async () => {
    const token = await signToken("monthsary-yes", `${OWNER}:2026-11-03`, SECRET);
    const asked = await linkPage(yesRoute, "yes", "GET", token);
    expect(asked.status).toBe(200);
    expect(asked.text).toContain("Confirm your yes");
    expect(asked.text).toContain('method="post"');
    expect(fake.rows("monthsaries")[0].confirmed_for).toBeNull();
    const done = await linkPage(yesRoute, "yes", "POST", token);
    expect(done.text).toContain("Tomorrow morning: one email, with a small idea for Ana.");
    expect(fake.rows("monthsaries")[0].confirmed_for).toBe("2026-11-03");
  });

  it("yes on the day itself: the small idea, right there, instead of an email that has had its morning", async () => {
    vi.setSystemTime(Date.parse("2026-11-03T15:00:00Z"));
    const token = await signToken("monthsary-yes", `${OWNER}:2026-11-03`, SECRET);
    const done = await linkPage(yesRoute, "yes", "POST", token);
    expect(done.text).toContain("Here's a small idea.");
    expect(done.text).toMatch(/\/create\/[a-z-]+\?ref=email-monthsary/);
    expect(fake.rows("monthsaries")[0]).toMatchObject({ confirmed_for: "2026-11-03", reminded_for: "2026-11-03" });
  });

  it("a yes that comes too late changes nothing", async () => {
    vi.setSystemTime(Date.parse("2026-11-05T09:00:00Z"));
    const token = await signToken("monthsary-yes", `${OWNER}:2026-11-03`, SECRET);
    expect((await linkPage(yesRoute, "yes", "POST", token)).text).toContain("That day has passed.");
    expect(fake.rows("monthsaries")[0].confirmed_for).toBeNull();
  });

  it("an old email's yes can't confirm a later month, and a forged one confirms nothing", async () => {
    const old = await signToken("monthsary-yes", `${OWNER}:2026-10-03`, SECRET);
    // An earlier question says so, and does nothing.
    expect((await linkPage(yesRoute, "yes", "POST", old)).text).toContain("That was an earlier question.");
    const forged = `${OWNER}:2026-11-03.${"A".repeat(43)}`;
    expect((await linkPage(yesRoute, "yes", "POST", forged)).status).toBe(404);
    // A stop token is not a yes token.
    expect((await linkPage(yesRoute, "yes", "POST", await signToken("monthsary-stop", OWNER, SECRET))).status).toBe(404);
    expect(fake.rows("monthsaries")[0].confirmed_for).toBeNull();
  });

  it("stop: asks first, then removes every monthsary of that account, and only that account's", async () => {
    const token = await signToken("monthsary-stop", OWNER, SECRET);
    const asked = await linkPage(stopRoute, "stop", "GET", token);
    expect(asked.text).toContain("Stop the monthly emails?");
    expect(fake.rows("monthsaries")).toHaveLength(2);
    const done = await linkPage(stopRoute, "stop", "POST", token);
    expect(done.text).toContain("You won't get these again.");
    expect(fake.rows("monthsaries").map((r) => r.user_id)).toEqual(["someone-else"]);
    // Once stopped, the same link says so again, and a yes from before says they're stopped, and does nothing.
    expect((await linkPage(stopRoute, "stop", "GET", token)).text).toContain("Stopped.");
    const yes = await linkPage(yesRoute, "yes", "POST", await signToken("monthsary-yes", `${OWNER}:2026-11-03`, SECRET));
    expect(yes.text).toContain("These emails are stopped.");
    expect(fake.rows("monthsaries").map((r) => r.user_id)).toEqual(["someone-else"]);
  });

  it("an older email's stop link still stops a monthsary turned on again since", async () => {
    const token = await signToken("monthsary-stop", OWNER, SECRET);
    await linkPage(stopRoute, "stop", "POST", token);
    // Turned on again: a new row, with a new id.
    fake.rows("monthsaries").push({ id: "77777777-7777-4777-8777-777777777777", user_id: OWNER, partner_name: "Ana", since: "2026-04-04", locale: "en", checkin_for: null, confirmed_for: null, reminded_for: null });
    expect((await linkPage(stopRoute, "stop", "GET", token)).text).toContain("Stop the monthly emails?");
    expect((await linkPage(stopRoute, "stop", "POST", token)).text).toContain("You won't get these again.");
    expect(fake.rows("monthsaries").map((r) => r.user_id)).toEqual(["someone-else"]);
  });

  it("speaks the buyer's language", async () => {
    fake.rows("monthsaries")[0].locale = "es";
    const token = await signToken("monthsary-yes", `${OWNER}:2026-11-03`, SECRET);
    expect((await linkPage(yesRoute, "yes", "GET", token, "en")).text).toContain("Confirma tu sí");
  });
});

describe("POST /api/monthsaries", () => {
  let fake: FakeDb;
  const post = (body: unknown) => api.POST(new NextRequest("https://ethos.test/api/monthsaries", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-10-22T12:00:00Z"));
    fake = new FakeDb({ monthsaries: [] });
    state.db = fake.db;
    state.user = { id: OWNER, email: "buyer@example.com" };
  });
  afterEach(() => vi.useRealTimers());

  it("needs a sign-in, a real day that has come, and a name", async () => {
    state.user = null;
    expect((await post({ partnerName: "Ana", since: "2026-03-03" })).status).toBe(401);
    state.user = { id: OWNER, email: "buyer@example.com" };
    expect((await post({ partnerName: "Ana", since: "2026-10-23" })).status).toBe(400);
    expect((await post({ partnerName: "Ana", since: "2026-02-30" })).status).toBe(400);
    expect((await post({ partnerName: "", since: "2026-03-03" })).status).toBe(400);
    expect(fake.rows("monthsaries")).toHaveLength(0);
  });

  it("keeps one per account: saving again replaces it and starts its months afresh", async () => {
    expect((await post({ partnerName: "Ana", since: "2026-03-03", locale: "es" })).status).toBe(201);
    fake.rows("monthsaries")[0].checkin_for = "2026-11-03";
    // The same again: nothing changes (a double tap).
    expect((await post({ partnerName: "Ana", since: "2026-03-03", locale: "es" })).status).toBe(200);
    expect(fake.rows("monthsaries")[0].checkin_for).toBe("2026-11-03");
    expect((await post({ partnerName: "Ana", since: "2026-03-04" })).status).toBe(200);
    expect(fake.rows("monthsaries")).toHaveLength(1);
    expect(fake.rows("monthsaries")[0]).toMatchObject({ user_id: OWNER, partner_name: "Ana", since: "2026-03-04", locale: "en", checkin_for: null });
  });

  it("only ever removes the signed-in person's own", async () => {
    fake.tables.monthsaries = [{ id: ID, user_id: "someone-else", partner_name: "Leo", since: "2026-01-10", locale: "en" }];
    const res = await api.DELETE(new NextRequest(`https://ethos.test/api/monthsaries?id=${ID}`, { method: "DELETE" }));
    // Nothing of theirs was there to stop, and the answer says so.
    expect(res.status).toBe(404);
    expect(fake.rows("monthsaries")).toHaveLength(1);
    fake.rows("monthsaries")[0].user_id = OWNER;
    expect((await api.DELETE(new NextRequest(`https://ethos.test/api/monthsaries?id=${ID}`, { method: "DELETE" }))).status).toBe(200);
    expect(fake.rows("monthsaries")).toHaveLength(0);
  });
});
