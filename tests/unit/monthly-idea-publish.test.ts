/**
 * The monthly idea's part of sending a gift, through the real publish action against the in-memory
 * database (PLAN-monthly T-terms): in "all" a free first send from someone who never paid needs the
 * Terms box, ticking it starts the monthly idea with the sentence they ticked, a stopped row stays
 * stopped, and with the setting off nothing is read, written or answered differently.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { demoData } from "@/templates/the-letter/demo-data";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ client: null as unknown, user: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.client, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.client }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/email/notify", () => ({ notifyPublished: async () => {} }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    const t = (key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
    t.raw = t;
    return t;
  },
}));

const { publishGift } = await import("@/app/actions/gift");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const letter = { ...demoData.en, photos: [{ id: "p1", url: `gifts/${GIFT}/p1.webp`, width: 800, height: 600 }], message: "Three years ago you asked if the seat next to me was taken. It still isn't." };

let fake: FakeDb;
function seed({ ideas = [] as Record<string, unknown>[], purchases = [] as Record<string, unknown>[] } = {}) {
  fake = new FakeDb(
    {
      gifts: [{ id: GIFT, short_id: "free234ab", user_id: USER, template_slug: "the-letter", status: "draft", locale: "en", unlock_at: null, password_hash: null, watermark: true, data: {} }],
      template_unlocks: [],
      purchases,
      monthly_ideas: ideas,
      email_optouts: [],
    },
    NOW,
  );
  state.client = {
    from: (table: string) => fake.db.from(table as never),
    rpc: async () => ({ data: null, error: null }),
  };
  state.user = { id: USER, email: "tom@mail.com", app_metadata: {} };
}
const send = (over: Record<string, unknown> = {}) => publishGift({ giftId: GIFT, data: letter, ...over });
const status = () => fake.rows("gifts")[0].status;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("sending a free gift while the monthly idea is on for everyone", () => {
  beforeEach(() => vi.stubEnv("MONTHLY_IDEA_EMAILS", "all"));

  it("P1 refuses an unticked Terms box, and sends nothing", async () => {
    seed();
    expect(await send()).toEqual({ ok: false, error: "terms_required" });
    expect(status()).toBe("draft");
    expect(fake.rows("monthly_ideas")).toHaveLength(0);
  });

  it("P2 with the box ticked, goes out and starts the monthly idea with the sentence ticked", async () => {
    seed();
    const result = await send({ acceptFreeTerms: true });
    expect(result).toMatchObject({ ok: true, data: { status: "live", ideaNotice: en.offerEmails.ideaLine } });
    expect(status()).toBe("live");
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ user_id: USER, basis: "terms", since: "2026-12-01", template_slug: "the-letter", wording: en.offerEmails.ideaTerms.replace(/<\/?terms>/g, "") });
  });

  it("P3 asks no box of someone who already gets it, or who stopped it; a stop stays a stop", async () => {
    seed({ ideas: [{ user_id: USER, since: "2026-10-01", locale: "en", basis: "terms", wording: "x", off_at: "2026-11-01T00:00:00Z" }] });
    const result = await send();
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && "ideaNotice" in result.data).toBe(false);
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ since: "2026-10-01", off_at: "2026-11-01T00:00:00Z" });
  });

  it("P4 asks no box of a customer, and tells them on the share screen", async () => {
    seed({ purchases: [{ id: "p1", user_id: USER, status: "paid", store: null }] });
    expect(await send()).toMatchObject({ ok: true, data: { ideaNotice: en.offerEmails.ideaLine } });
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ basis: "notice" });
  });

  it("P4b a gift scheduled for a later day says the ideas start a month after it opens (monthly-D4)", async () => {
    seed({ purchases: [{ id: "p1", user_id: USER, status: "paid", store: null }] });
    // Scheduling is a paid gift's: this one is unlocked.
    state.client = { ...(state.client as object), rpc: async (name: string) => ({ data: name === "has_template_unlock" ? true : null, error: null }) };
    const result = await send({ schedule: { unlockAt: "2027-02-14T08:00:00.000Z", timezone: "Europe/London" } });
    expect(result).toMatchObject({ ok: true, data: { status: "scheduled", ideaNotice: en.offerEmails.ideaLineScheduled } });
    expect(fake.rows("monthly_ideas")[0]).toMatchObject({ since: "2027-02-14", wording: en.offerEmails.ideaLineScheduled });
  });

  it("P5 the app and Etsy mode send without the box, and start nothing", async () => {
    seed();
    const result = await send({ quiet: true });
    expect(result).toMatchObject({ ok: true });
    expect(fake.rows("monthly_ideas")).toHaveLength(0);
  });
});

describe("sending a free gift with the monthly idea off", () => {
  it("P6 asks nothing, reads and writes nothing of it, and answers as before", async () => {
    vi.stubEnv("MONTHLY_IDEA_EMAILS", "");
    seed();
    const result = await send();
    expect(result).toEqual({ ok: true, data: { shortId: "free234ab", status: "live", holidayExtra: null } });
    expect(fake.calls.filter((c) => c.table === "monthly_ideas")).toEqual([]);
  });
});
