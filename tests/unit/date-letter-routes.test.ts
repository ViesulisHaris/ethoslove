import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { emailKey, signToken, verifyToken } from "@/lib/lifecycle/links";
import { FakeDb } from "./helpers/fake-db";

/**
 * The date letter's routes (PLAN-letter 5.1, R1-R15): the box's GET and POST, the confirming link and
 * the stop link, on a fake database. DATE_LETTER is set per test.
 */
type Mail = { to: string; locale: "en" | "es"; confirmUrl: string; stopUrl: string };
const state = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string; email: string } | null, spent: new Map<string, number>(), mails: [] as Mail[], sendOk: true }));
vi.mock("server-only", () => ({}));
// Counts each key as the real limiter would, and refuses past its own limit.
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async (key: string, { limit }: { limit: number }) => {
    state.spent.set(key, (state.spent.get(key) ?? 0) + 1);
    return state.spent.get(key)! <= limit;
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/email/notify", () => ({
  sendLetterConfirm: async (mail: Mail) => {
    state.mails.push(mail);
    return state.sendOk;
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
  },
}));

const api = await import("@/app/api/date-letter/route");
const confirmRoute = await import("@/app/api/date-letter/confirm/route");
const stopRoute = await import("@/app/api/date-letter/stop/route");
const { forgetLetterProbe, letterTableThere } = await import("@/lib/lifecycle/date-letter-store");

const SECRET = "date-letter-test-secret";
const ROW = "77777777-7777-4777-8777-777777777777";
const HOUR = 3_600_000;
const NOW = Date.parse("2027-03-11T09:00:00.000Z");

let ip = 0;
const post = (body: unknown, raw?: string, from = `10.0.0.${++ip}`) =>
  api.POST(new NextRequest("https://ethos.test/api/date-letter", { method: "POST", body: raw ?? JSON.stringify(body), headers: { "content-type": "application/json", "x-real-ip": from } }));
