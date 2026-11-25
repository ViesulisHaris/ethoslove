import { describe, expect, it } from "vitest";
import { pairOnSale, pairOnSaleFor, pairPreviewEmails, pairSale } from "@/lib/pricing/products";

/**
 * Two more gifts for the listed accounts only (GIFT_PAIR_ENABLED=preview, GIFT_PAIR_PREVIEW_EMAILS):
 * the switch's three values, and who is listed. "true" and unset behave as they always did.
 */

const PREVIEW = { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: "owner@x.co,second@x.co" };

describe("the switch", () => {
  it("the switch's three values", () => {
    expect(pairSale({ GIFT_PAIR_ENABLED: "true" })).toBe("on");
    expect(pairSale({ GIFT_PAIR_ENABLED: "preview" })).toBe("preview");
    for (const value of [undefined, "", "1", "false", "Preview", " preview", "TRUE"]) expect(pairSale(value === undefined ? {} : { GIFT_PAIR_ENABLED: value }), String(value)).toBe("off");
  });

  it("on and off don't look at the address or the list", () => {
    const on = { GIFT_PAIR_ENABLED: "true", GIFT_PAIR_PREVIEW_EMAILS: "someone@else.co" };
    for (const email of [null, undefined, "", "a@x.co"]) expect(pairOnSaleFor(email, on), String(email)).toBe(true);
    expect(pairOnSaleFor("a@x.co", { GIFT_PAIR_PREVIEW_EMAILS: "a@x.co" })).toBe(false);
    expect(pairOnSaleFor("a@x.co", {})).toBe(false);
  });

  it("in preview, a listed account and an unlisted one", () => {
    expect(pairOnSaleFor("owner@x.co", PREVIEW)).toBe(true);
    expect(pairOnSaleFor("second@x.co", PREVIEW)).toBe(true);
    expect(pairOnSaleFor("other@x.co", PREVIEW)).toBe(false);
  });

  it("compared without case or spaces", () => {
    const env = { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: " Owner@X.co ,  second@x.co " };
    for (const email of ["owner@x.co", "OWNER@X.CO", " owner@x.co "]) expect(pairOnSaleFor(email, env), email).toBe(true);
    expect(pairPreviewEmails(env)).toEqual(["owner@x.co", "second@x.co"]);
  });

  it("a guest, an empty address and an empty list are never listed", () => {
    for (const email of [null, undefined, "", "   "]) expect(pairOnSaleFor(email, PREVIEW), JSON.stringify(email)).toBe(false);
    for (const list of ["", ",", " , ", undefined]) {
      const env = list === undefined ? { GIFT_PAIR_ENABLED: "preview" } : { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: list };
      expect(pairOnSaleFor("owner@x.co", env), JSON.stringify(list)).toBe(false);
      expect(pairPreviewEmails(env)).toEqual([]);
    }
  });

  it("pairOnSale itself is as it was", () => {
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "preview" })).toBe(false);
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "true" })).toBe(true);
    expect(pairOnSale({})).toBe(false);
  });
});
