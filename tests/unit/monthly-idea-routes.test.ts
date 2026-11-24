import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { signToken, verifyToken } from "@/lib/lifecycle/links";
import { FakeDb } from "./helpers/fake-db";

/**
 * The monthly idea's stop link and its signed-in switch (PLAN-monthly 4.1, R1-R6).
 * With MONTHLY_OUT set, the stop page's two states are written as HTML for the pictures.
 */
const state = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string; email: string } | null, mode: undefined as string | undefined }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    const t = (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
    t.raw = (key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root);
    return t;
  },
}));

const stopRoute = await import("@/app/api/monthly-idea/stop/route");
const api = await import("@/app/api/monthly-idea/route");

const OWNER = "55555555-5555-4555-8555-555555555555";
const OTHER = "66666666-6666-4666-8666-666666666666";
const SECRET = "monthly-idea-test-secret";
const out = process.env.MONTHLY_OUT;

async function stopPage(method: "GET" | "POST", token: string, locale = "en") {
  const res = await stopRoute[method](new NextRequest(`https://ethos.test/api/monthly-idea/stop?t=${encodeURIComponent(token)}&l=${locale}`, { method }));
  const html = await res.text();
  return { status: res.status, html, text: html.replace(/&#39;/g, "'").replace(/&amp;/g, "&") };
}

const row = (over: Record<string, unknown> = {}) => ({ user_id: OWNER, since: "2026-11-01", template_slug: "bouquet", locale: "en", basis: "notice", wording: "Starting next month…", handled_for: null, last_sent_on: null, price_sent_at: null, price_used_at: null, off_at: null, created_at: "2026-11-01T10:00:00Z", ...over });

let fake: FakeDb;
beforeAll(() => {
  process.env.VIEWER_HASH_SECRET = SECRET;
});
beforeEach(() => {
  fake = new FakeDb({ monthly_ideas: [row(), row({ user_id: OTHER })] });
  state.db = fake.db;
  state.user = null;
});
afterEach(() => {
  delete process.env.MONTHLY_IDEA_EMAILS;
});

describe("the stop link", () => {
  it("R1 a stop link is its own kind of link", async () => {
    expect(await verifyToken("monthly-idea-stop", await signToken("monthsary-stop", OWNER, SECRET), SECRET)).toBeNull();
    expect(await verifyToken("monthsary-stop", await signToken("monthly-idea-stop", OWNER, SECRET), SECRET)).toBeNull();
    const value = `${OWNER}:1798761600`;
    expect(await verifyToken("monthly-price", await signToken("personal-price", value, SECRET), SECRET)).toBeNull();
    expect(await verifyToken("personal-price", await signToken("monthly-price", value, SECRET), SECRET)).toBeNull();
    expect(await verifyToken("monthly-price", await signToken("monthly-price", value, SECRET), SECRET)).toBe(value);
  });

  it("R2 GET asks and changes nothing", async () => {
    const token = await signToken("monthly-idea-stop", OWNER, SECRET);
    const asked = await stopPage("GET", token);
    expect(asked.status).toBe(200);
    expect(asked.text).toContain("Stop the monthly idea?");
    expect(asked.html.match(/<form[^>]*method="post"/g)).toHaveLength(1);
    expect(fake.rows("monthly_ideas")[0].off_at).toBeNull();
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, "stop-ask-en.html"), asked.html);
      fake.rows("monthly_ideas")[0].locale = "es";
      writeFileSync(join(out, "stop-ask-es.html"), (await stopPage("GET", token, "es")).html);
      fake.rows("monthly_ideas")[0].locale = "en";
    }
  });

  it("R3 POST stops, and is the mail app's one tap; the row stays, so off survives the next gift", async () => {
    const token = await signToken("monthly-idea-stop", OWNER, SECRET);
    const done = await stopPage("POST", token);
    expect(done.status).toBe(200);
    expect(done.text).toContain("Stopped.");
    expect(done.text).toContain("/account/reminders");
    const [mine, theirs] = fake.rows("monthly_ideas");
    expect(mine.off_at).toEqual(expect.any(String));
    expect(theirs.off_at).toBeNull();
    const first = mine.off_at;
    const again = await stopPage("POST", token);
    expect(again.text).toContain("Stopped.");
    expect(fake.rows("monthly_ideas")[0].off_at).toBe(first);
    expect((await stopPage("GET", token)).text).toContain("Stopped.");
    if (out) {
      writeFileSync(join(out, "stop-done-en.html"), done.html);
      fake.rows("monthly_ideas")[0].locale = "es";
      writeFileSync(join(out, "stop-done-es.html"), (await stopPage("POST", token, "es")).html);
    }
  });

  it("R4 a forged link is a 404, and an account with no row reads as stopped", async () => {
    const forged = `${OWNER}.${"A".repeat(43)}`;
    const bad = await stopPage("POST", forged);
    expect(bad.status).toBe(404);
    expect(bad.text).toContain("This link doesn't work.".replace("'", "’"));
    expect(fake.rows("monthly_ideas").every((r) => r.off_at === null)).toBe(true);
    const nobody = "77777777-7777-4777-8777-777777777777";
    const token = await signToken("monthly-idea-stop", nobody, SECRET);
    fake.calls.length = 0;
    expect((await stopPage("POST", token)).text).toContain("Stopped.");
    expect(fake.calls.filter((c) => c.op === "update")).toHaveLength(0);
  });
});

