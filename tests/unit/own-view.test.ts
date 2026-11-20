import { describe, expect, it } from "vitest";
import { carriesSignIn, isOwnView } from "@/lib/gift/own-view";

/**
 * An open from the account a gift belongs to is neither recorded nor announced (lib/gift/own-view.ts):
 * seven in ten gifts were first "opened" by their own sender, minutes after sending, and each of
 * those sent "<Name> opened your gift".
 */
describe("the sender's own look at their gift is not an open", () => {
  it("asks who is signed in only when the request carries a sign-in", () => {
    expect(carriesSignIn([], false)).toBe(false);
    expect(carriesSignIn(["ethos-consent", "_fbp", "NEXT_LOCALE"], false)).toBe(false);
    expect(carriesSignIn(["sb-abcdefghij-auth-token"], false)).toBe(true);
    // Supabase splits a long session over numbered cookies.
    expect(carriesSignIn(["sb-abcdefghij-auth-token.0", "sb-abcdefghij-auth-token.1"], false)).toBe(true);
    // The iPhone app sends a Bearer token instead of a cookie.
    expect(carriesSignIn([], true)).toBe(true);
  });

  it("is the sender's own only when the signed-in account is the one the gift belongs to", () => {
    expect(isOwnView("u1", "u1")).toBe(true);
    expect(isOwnView("u1", "u2")).toBe(false);
    expect(isOwnView(null, "u1")).toBe(false);
    expect(isOwnView("u1", null)).toBe(false);
    expect(isOwnView(undefined, undefined)).toBe(false);
  });
});
