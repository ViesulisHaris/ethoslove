import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  verifyError: null as { message: string } | null,
  user: null as { id: string } | null,
  getUserThrows: false,
  calls: [] as string[],
}));
vi.mock("@/lib/env", () => ({ env: { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "anon" }, isConfigured: { supabase: true } }));
vi.mock("@/lib/email/welcome", () => ({ welcomeIfNew: async () => {} }));
// Supabase, stood in for: the link's one-time check, and who this browser is already signed in as.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      verifyOtp: async () => {
        state.calls.push("verifyOtp");
        return { data: { user: null, session: null }, error: state.verifyError };
      },
      getUser: async () => {
        state.calls.push("getUser");
        if (state.getUserThrows) throw new Error("network down");
        return state.user ? { data: { user: state.user }, error: null } : { data: { user: null }, error: { message: "Auth session missing!" } };
      },
    },
  }),
}));

const { GET } = await import("@/app/auth/confirm/route");

const tap = (query: string) => GET(new NextRequest(`https://tryethos.io/auth/confirm?${query}`));
const landsOn = (res: Response) => {
  const to = new URL(res.headers.get("location") ?? "", "https://tryethos.io");
  return to.pathname + to.search;
};
const USED = { message: "Email link is invalid or has expired" };

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  state.verifyError = null;
  state.user = null;
  state.getUserThrows = false;
  state.calls = [];
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
});

describe("a sign-in link", () => {
  it("signs in and goes on to where the person was going", async () => {
    const res = await tap("token_hash=abc&type=email&next=/create/the-letter");
    expect(res.status).toBe(307);
    expect(landsOn(res)).toBe("/create/the-letter");
  });

  it("tapped again on a phone it already signed in: goes on, with no error page", async () => {
    // A link works once. A second tap, by the person or by the success page's button after its own
    // automatic continue, found the browser signed in and still showed "That sign-in link didn't
    // work": 34 of the 104 failed taps in the week to 9 Nov 2026.
    state.verifyError = USED;
    state.user = { id: "u1" };
    const res = await tap("token_hash=abc&type=email&next=/create/the-letter");
    expect(landsOn(res)).toBe("/create/the-letter");
    // Not a failure in the logs either: the error count stays a count of people really stuck.
    expect(errors).not.toHaveBeenCalled();
  });

  it("used or expired, with nobody signed in here: the sign-in page explains", async () => {
    state.verifyError = USED;
    const res = await tap("token_hash=abc&type=email&next=/create/the-letter");
    expect(landsOn(res)).toBe("/login?error=callback");
    expect(errors).toHaveBeenCalledWith("[auth/confirm] verifyOtp failed", USED.message);
  });

  it("still the sign-in page when asking who is signed in fails too", async () => {
    state.verifyError = USED;
    state.getUserThrows = true;
    expect(landsOn(await tap("token_hash=abc&type=email"))).toBe("/login?error=callback");
  });

  it("checks the link first, so a good link for another account still signs that account in", async () => {
    state.user = { id: "someone-else" };
    expect(landsOn(await tap("token_hash=abc&type=magiclink&next=/dates"))).toBe("/dates");
    expect(state.calls).toEqual(["verifyOtp"]);
  });

  it("never leaves the site, signed in or not", async () => {
    state.verifyError = USED;
    state.user = { id: "u1" };
    expect(landsOn(await tap("token_hash=abc&type=email&next=//evil.example/x"))).toBe("/dashboard");
  });

  it("without a token there is nothing to check: the sign-in page", async () => {
    state.user = { id: "u1" };
    expect(landsOn(await tap("type=email"))).toBe("/login?error=callback");
    expect(state.calls).toEqual([]);
  });
});