describe("the signed-in switch", () => {
  const post = (body: unknown) => api.POST(new NextRequest("https://ethos.test/api/monthly-idea", { method: "POST", body: JSON.stringify(body) }));

  it("R5 off, on, and nothing for someone without a row", async () => {
    expect(await (await api.GET()).json()).toEqual({ state: "none" });
    expect((await post({ on: false })).status).toBe(401);
    state.user = { id: OWNER, email: "sam@mail.com" };
    expect(await (await api.GET()).json()).toEqual({ state: "on" });
    const off = await post({ on: false });
    expect(await off.json()).toEqual({ state: "off" });
    expect(fake.rows("monthly_ideas")[0].off_at).toEqual(expect.any(String));
    expect(fake.rows("monthly_ideas")[1].off_at).toBeNull();
    expect(await (await api.GET()).json()).toEqual({ state: "off" });
    expect(await (await post({ on: true })).json()).toEqual({ state: "on" });
    expect(fake.rows("monthly_ideas")[0].off_at).toBeNull();
    expect((await post({ on: "yes" })).status).toBe(400);
    state.user = { id: "77777777-7777-4777-8777-777777777777", email: "x@mail.com" };
    const none = await post({ on: true });
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual({ error: "not_found" });
    expect(fake.rows("monthly_ideas")).toHaveLength(2);
  });
});

describe("the offers box", () => {
  it("R6 enrols only when the setting asks it to", async () => {
    const offers = await import("@/app/api/offer/emails/route");
    const NEW = "88888888-8888-4888-8888-888888888888";
    const yes = (body: Record<string, unknown>) => offers.POST(new NextRequest("https://ethos.test/api/offer/emails", { method: "POST", body: JSON.stringify({ on: true, locale: "en", ...body }) }));
    state.user = { id: NEW, email: "new@mail.com" };
    process.env.MONTHLY_IDEA_EMAILS = "optin";
    expect((await yes({ idea: true })).status).toBe(200);
    expect(fake.rows("offer_emails").find((r) => r.user_id === NEW)?.wording).toBe(en.offerEmails.boxIdea);
    expect(fake.rows("monthly_ideas").find((r) => r.user_id === NEW)).toMatchObject({ basis: "box", wording: en.offerEmails.boxIdea, off_at: null });
    for (const [mode, body] of [["off", { idea: true }], ["all", { idea: true }], ["optin", {}]] as const) {
      fake = new FakeDb({ monthly_ideas: [] });
      state.db = fake.db;
      process.env.MONTHLY_IDEA_EMAILS = mode;
      expect((await yes(body)).status).toBe(200);
      expect(fake.rows("offer_emails")[0].wording).toBe(en.offerEmails.box);
      expect(fake.rows("monthly_ideas")).toHaveLength(0);
    }
  });
});