async function link(route: typeof confirmRoute | typeof stopRoute, kind: "confirm" | "stop", method: "GET" | "POST", token: string, opts: { locale?: string; from?: string; oneClick?: boolean } = {}) {
  const init: ConstructorParameters<typeof NextRequest>[1] = { method, headers: { "x-real-ip": opts.from ?? "10.9.9.9", ...(opts.oneClick ? { "content-type": "application/x-www-form-urlencoded" } : {}) } };
  if (opts.oneClick) init.body = "List-Unsubscribe=One-Click";
  const res = await route[method](new NextRequest(`https://ethos.test/api/date-letter/${kind}?t=${encodeURIComponent(token)}&l=${opts.locale ?? "en"}`, init));
  const html = await res.text();
  return { status: res.status, html, text: html.replace(/&#39;/g, "'").replace(/&amp;/g, "&") };
}
const letterRow = (over: Record<string, unknown> = {}) => ({
  id: ROW,
  email: "sam@mail.com",
  locale: "en",
  wording: "Email me one date idea every Thursday. I can stop any time.",
  source_path: "/dates",
  asked_at: new Date(NOW - 2 * HOUR).toISOString(),
  confirm_sent_at: new Date(NOW - 2 * HOUR).toISOString(),
  confirmed_at: null,
  last_week: null,
  held_on: null,
  stopped_at: null,
  ...over,
});
const rows = () => fake.rows("date_letter");

let fake: FakeDb;
beforeAll(() => {
  process.env.VIEWER_HASH_SECRET = SECRET;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fake = new FakeDb({}, NOW);
  state.db = fake.db;
  state.user = null;
  state.spent = new Map();
  state.mails = [];
  state.sendOk = true;
  forgetLetterProbe();
  process.env.DATE_LETTER = "on";
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.DATE_LETTER;
});

describe("the date letter's routes", () => {
  it("R1 switched off, nothing answers and nothing is read", async () => {
    delete process.env.DATE_LETTER;
    fake = new FakeDb({ date_letter: [letterRow()] }, NOW);
    state.db = fake.db;
    const token = await signToken("date-letter-confirm", ROW, SECRET);
    const stop = await signToken("date-letter-stop", ROW, SECRET);
    expect((await api.GET()).status).toBe(404);
    expect((await post({ email: "sam@mail.com" })).status).toBe(404);
    for (const method of ["GET", "POST"] as const) {
      expect((await link(confirmRoute, "confirm", method, token)).status).toBe(404);
      expect((await link(stopRoute, "stop", method, stop)).status).toBe(404);
    }
    expect(fake.calls).toEqual([]);
    expect(state.spent.size).toBe(0);
    expect(state.mails).toEqual([]);
  });

  it("R2 before the migration the box is told there is no list", async () => {
    fake = new FakeDb({}, NOW, { missingTables: ["date_letter"] });
    state.db = fake.db;
    expect(await (await api.GET()).json()).toEqual({ available: false, email: null, state: "none" });
    const res = await post({ email: "sam@mail.com" });
    expect(res.status).toBe(503);
    expect(state.mails).toEqual([]);
  });

  it("R3 an address asked for is kept pending, with the server's own sentence", async () => {
    const res = await post({ email: " Sam@Mail.com ", locale: "es", path: "/es/dates" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, state: "asked" });
    expect(rows()).toHaveLength(1);
    const [row] = rows();
    expect(row).toMatchObject({ email: "sam@mail.com", locale: "es", wording: es.dateLetter.wording, source_path: "/es/dates", confirmed_at: null, stopped_at: null });
    expect(state.mails).toHaveLength(1);
    const [mail] = state.mails;
    expect(mail.to).toBe("sam@mail.com");
    expect(mail.locale).toBe("es");
    const confirm = new URL(mail.confirmUrl).searchParams.get("t");
    const stop = new URL(mail.stopUrl).searchParams.get("t");
    expect(await verifyToken("date-letter-confirm", confirm, SECRET)).toBe(row.id);
    expect(await verifyToken("date-letter-stop", stop, SECRET)).toBe(row.id);
    expect(mail.confirmUrl).toContain("/api/date-letter/confirm?t=");
    expect(mail.confirmUrl).toMatch(/&l=es$/);
    // A path that is not a plain one of ours is kept as "/".
    await post({ email: "kim@mail.com", path: "/plan?x=1" });
    expect(rows().find((r) => r.email === "kim@mail.com")!.source_path).toBe("/");
  });

  it("R4 the answer is the same whatever happened", async () => {
    fake = new FakeDb({ date_letter: [letterRow({ confirmed_at: new Date(NOW - 100 * HOUR).toISOString() }), letterRow({ id: "88888888-8888-4888-8888-888888888888", email: "kim@mail.com", confirm_sent_at: new Date(NOW - HOUR).toISOString() })], email_optouts: [{ email_sha256: await emailKey("lee@mail.com") }] }, NOW);
    state.db = fake.db;
    for (const email of ["sam@mail.com", "lee@mail.com", "kim@mail.com"]) {
      const res = await post({ email });
      expect(res.status, email).toBe(200);
      expect(await res.json(), email).toEqual({ ok: true, state: "asked" });
    }
    expect(state.mails).toEqual([]);
    expect(rows().some((r) => r.email === "lee@mail.com")).toBe(false);
  });

  it("R5 one confirming e-mail a day, and a failed one does not use the day up", async () => {
    await post({ email: "sam@mail.com" });
    expect(state.mails).toHaveLength(1);
    vi.setSystemTime(NOW + 23 * HOUR);
    await post({ email: "sam@mail.com" });
    expect(state.mails).toHaveLength(1);
    vi.setSystemTime(NOW + 25 * HOUR);
    await post({ email: "sam@mail.com" });
    expect(state.mails).toHaveLength(2);

    state.sendOk = false;
    await post({ email: "kim@mail.com" });
    expect(state.mails).toHaveLength(3);
    expect(rows().find((r) => r.email === "kim@mail.com")!.confirm_sent_at).toBeNull();
    state.sendOk = true;
    await post({ email: "kim@mail.com" });
    expect(state.mails).toHaveLength(4);
  });

  it("R16 only this site's own pages may ask (letter-C14)", async () => {
    const ask = (headers: Record<string, string>) =>
      api.POST(new NextRequest("https://ethos.test/api/date-letter", { method: "POST", body: JSON.stringify({ email: "sam@mail.com" }), headers: { "x-real-ip": "10.3.3.3", ...headers } }));
    expect((await ask({ "content-type": "text/plain" })).status).toBe(415);
    expect((await ask({ "content-type": "application/json", "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await ask({ "content-type": "application/json", origin: "https://elsewhere.test" })).status).toBe(403);
    expect((await ask({ "content-type": "application/json", origin: "null" })).status).toBe(403);
    expect(rows()).toEqual([]);
    expect(state.mails).toEqual([]);
    expect((await ask({ "content-type": "application/json", "sec-fetch-site": "same-origin", origin: "https://ethos.test" })).status).toBe(200);
    expect(state.mails).toHaveLength(1);
  });

  it("R17 signed in, an address on the unsubscribe list hears so instead of \"check your inbox\"; anyone else hears \"asked\" (letter-C6)", async () => {
    fake = new FakeDb({ email_optouts: [{ email_sha256: await emailKey("sam@mail.com") }] }, NOW);
    state.db = fake.db;
    expect(await (await post({ email: "sam@mail.com" })).json()).toEqual({ ok: true, state: "asked" });
    state.user = { id: "u1", email: "sam@mail.com" };
    expect(await (await post({ email: "sam@mail.com" })).json()).toEqual({ ok: true, state: "blocked" });
    expect(rows()).toEqual([]);
    expect(state.mails).toEqual([]);
  });

  it("R6 five tries in ten minutes from one connection", async () => {
    for (let i = 0; i < 5; i++) expect((await post({ email: `a${i}@mail.com` }, undefined, "10.1.1.1")).status).toBe(200);
    expect((await post({ email: "a6@mail.com" }, undefined, "10.1.1.1")).status).toBe(429);
    expect((await post({ email: "a6@mail.com" }, undefined, "10.1.1.2")).status).toBe(200);
  });

  it("R7 refuses what is not an address", async () => {
    for (const email of ["nope", "", `${"a".repeat(300)}@mail.com`]) expect((await post({ email })).status, email).toBe(400);
    expect((await post(null, JSON.stringify({ email: "sam@mail.com", path: "/".repeat(2000) }))).status).toBe(413);
    expect((await post(null, "not json")).status).toBe(400);
    expect((await post({ email: "sam@mail.com", locale: "fr" })).status).toBe(400);
    expect(rows()).toEqual([]);
    expect(state.mails).toEqual([]);
  });

  it("R8 signed in with that address, the press is the yes", async () => {
    state.user = { id: "u1", email: "Sam@Mail.com" };
    const res = await post({ email: "sam@mail.com", path: "/plan" });
    expect(await res.json()).toEqual({ ok: true, state: "on" });
    expect(rows()[0].confirmed_at).toBe(new Date(NOW).toISOString());
    expect(state.mails).toEqual([]);
    const other = await post({ email: "other@mail.com" });
    expect(await other.json()).toEqual({ ok: true, state: "asked" });
    expect(rows().find((r) => r.email === "other@mail.com")!.confirmed_at).toBeNull();
    expect(state.mails).toHaveLength(1);
  });

  it("R9 the box is told only the signed-in person's own address", async () => {
    fake = new FakeDb({ date_letter: [letterRow({ confirmed_at: new Date(NOW - 100 * HOUR).toISOString() })] }, NOW);
    state.db = fake.db;
    expect(await (await api.GET()).json()).toEqual({ available: true, email: null, state: "none" });
    state.user = { id: "u1", email: "sam@mail.com" };
    expect(await (await api.GET()).json()).toEqual({ available: true, email: "sam@mail.com", state: "on" });
    expect((await api.GET()).headers.get("cache-control")).toBe("private, no-store");
    state.user = { id: "u2", email: "kim@mail.com" };
    expect(await (await api.GET()).json()).toEqual({ available: true, email: "kim@mail.com", state: "none" });
    // A row read that fails reads as "none" and touches nothing.
    state.user = { id: "u1", email: "sam@mail.com" };
    await letterTableThere(fake.db as never);
    const before = structuredClone(rows());
    fake.failNext("date_letter", "select");
    expect(await (await api.GET()).json()).toEqual({ available: true, email: "sam@mail.com", state: "none" });
    expect(rows()).toEqual(before);
  });

  it("R10 each link is its own kind", async () => {
    fake = new FakeDb({ date_letter: [letterRow()] }, NOW);
    state.db = fake.db;
    const confirm = await signToken("date-letter-confirm", ROW, SECRET);
    expect((await link(stopRoute, "stop", "GET", confirm)).status).toBe(404);
    expect((await link(confirmRoute, "confirm", "GET", await signToken("date-letter-stop", ROW, SECRET))).status).toBe(404);
    expect((await link(confirmRoute, "confirm", "GET", await signToken("monthly-idea-stop", ROW, SECRET))).status).toBe(404);
    expect(await verifyToken("date-letter-stop", confirm, SECRET)).toBeNull();
  });

  it("R11 the confirming link asks first", async () => {
    fake = new FakeDb({ date_letter: [letterRow()] }, NOW);
    state.db = fake.db;
    const token = await signToken("date-letter-confirm", ROW, SECRET);
    const ask = await link(confirmRoute, "confirm", "GET", token);
    expect(ask.status).toBe(200);
    expect(ask.text).toContain("Send you the date letter?");
    expect(ask.html.match(/<form[^>]*method="post"/g)).toHaveLength(1);
    expect(rows()[0].confirmed_at).toBeNull();
    const done = await link(confirmRoute, "confirm", "POST", token);
    expect(done.text).toContain("You’re in.");
    expect(done.text).toMatch(/\/dates\?idea=[a-z-]+&ref=email-letter/);
    const at = rows()[0].confirmed_at;
    expect(at).toBe(new Date(NOW).toISOString());
    vi.setSystemTime(NOW + HOUR);
    expect((await link(confirmRoute, "confirm", "POST", token)).text).toContain("You’re in.");
    expect(rows()[0].confirmed_at).toBe(at);
    expect((await link(confirmRoute, "confirm", "GET", `${ROW}.forged`)).status).toBe(404);
    fake.tables.date_letter = [];
    const gone = await link(confirmRoute, "confirm", "POST", token);
    expect(gone.text).toContain("This link has expired.");
    // Spanish row, Spanish page.
    fake.tables.date_letter = [letterRow({ locale: "es" })];
    expect((await link(confirmRoute, "confirm", "GET", token, { locale: "es" })).text).toContain("¿Te enviamos la carta de citas?");
  });

  it("R12 an old confirming link cannot undo a stop", async () => {
    fake = new FakeDb({ date_letter: [letterRow({ confirm_sent_at: new Date(NOW - 50 * HOUR).toISOString(), confirmed_at: new Date(NOW - 49 * HOUR).toISOString(), stopped_at: new Date(NOW - 10 * HOUR).toISOString() })] }, NOW);
    state.db = fake.db;
    const token = await signToken("date-letter-confirm", ROW, SECRET);
    const before = structuredClone(rows()[0]);
    expect((await link(confirmRoute, "confirm", "POST", token)).text).toContain("This link has expired.");
    expect(rows()[0]).toEqual(before);
    // They ask again: a new confirming e-mail goes, and its button starts it again.
    await post({ email: "sam@mail.com" });
    expect(state.mails).toHaveLength(1);
    expect(rows()[0].stopped_at).toBe(before.stopped_at);
    expect((await link(confirmRoute, "confirm", "POST", token)).text).toContain("You’re in.");
    expect(rows()[0].stopped_at).toBeNull();
    expect(rows()[0].confirmed_at).toBe(new Date(NOW).toISOString());
  });

  it("R13 a stop is honoured at once, by the page and by the mail app's one tap", async () => {
    const on = new Date(NOW - 100 * HOUR).toISOString();
    fake = new FakeDb({ date_letter: [letterRow({ confirmed_at: on })] }, NOW);
    state.db = fake.db;
    const token = await signToken("date-letter-stop", ROW, SECRET);
    const ask = await link(stopRoute, "stop", "GET", token);
    expect(ask.text).toContain("Stop the date letter?");
    expect(ask.html.match(/<form[^>]*method="post"/g)).toHaveLength(1);
    expect(rows()[0].stopped_at).toBeNull();
    const done = await link(stopRoute, "stop", "POST", token, { oneClick: true });
    expect(done.status).toBe(200);
    expect(done.text).toContain("Stopped.");
    const at = rows()[0].stopped_at;
    expect(at).toBe(new Date(NOW).toISOString());
    vi.setSystemTime(NOW + 60_000);
    expect((await link(stopRoute, "stop", "POST", token)).text).toContain("Stopped.");
    expect(rows()[0].stopped_at).toBe(at);
    expect((await link(stopRoute, "stop", "GET", token)).text).toContain("Stopped.");

    // Forty readers' one-click stops arrive from one mail provider's address in a minute: all stop.
    const many = Array.from({ length: 40 }, (_, i) => letterRow({ id: `00000000-0000-4000-8000-${String(900 + i).padStart(12, "0")}`, email: `r${i}@mail.com`, confirmed_at: on }));
    fake.tables.date_letter = many;
    for (const r of many) expect((await link(stopRoute, "stop", "POST", await signToken("date-letter-stop", r.id, SECRET), { from: "10.200.0.1", oneClick: true })).status).toBe(200);
    expect(rows().every((r) => r.stopped_at)).toBe(true);
    // Forged links are limited per connection: the 31st in a minute gets the 503 page.
    for (let i = 0; i < 30; i++) expect((await link(stopRoute, "stop", "POST", `${ROW}.forged${i}`, { from: "10.200.0.2" })).status).toBe(404);
    expect((await link(stopRoute, "stop", "POST", `${ROW}.forged`, { from: "10.200.0.2" })).status).toBe(503);
  });

  it("R14 \"not you\" deletes the address and never writes to it again", async () => {
    fake = new FakeDb({ date_letter: [letterRow()] }, NOW);
    state.db = fake.db;
    const token = await signToken("date-letter-stop", ROW, SECRET);
    expect((await link(stopRoute, "stop", "GET", token)).text).toContain("Not you?");
    const done = await link(stopRoute, "stop", "POST", token);
    expect(done.text).toContain("Deleted.");
    expect(rows()).toEqual([]);
    expect(fake.rows("email_optouts").map((r) => r.email_sha256)).toEqual([await emailKey("sam@mail.com")]);
    vi.setSystemTime(NOW + 48 * HOUR);
    expect(await (await post({ email: "sam@mail.com" })).json()).toEqual({ ok: true, state: "asked" });
    expect(rows()).toEqual([]);
    expect(state.mails).toEqual([]);
  });

  it("R15 a failed read never changes anything", async () => {
    fake = new FakeDb({ date_letter: [letterRow()] }, NOW);
    state.db = fake.db;
    const stop = await signToken("date-letter-stop", ROW, SECRET);
    const confirm = await signToken("date-letter-confirm", ROW, SECRET);
    const before = structuredClone(rows());
    for (const [route, kind, token] of [
      [stopRoute, "stop", stop],
      [confirmRoute, "confirm", confirm],
    ] as const) {
      for (const method of ["GET", "POST"] as const) {
        fake.failNext("date_letter", "select");
        const res = await link(route, kind, method, token);
        expect(res.status, `${kind} ${method}`).toBe(503);
        expect(res.text).toContain("Something went wrong.");
      }
    }
    expect(rows()).toEqual(before);
    expect(fake.rows("email_optouts")).toEqual([]);
  });
});
