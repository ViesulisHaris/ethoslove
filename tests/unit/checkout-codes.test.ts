import { describe, expect, it } from "vitest";
import { checkoutCodeEmails, checkoutCodesFor } from "@/lib/pricing/products";

describe("who may enter a promotion code at checkout", () => {
  it("is nobody while CHECKOUT_CODE_EMAILS is unset or empty: the site sells at one price", () => {
    for (const env of [{}, { CHECKOUT_CODE_EMAILS: "" }, { CHECKOUT_CODE_EMAILS: " , " }]) {
      expect(checkoutCodeEmails(env)).toEqual([]);
      expect(checkoutCodesFor("owner@example.com", env)).toBe(false);
      expect(checkoutCodesFor(null, env)).toBe(false);
    }
  });

  it("is only the listed accounts, whatever the case or spacing, and never a guest", () => {
    const env = { CHECKOUT_CODE_EMAILS: " Owner@Example.com , second@example.com" };
    expect(checkoutCodesFor("owner@example.com", env)).toBe(true);
    expect(checkoutCodesFor("SECOND@example.com ", env)).toBe(true);
    expect(checkoutCodesFor("other@example.com", env)).toBe(false);
    expect(checkoutCodesFor("", env)).toBe(false);
    expect(checkoutCodesFor(undefined, env)).toBe(false);
  });
});
