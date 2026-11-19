import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Which pay panel a premium gift's send screen shows (lib/editor/pay-sheet-split.ts). The checks that
 * matter: nothing changes until the owner sets a share, the address can't pick a panel in production,
 * nothing is written to the device without a yes to cookies, and a sale is counted to the panel its
 * pay tap came from exactly once.
 */
describe("which pay panel a premium gift shows", () => {
  let device: Map<string, string>;
  let tabStore: Map<string, string>;
  beforeEach(() => {
    vi.resetModules();
    device = new Map();
    tabStore = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => device.get(key) ?? null,
      setItem: (key: string, value: string) => void device.set(key, value),
      removeItem: (key: string) => void device.delete(key),
    });
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => tabStore.get(key) ?? null,
        setItem: (key: string, value: string) => void tabStore.set(key, value),
        removeItem: (key: string) => void tabStore.delete(key),
      },
    });
  });
  const load = () => import("@/lib/editor/pay-sheet-split");

  it("is the usual panel for everyone until a share is set", async () => {
    const { paySheetShare, pickPaySheet } = await load();
    expect(paySheetShare(undefined)).toBe(0);
    expect(paySheetShare("")).toBe(0);
    expect(paySheetShare("nonsense")).toBe(0);
    expect(paySheetShare("0.5")).toBe(0.5);
    expect(paySheetShare("3")).toBe(1);
    expect(pickPaySheet({ userId: null, share: 0, draw: () => 0, inApp: false, tryOut: false })).toBe("classic");
  });

  it("is the one-button panel for everyone at a share of 1, whatever was remembered", async () => {
    const { PAY_SHEET_KEY, pickPaySheet } = await load();
    device.set("ethos-consent", "granted");
    device.set(PAY_SHEET_KEY, "classic");
    expect(pickPaySheet({ userId: null, share: 1, draw: () => 0.99, inApp: false, tryOut: false })).toBe("one");
    // And at 0 an old "one" in the browser doesn't hold either.
    device.set(PAY_SHEET_KEY, "one");
    expect(pickPaySheet({ userId: null, share: 0, draw: () => 0, inApp: false, tryOut: false })).toBe("classic");
  });

  it("splits by the share, and one tab keeps its answer", async () => {
    const { forgetPaySheet, pickPaySheet } = await load();
    expect(pickPaySheet({ userId: null, share: 0.5, draw: () => 0.49, inApp: false, tryOut: false })).toBe("one");
    expect(pickPaySheet({ userId: null, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe("one");
    forgetPaySheet();
    expect(pickPaySheet({ userId: null, share: 0.5, draw: () => 0.5, inApp: false, tryOut: false })).toBe("classic");
  });

  it("gives one account one answer", async () => {
    const { forgetPaySheet, pickPaySheet } = await load();
    const id = "3f0c1f6e-8b1a-4a59-9a55-0d6a3f1f2b11";
    const first = pickPaySheet({ userId: id, share: 0.5, draw: () => 0, inApp: false, tryOut: false });
    forgetPaySheet();
    expect(pickPaySheet({ userId: id, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe(first);
  });

  it("follows ?pay= only where the build allows trying things out", async () => {
    const { askedPayArm, pickPaySheet } = await load();
    expect(askedPayArm("?pay=one", true)).toBe("one");
    expect(askedPayArm("?pay=classic&x=1", true)).toBe("classic");
    expect(askedPayArm("?pay=other", true)).toBeUndefined();
    expect(askedPayArm("?pay=one", false)).toBeUndefined();
    expect(pickPaySheet({ userId: null, search: "?pay=one", share: 0, draw: () => 0.99, inApp: false, tryOut: true })).toBe("one");
    expect(pickPaySheet({ userId: null, search: "?pay=one", share: 0, draw: () => 0.99, inApp: false, tryOut: false })).toBe("classic");
  });

  it("writes nothing to the device without a yes to cookies, remembers with one, and forgets when it is taken back", async () => {
    const { PAY_SHEET_KEY, pickPaySheet } = await load();
    pickPaySheet({ userId: null, share: 0.5, draw: () => 0, inApp: false, tryOut: false });
    expect(device.has(PAY_SHEET_KEY)).toBe(false);

    vi.resetModules();
    device.set("ethos-consent", "granted");
    const again = await load();
    expect(again.pickPaySheet({ userId: null, share: 0.5, draw: () => 0, inApp: false, tryOut: false })).toBe("one");
    expect(device.get(PAY_SHEET_KEY)).toBe("one");
    again.forgetPaySheet();
    expect(again.pickPaySheet({ userId: null, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe("one");

    vi.resetModules();
    device.set("ethos-consent", "denied");
    const later = await load();
    later.keepPaySheet();
    expect(device.has(PAY_SHEET_KEY)).toBe(false);
  });

  it("is always the usual panel inside the iPhone app", async () => {
    const { pickPaySheet } = await load();
    expect(pickPaySheet({ userId: null, search: "?pay=one", share: 1, draw: () => 0, inApp: true, tryOut: true })).toBe("classic");
  });

  it("counts a sale to the panel its pay tap came from, once", async () => {
    const { rememberPayClick, takePayClick } = await load();
    expect(takePayClick()).toBeNull();
    rememberPayClick("one");
    expect(takePayClick()).toBe("one");
    // The success page reopened (a restored tab, the receipt's link): nothing left to count.
    expect(takePayClick()).toBeNull();
    rememberPayClick("classic");
    expect(takePayClick()).toBe("classic");
  });
});
