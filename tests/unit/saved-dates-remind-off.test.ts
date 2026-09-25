import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { signToken } from "@/lib/lifecycle/links";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
// The catalogue's own words, with {placeholders} filled in: what next-intl does for these plain strings.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
  },
}));

const route = await import("@/app/api/saved-dates/remind-off/route");

const SECRET = "remind-off-test-secret";
const row = (id: string, over: Record<string, unknown>) => ({ id, owner_user_id: "owner-1", kind: "date", title: "", day: "2026-10-02", data: {}, remind: true, reminded_for: null, ...over });

async function page(method: "GET" | "POST", id: string, locale: "en" | "es") {
  const t = await signToken("saved-date-reminder-off", id, SECRET);
  const res = await route[method](new NextRequest(`https://ethos.test/api/saved-dates/remind-off?t=${t}&l=${locale}`, { method }));
  return { status: res.status, text: await res.text() };
}

describe("turning off a saved date's reminder from the email", () => {
  let fake: FakeDb;
  beforeAll(() => {
    process.env.VIEWER_HASH_SECRET = SECRET;
  });
  beforeEach(() => {
    fake = new FakeDb({
      saved_dates: [
        // "Save trip" stores no title: the trip is named in whoever's reading language.
        row("11111111-1111-4111-8111-111111111111", { kind: "trip", data: { v: 1, tripId: "lisbon-slow-weekend" } }),
        row("22222222-2222-4222-8222-222222222222", { kind: "date", title: "Our anniversary" }),
        row("33333333-3333-4333-8333-333333333333", { kind: "date" }),
      ],
    });
    state.db = fake.db;
  });

  it("names a trip saved without a title by the trip's own name, in the link's language, as the email does", async () => {
    const asked = await page("GET", "11111111-1111-4111-8111-111111111111", "en");
    expect(asked.status).toBe(200);
    expect(asked.text).toContain("Neither of you will be emailed the day before “Lisbon, slowly”.");
    expect(asked.text).not.toContain("“Trip”");
    expect((await page("GET", "11111111-1111-4111-8111-111111111111", "es")).text).toContain("el día antes de «Lisboa, sin prisa»");

    const done = await page("POST", "11111111-1111-4111-8111-111111111111", "en");
    expect(done.text).toContain("No email the day before “Lisbon, slowly”.");
    expect(fake.rows("saved_dates")[0].remind).toBe(false);
  });

  it("keeps a date's own title, and says what it is when it has none", async () => {
    expect((await page("GET", "22222222-2222-4222-8222-222222222222", "en")).text).toContain("the day before “Our anniversary”.");
    expect((await page("GET", "33333333-3333-4333-8333-333333333333", "en")).text).toContain("the day before “A date”.");
  });
});
