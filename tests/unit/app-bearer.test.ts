import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorization: null as string | null,
  createClient: vi.fn(),
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.authorization ? { authorization: state.authorization } : {}),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@/lib/env", () => ({
  env: { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "anon" },
  isConfigured: { supabase: true },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: state.createClient }));
vi.mock("@supabase/ssr", () => ({ createServerClient: state.createServerClient }));

const { parseBearer, isFreshToken, jwtClaims } = await import("@/lib/auth/bearer");
const { bearerToken, getSupabaseServerClient } = await import("@/lib/supabase/server");
const { getCurrentUser } = await import("@/lib/auth/get-user");

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (claims: Record<string, unknown>) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}.c2lnbmF0dXJl`;
const TOKEN = jwt({ sub: "user-1", iat: 1_790_000_000 });

beforeEach(() => {
  vi.clearAllMocks();
  state.authorization = null;
  const client = (kind: string) => ({ kind, auth: { getUser: state.getUser } });
  state.createClient.mockImplementation(() => client("bearer"));
  state.createServerClient.mockImplementation(() => client("cookies"));
  state.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
});

describe("the app's Bearer token", () => {
  it("is read only when it is shaped like a Supabase JWT", () => {
    expect(parseBearer(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(parseBearer(`bearer  ${TOKEN} `)).toBe(TOKEN);
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("")).toBeNull();
    expect(parseBearer(`Basic ${TOKEN}`)).toBeNull();
    expect(parseBearer("Bearer")).toBeNull();
    expect(parseBearer("Bearer not-a-jwt")).toBeNull();
    expect(parseBearer("Bearer a.b")).toBeNull();
    expect(parseBearer(`Bearer ${TOKEN}.extra`)).toBeNull();
    expect(parseBearer(`Bearer ${TOKEN} ${TOKEN}`)).toBeNull();
    expect(parseBearer(`Bearer ${"a".repeat(9000)}.b.c`)).toBeNull();
  });

  it("is never the cron routes' shared secret", () => {
    // CRON_SECRET is a random string with no dots: it can't be taken for a user's token.
    expect(parseBearer("Bearer 3f9a0c1d2e4b5a6978c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4")).toBeNull();
  });

  it("makes the request speak as that user, with no session of its own", async () => {
    state.authorization = `Bearer ${TOKEN}`;
    expect(await bearerToken()).toBe(TOKEN);
    const client = (await getSupabaseServerClient()) as unknown as { kind: string };
    expect(client.kind).toBe("bearer");
    expect(state.createServerClient).not.toHaveBeenCalled();
    const [, , options] = state.createClient.mock.calls[0];
    expect(options.global.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.auth).toMatchObject({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  });

  it("falls back to the browser's cookies when the header is malformed", async () => {
    state.authorization = "Bearer not-a-jwt";
    expect(await bearerToken()).toBeNull();
    const client = (await getSupabaseServerClient()) as unknown as { kind: string };
    expect(client.kind).toBe("cookies");
    expect(state.createClient).not.toHaveBeenCalled();
  });

  it("is checked with Supabase for the user, and cookies are asked without one", async () => {
    state.authorization = `Bearer ${TOKEN}`;
    expect(await getCurrentUser()).toEqual({ id: "user-1" });
    expect(state.getUser).toHaveBeenCalledWith(TOKEN);

    state.getUser.mockClear();
    state.authorization = null;
    await getCurrentUser();
    expect(state.getUser).toHaveBeenCalledWith();
  });

  it("is nobody when Supabase refuses it", async () => {
    state.authorization = `Bearer ${TOKEN}`;
    state.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    expect(await getCurrentUser()).toBeNull();
  });

  it("never reaches the cron routes, which don't ask who the user is", () => {
    const dir = join(process.cwd(), "src/app/api/cron");
    for (const job of readdirSync(dir)) {
      const source = readFileSync(join(dir, job, "route.ts"), "utf8");
      expect(source).not.toMatch(/get-user|supabase\/server|getCurrentUser|getSupabaseServerClient/);
    }
  });
});

describe("a fresh token", () => {
  const now = 1_790_000_000_000;

  it("was issued in the last ten minutes", () => {
    expect(isFreshToken(jwt({ iat: now / 1000 - 30 }), now)).toBe(true);
    expect(isFreshToken(jwt({ iat: now / 1000 - 600 }), now)).toBe(true);
    expect(isFreshToken(jwt({ iat: now / 1000 - 601 }), now)).toBe(false);
    expect(isFreshToken(jwt({ iat: now / 1000 - 3600 }), now)).toBe(false);
  });

  it("allows a little clock skew, not a token from the future", () => {
    expect(isFreshToken(jwt({ iat: now / 1000 + 30 }), now)).toBe(true);
    expect(isFreshToken(jwt({ iat: now / 1000 + 3600 }), now)).toBe(false);
  });

  it("needs a numeric iat", () => {
    expect(isFreshToken(jwt({ sub: "x" }), now)).toBe(false);
    expect(isFreshToken(jwt({ iat: "1790000000" }), now)).toBe(false);
    expect(isFreshToken("a.b.c", now)).toBe(false);
    expect(jwtClaims("only-one-part")).toBeNull();
  });
});
