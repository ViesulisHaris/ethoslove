import { describe, expect, it } from "vitest";
import {
  GIFT_CARD_PATTERN,
  INVITE_CODE_PATTERN,
  generateGiftCardCode,
  generateInviteCode,
  normaliseCreatorCode,
  normaliseGiftCardCode,
} from "@/lib/commerce/codes";

describe("codes", () => {
  it("makes invite codes of 10 base32 characters, all different", () => {
    const codes = Array.from({ length: 500 }, generateInviteCode);
    for (const code of codes) expect(code).toMatch(INVITE_CODE_PATTERN);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("makes gift card codes people can read out without mixing letters up", () => {
    const codes = Array.from({ length: 500 }, generateGiftCardCode);
    for (const code of codes) {
      expect(code).toMatch(GIFT_CARD_PATTERN);
      expect(code.slice("ETHOS-".length)).not.toMatch(/[01OIL]/);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
  it("reads a gift card code however it was typed", () => {
    expect(normaliseGiftCardCode("ETHOS-ABCD-2345")).toBe("ETHOS-ABCD-2345");
    expect(normaliseGiftCardCode(" ethos abcd 2345 ")).toBe("ETHOS-ABCD-2345");
    expect(normaliseGiftCardCode("abcd2345")).toBe("ETHOS-ABCD-2345");
    expect(normaliseGiftCardCode("ethos-abcd-2345")).toBe("ETHOS-ABCD-2345");
  });
  it("refuses what can't be one of ours", () => {
    expect(normaliseGiftCardCode("ETHOS-ABCD-0000")).toBeNull();
    expect(normaliseGiftCardCode("ETHOS-ABCD-234")).toBeNull();
    expect(normaliseGiftCardCode("")).toBeNull();
    expect(normaliseGiftCardCode("'; drop table gift_cards; --")).toBeNull();
  });
  it("stores creator codes upper-case, 3–20 letters and digits", () => {
    expect(normaliseCreatorCode(" maria ")).toBe("MARIA");
    expect(normaliseCreatorCode("LUCAS2026")).toBe("LUCAS2026");
    expect(normaliseCreatorCode("ab")).toBeNull();
    expect(normaliseCreatorCode("maria 10")).toBe("MARIA10");
    expect(normaliseCreatorCode("Maria-10")).toBe("MARIA10");
    expect(normaliseCreatorCode("maría")).toBeNull();
    expect(normaliseCreatorCode("x".repeat(21))).toBeNull();
    expect(normaliseCreatorCode(undefined)).toBeNull();
  });
});
