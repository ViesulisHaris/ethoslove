import { describe, expect, it } from "vitest";
import { isBehindWall, wallNext } from "@/lib/auth/sign-in-wall";

describe("the sign-in wall's next (walk-make-4)", () => {
  it("keeps a same-site path behind the wall, with its query", () => {
    expect(wallNext("/account/reminders")).toBe("/account/reminders");
    expect(wallNext("/dashboard/gift/k7m2p9xqa?tab=share")).toBe("/dashboard/gift/k7m2p9xqa?tab=share");
    expect(wallNext("/my-dates")).toBe("/my-dates");
  });

  it("never passes an absolute address or a path off the wall", () => {
    for (const bad of [null, undefined, "", "https://evil.example/account", "//evil.example/account", "/\\evil.example", "account", "/pricing", "/accounts-of-others", "/account\n/x"])
      expect(wallNext(bad), String(bad)).toBeNull();
  });

  it("knows the pages behind the wall", () => {
    expect(isBehindWall("/account")).toBe(true);
    expect(isBehindWall("/dashboard")).toBe(true);
    expect(isBehindWall("/create/bouquet")).toBe(false);
  });
});
