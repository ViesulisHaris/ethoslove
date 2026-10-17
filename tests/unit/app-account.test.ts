import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardGift } from "@/lib/gift/dashboard";

const state = vi.hoisted(() => ({
  token: null as string | null,
  user: null as { id: string; email?: string } | null,
  admin: null as unknown,
  allowed: true,
  deleted: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ bearerToken: async () => state.token }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.admin }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => state.allowed }));
vi.mock("@/lib/env", () => ({ env: { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "anon" }, isConfigured: { supabase: true } }));
vi.mock("@/lib/gift/storage-cleanup", () => ({
  deleteGiftStorage: async (giftId: string) => {
    state.deleted.push(giftId);
    return { deleted: 1, kept: 0, errors: giftId === "broken" ? ["remove failed"] : [] };
  },
}));
// The session's cookies, as @supabase/ssr hands them to setAll once verifyOtp signs in.
const ssr = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (c: unknown[]) => void } }) => ({
    auth: {
      verifyOtp: async (args: unknown) => {
        const result = await ssr.verify(args);
        if (result.cookies) options.cookies.setAll(result.cookies);
        return result.response;
      },
    },
  }),
}));

const { appGift } = await import("@/lib/app/gifts");
const { collectingClient, webSessionCookie, webSessionCookies } = await import("@/lib/app/web-session");
const { deleteAccountData } = await import("@/lib/auth/delete-account");
const webSession = await import("@/app/api/app/web-session/route");
const accountDelete = await import("@/app/api/app/account/delete/route");

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (iat: number) => `${b64({ alg: "HS256" })}.${b64({ sub: "user-1", iat })}.sig`;
const now = () => Math.floor(Date.now() / 1000);

const COOKIE = { name: "sb-project-auth-token", value: "base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0", options: { path: "/", sameSite: "lax", httpOnly: false, maxAge: 34_560_000 } };

function adminWith(options: { link?: unknown; linkError?: unknown; gifts?: string[]; deleteError?: unknown } = {}) {
  const generateLink = vi.fn(async () => ({ data: options.link === undefined ? { properties: { hashed_token: "hashed-123" } } : options.link, error: options.linkError ?? null }));
  const deleteUser = vi.fn(async () => ({ error: options.deleteError ?? null }));
  const gifts = options.gifts ?? [];
  const from = () => ({
    select: () => ({
      eq: () => ({
        range: async (start: number, end: number) => ({ data: gifts.slice(start, end + 1).map((id) => ({ id })), error: null }),
      }),
    }),
  });
  return { auth: { admin: { generateLink, deleteUser } }, from, generateLink, deleteUser };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.token = jwt(now() - 20);
  state.user = { id: "user-1", email: "alex@example.com" };
  state.admin = adminWith();
  state.allowed = true;
  state.deleted = [];
  ssr.verify.mockResolvedValue({ cookies: [COOKIE], response: { data: { session: { access_token: "x" }, user: { id: "user-1" } }, error: null } });
});

describe("My gifts for the app", () => {
  const row = (over: Partial<DashboardGift> = {}): DashboardGift =>
    ({
      id: "g1",
      short_id: "abcDEF123",
      user_id: "user-1",
      template_slug: "kawaii",
      data: { title: "For Leo", recipientName: "Leo", message: "private words" },
      status: "live",
      is_premium: true,
      watermark: false,
      password_hash: "secret-hash",
      unlock_at: null,
      timezone: "Europe/Madrid",
      locale: "es",
      created_at: "2026-09-01T10:00:00+00:00",
      updated_at: "2026-09-02T10:00:00+00:00",
      published_at: "2026-09-02T10:00:00+00:00",
      storage_pruned_at: null,
      stats: { opens: 3, uniqueViewers: 2, avgWatchPct: 80, reactions: 1, lastOpenedAt: "2026-09-03T10:00:00+00:00" },
      thumbnail: "https://project.supabase.co/storage/v1/object/sign/x",
      recipientName: "Leo",
      ...over,
    }) as DashboardGift;

  it("lists what the screen shows, and never the gift's contents or its password", () => {
    const gift = appGift(row(), "https://tryethos.io")!;
    expect(gift).toEqual({
      id: "g1",
      shortId: "abcDEF123",
      templateSlug: "kawaii",
      status: "live",
      title: "For Leo",
      recipientName: "Leo",
      locale: "es",
      createdAt: "2026-09-01T10:00:00+00:00",
      updatedAt: "2026-09-02T10:00:00+00:00",
      publishedAt: "2026-09-02T10:00:00+00:00",
      unlockAt: null,
      url: "https://tryethos.io/g/abcDEF123",
      thumbnail: "https://project.supabase.co/storage/v1/object/sign/x",
      stats: { opens: 3, uniqueViewers: 2, avgWatchPct: 80, reactions: 1, lastOpenedAt: "2026-09-03T10:00:00+00:00" },
    });
    expect(JSON.stringify(gift)).not.toMatch(/private words|secret-hash/);
  });

  it("gives a draft with no title an empty one, and leaves an archived gift out", () => {
    expect(appGift(row({ status: "draft", data: {} as DashboardGift["data"] }), "https://tryethos.io")).toMatchObject({ status: "draft", title: "" });
    expect(appGift(row({ status: "archived" }), "https://tryethos.io")).toBeNull();
  });
});

