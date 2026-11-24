import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { FakeDb } from "./helpers/fake-db";
import { enrolDecision } from "@/lib/lifecycle/monthly-idea";

/** Enrolment when a gift is sent, and the send sheet's hint (PLAN-monthly 4.1, N1-N5). */
const state = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string; email: string } | null, getUser: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: async () => {
    state.getUser += 1;
    return state.user;
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    const t = (key: string) => root[key] as string;
    t.raw = (key: string) => root[key];
    return t;
  },
}));

const { readIdeaAccount, enrolForIdeas } = await import("@/lib/lifecycle/monthly-idea-enrol");
const { getIdeaHint } = await import("@/app/actions/monthly-idea");

const OWNER = "55555555-5555-4555-8555-555555555555";
const ideaRow = (over: Record<string, unknown> = {}) => ({
  user_id: OWNER,
  since: "2026-10-01",
  template_slug: "bouquet",
  locale: "en",
  basis: "notice",
  wording: "old words",
  handled_for: "2026-11-01",
  last_sent_on: "2026-11-01",
  price_sent_at: null,
  price_used_at: null,
  off_at: null,
  created_at: "2026-10-01T10:00:00Z",
  ...over,
});

let fake: FakeDb;
beforeEach(() => {
  fake = new FakeDb({ monthly_ideas: [], purchases: [] });
  state.db = fake.db;
  state.user = null;
  state.getUser = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe("enrolment", () => {
  it("N1 reads who the account is", async () => {
    expect(await readIdeaAccount(fake.db as never, OWNER)).toEqual({ row: null, customer: false });
    fake.tables.purchases = [{ id: "p1", user_id: OWNER, status: "pending", store: null }, { id: "p2", user_id: OWNER, status: "paid", store: "app_store" }];
    expect((await readIdeaAccount(fake.db as never, OWNER)).customer).toBe(false);
    fake.tables.purchases.push({ id: "p3", user_id: OWNER, status: "paid", store: "stripe" });
    expect((await readIdeaAccount(fake.db as never, OWNER)).customer).toBe(true);
    fake.tables.monthly_ideas = [ideaRow({ off_at: "2026-11-02T00:00:00Z", basis: "terms" })];
    expect((await readIdeaAccount(fake.db as never, OWNER)).row).toEqual({ basis: "terms", offAt: "2026-11-02T00:00:00Z" });
    fake.failNext("monthly_ideas", "select", "down");
    await expect(readIdeaAccount(fake.db as never, OWNER)).rejects.toThrow();
  });

  it("N2 writes a new row with the sentence shown, in the language it was shown in", async () => {
    const line = await enrolForIdeas(fake.db as never, { userId: OWNER, basis: "notice", fresh: true, since: "2026-11-24", templateSlug: "bouquet", locale: "en" });
    expect(line).toBe(en.offerEmails.ideaLine);
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ user_id: OWNER, since: "2026-11-24", basis: "notice", wording: en.offerEmails.ideaLine, locale: "en", template_slug: "bouquet" });
    fake.tables.monthly_ideas = [];
    const es1 = await enrolForIdeas(fake.db as never, { userId: OWNER, basis: "terms", fresh: true, since: "2026-11-24", templateSlug: "the-letter", locale: "es" });
    expect(es1).toBe(es.offerEmails.ideaLine);
    const wording = fake.rows("monthly_ideas")[0].wording as string;
    expect(wording).toBe(es.offerEmails.ideaTerms.replace(/<\/?terms>/g, ""));
    expect(wording).not.toMatch(/[<>]/);
    expect(wording.length).toBeLessThanOrEqual(300);
  });

  it("N3 a newer gift moves the day and nothing else", async () => {
    fake.tables.monthly_ideas = [ideaRow()];
    await enrolForIdeas(fake.db as never, { userId: OWNER, basis: "notice", fresh: false, since: "2026-11-24", templateSlug: "vinyl", locale: "es" });
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ since: "2026-11-24", template_slug: "vinyl", locale: "es", basis: "notice", wording: "old words", handled_for: "2026-11-01", created_at: "2026-10-01T10:00:00Z" });
  });

  it("N4 off survives another gift", async () => {
    const stopped = { row: { basis: "notice" as const, offAt: "2026-11-02T00:00:00Z" }, customer: true };
    expect(enrolDecision({ mode: "all", firstPublish: true, freeReply: false, campaign: false, quiet: false, deliverable: true, paidSend: true, account: stopped, acceptedTerms: true })).toEqual({ enrol: false });
    fake.tables.monthly_ideas = [ideaRow({ off_at: "2026-11-02T00:00:00Z" })];
    await enrolForIdeas(fake.db as never, { userId: OWNER, basis: "notice", fresh: false, since: "2026-11-24", templateSlug: "vinyl", locale: "en" });
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ since: "2026-10-01", template_slug: "bouquet", off_at: "2026-11-02T00:00:00Z" });
  });

  it("N5 the hint does no lookups unless the setting is all", async () => {
    state.user = { id: OWNER, email: "sam@mail.com" };
    for (const value of [undefined, "optin", "buyers"]) {
      if (value) vi.stubEnv("MONTHLY_IDEA_EMAILS", value);
      fake.calls.length = 0;
      expect(await getIdeaHint("the-letter")).toBe("none");
      expect(fake.calls).toHaveLength(0);
      expect(state.getUser).toBe(0);
    }
    vi.stubEnv("MONTHLY_IDEA_EMAILS", "all");
    expect(await getIdeaHint("the-letter")).toBe("box");
    fake.tables.purchases = [{ id: "p3", user_id: OWNER, status: "paid", store: null }];
    expect(await getIdeaHint("the-letter")).toBe("none");
    state.user = null;
    expect(await getIdeaHint("the-letter")).toBe("none");
  });
});
