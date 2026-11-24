import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/lifecycle/links";
import { parseStartRef, readCookie, startRefValue } from "@/lib/editor/start-ref";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string } | null, limited: false, links: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => !state.limited }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));

const route = await import("@/app/api/reminders/open/route");

const SECRET = "reminder-open-test-secret";
const USER = "11111111-1111-4111-8111-111111111111";
const R = "22222222-2222-4222-8222-222222222222";
const GIFT = "33333333-3333-4333-8333-333333333333";
const LATER = Math.floor(Date.now() / 1000) + 86_400;
const PAST = Math.floor(Date.now() / 1000) - 60;

function world(gifts: Record<string, unknown>[] = []) {
  const fake = new FakeDb({
    reminders: [{ id: R, user_id: USER, recipient_name: "Mia", occasion: "anniversary", month: 3, day: 5, locale: "en", template_slug: "our-timeline", last_sent_year: 2027, last_stage: 1 }],
    profiles: [{ id: USER, email: "leo@icloud.test" }],
    gifts,
  });
  const db = fake.db as unknown as Record<string, unknown>;
  db.auth = {
    admin: {
      generateLink: async ({ email }: { email: string }) => {
        state.links.push(email);
        return { data: { properties: { hashed_token: "hash-1" } }, error: null };
      },
    },
  };
  state.db = db;
  return fake;
}

async function open(until: number, query = "", headers: Record<string, string> = { "sec-fetch-dest": "document" }) {
  const t = await signToken("reminder-open", `${R}:${until}`, SECRET);
  const res = await route.GET(new NextRequest(`https://ethos.test/api/reminders/open?t=${t}&s=2${query}`, { headers }));
  const location = res.headers.get("location");
  return { status: res.status, to: location ? decodeURIComponent(location.replace("https://ethos.test", "")) : null, cookie: res.headers.get("set-cookie") };
}

const live = { id: GIFT, user_id: USER, status: "live", updated_at: "2026-10-01", data: { recipientName: "mia", photos: [{ id: "p", url: "gifts/x/p.jpg" }] } };

describe("'Open my gift' from a reminder e-mail", () => {
  beforeAll(() => {
    process.env.VIEWER_HASH_SECRET = SECRET;
  });
  beforeEach(() => {
    state.user = null;
    state.limited = false;
    state.links = [];
  });

  it("opens the suggested template started from the last gift for that person, for the account already signed in", async () => {
    world([live]);
    state.user = { id: USER };
    const out = await open(LATER);
    // The anniversary's ideas, without the template the reminder was saved with.
    expect(out.to).toBe(`/create/museum?ref=email-reminder-2`);
    expect(out.cookie).toContain(`ethos_start_from=${GIFT}`);
    expect(out.cookie).toMatch(/Max-Age=7200/);
    expect(out.cookie).toMatch(/SameSite=lax/i);
    expect(out.cookie).toMatch(/Path=\//);
    expect(out.cookie).not.toMatch(/HttpOnly/i);
    expect(state.links).toEqual([]);
  });

  it("starts with the name alone when no live or scheduled gift was made for them", async () => {
    world([{ ...live, status: "draft" }]);
    state.user = { id: USER };
    const out = await open(LATER);
    expect(out.to).toBe(`/create/museum?ref=email-reminder-2`);
    expect(out.cookie).toContain(`ethos_start_from=r-${R}`);
  });

  it("opens the gallery with the start kept in the cookie, in Spanish", async () => {
    world([live]);
    state.user = { id: USER };
    const out = await open(LATER, "&to=templates&l=es");
    expect(out.to).toBe("/es/templates?ref=email-reminder-2");
    expect(out.cookie).toContain(`ethos_start_from=${GIFT}`);
  });

  it("signs the reader in once, at the tap, while the link is in time", async () => {
    world([live]);
    const out = await open(LATER);
    expect(out.to).toBe(`/auth/confirm?token_hash=hash-1&type=magiclink&next=/create/museum?ref=email-reminder-2`);
    expect(state.links).toEqual(["leo@icloud.test"]);
  });

  it("asks for a sign-in after the link's time, when rate-limited, or for someone else's account", async () => {
    world([live]);
    expect((await open(PAST)).to).toBe(`/login?next=/create/museum?ref=email-reminder-2`);
    state.limited = true;
    expect((await open(LATER)).to).toMatch(/^\/login\?next=/);
    expect(state.links).toEqual([]);
  });

  it("never puts the gift's id in the address it opens: only the cookie carries it", async () => {
    world([live]);
    state.user = { id: USER };
    expect((await open(LATER)).to).not.toContain(GIFT);
    state.user = null;
    expect((await open(LATER)).to).not.toContain(GIFT);
    expect((await open(PAST)).to).not.toContain(GIFT);
  });

  it("opens the gifts to choose from when the database doesn't answer", async () => {
    const fake = world([live]);
    state.user = { id: USER };
    fake.failNext("reminders", "select");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await open(LATER, "&l=es")).to).toBe("/es/templates?ref=email-reminder-2");
    errors.mockRestore();
  });

  it("does nothing for a forged link, a loaded image, or a reminder that is gone", async () => {
    world([live]);
    const forged = await signToken("reminder-open", `${R}:${LATER}`, "not-the-secret");
    const res = await route.GET(new NextRequest(`https://ethos.test/api/reminders/open?t=${forged}`, { headers: { "sec-fetch-dest": "document" } }));
    expect(res.headers.get("location")).toBe("https://ethos.test/dashboard");
    expect((await open(LATER, "", { "sec-fetch-dest": "image" })).status).toBe(400);
    const fake = world();
    fake.tables.reminders = [];
    expect((await open(LATER)).to).toBe("/dashboard");
    expect(state.links).toEqual([]);
  });
});

describe("the start reference", () => {
  it("is a gift's id, or a reminder's with r-, and nothing else", () => {
    expect(parseStartRef(GIFT)).toEqual({ kind: "gift", id: GIFT });
    expect(parseStartRef(`r-${R}`)).toEqual({ kind: "reminder", id: R });
    expect(parseStartRef("the-letter")).toBeNull();
    expect(parseStartRef("demo")).toBeNull();
    expect(parseStartRef(null)).toBeNull();
    expect(startRefValue({ kind: "reminder", id: R })).toBe(`r-${R}`);
    expect(readCookie(`a=1; ethos_start_from=${GIFT}; b=2`, "ethos_start_from")).toBe(GIFT);
    expect(readCookie("a=1", "ethos_start_from")).toBeNull();
  });
});