describe("the web view's own session", () => {
  it("is the session's cookies, as they would have been set", () => {
    expect(webSessionCookie(COOKIE)).toEqual({ name: COOKIE.name, value: COOKIE.value, path: "/", maxAge: 34_560_000, sameSite: "lax", httpOnly: false, secure: false });
    expect(webSessionCookie({ name: "sb-project-auth-token.1", value: "", options: { maxAge: 0, sameSite: true, secure: true } })).toEqual({ name: "sb-project-auth-token.1", value: "", path: "/", maxAge: 0, sameSite: "strict", httpOnly: false, secure: true });
    expect(webSessionCookie({ name: "x", value: "y" })).toMatchObject({ path: "/", maxAge: null, sameSite: null });
  });

  it("comes from a one-time token for the caller's own email, verified at once", async () => {
    const admin = adminWith();
    const result = await webSessionCookies(admin as never, { id: "user-1", email: "alex@example.com" }, collectingClient("https://project.supabase.co", "anon"));
    expect(admin.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "alex@example.com" });
    expect(ssr.verify).toHaveBeenCalledWith({ token_hash: "hashed-123", type: "magiclink" });
    expect(result).toEqual({ ok: true, cookies: [webSessionCookie(COOKIE)] });
  });

  it("is never somebody else's session", async () => {
    ssr.verify.mockResolvedValue({ cookies: [COOKIE], response: { data: { session: {}, user: { id: "someone-else" } }, error: null } });
    const res = await webSession.POST();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "wrong_user" });
  });

  it("answers the app with the cookies, never setting them itself", async () => {
    const res = await webSession.POST();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.json()).toEqual({ userId: "user-1", cookies: [webSessionCookie(COOKIE)] });
  });

  it("needs a Bearer token, a fresh one, and an email", async () => {
    state.token = null;
    expect((await webSession.POST()).status).toBe(401);
    state.token = jwt(now() - 20);
    state.user = null;
    expect(await (await webSession.POST()).json()).toEqual({ error: "unauthenticated" });
    state.user = { id: "user-1", email: "alex@example.com" };
    state.token = jwt(now() - 3600);
    const stale = await webSession.POST();
    expect(stale.status).toBe(401);
    expect(await stale.json()).toEqual({ error: "stale_token" });
    state.token = jwt(now() - 20);
    state.user = { id: "user-1" };
    const noEmail = await webSession.POST();
    expect(noEmail.status).toBe(409);
    expect(await noEmail.json()).toEqual({ error: "no_email" });
    expect((state.admin as ReturnType<typeof adminWith>).generateLink).not.toHaveBeenCalled();
  });

  it("is rate limited per user, and fails loudly when the link or the check fails", async () => {
    state.allowed = false;
    expect((await webSession.POST()).status).toBe(429);
    state.allowed = true;
    state.admin = adminWith({ link: null, linkError: { message: "nope" } });
    expect(await (await webSession.POST()).json()).toEqual({ error: "link_failed" });
    state.admin = adminWith();
    ssr.verify.mockResolvedValue({ cookies: [], response: { data: { session: null, user: null }, error: { message: "expired" } } });
    expect(await (await webSession.POST()).json()).toEqual({ error: "verify_failed" });
  });
});

describe("deleting the account from the app", () => {
  it("removes every gift's files, then the user", async () => {
    const admin = adminWith({ gifts: ["g1", "g2"] });
    expect(await deleteAccountData(admin as never, "user-1")).toEqual({ ok: true });
    expect(state.deleted).toEqual(["g1", "g2"]);
    expect(admin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("stops before the user when a gift's files won't go", async () => {
    const admin = adminWith({ gifts: ["g1", "broken"] });
    expect(await deleteAccountData(admin as never, "user-1")).toEqual({ ok: false, error: "storage_cleanup_failed" });
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("needs a fresh Bearer token, like the web session", async () => {
    state.admin = adminWith({ gifts: ["g1"] });
    state.token = jwt(now() - 3600);
    const stale = await accountDelete.POST();
    expect(stale.status).toBe(401);
    expect(await stale.json()).toEqual({ error: "stale_token" });
    expect((state.admin as ReturnType<typeof adminWith>).deleteUser).not.toHaveBeenCalled();

    state.token = jwt(now() - 5);
    const done = await accountDelete.POST();
    expect(done.status).toBe(200);
    expect(await done.json()).toEqual({ ok: true });
    expect((state.admin as ReturnType<typeof adminWith>).deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("says why when it can't", async () => {
    state.admin = adminWith({ deleteError: { message: "auth down" } });
    const res = await accountDelete.POST();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "auth down" });
  });
});
