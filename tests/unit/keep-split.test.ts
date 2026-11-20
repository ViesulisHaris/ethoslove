import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Which version of the Letter's send screen a visitor is shown (lib/editor/keep-split.ts). The checks
 * that matter: nothing changes until the owner sets a share, the address can't pick a version in
 * production, nothing is written to the device without a yes to cookies, a sale is counted to the
 * version its pay tap came from exactly once, and the cheaper offer is only made for a gift it
 * could actually send.
 */
describe("which version of the Letter's send screen a visitor is shown", () => {
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
  const load = () => import("@/lib/editor/keep-split");

  it("is the send screen as it was for everyone until a share is set", async () => {
    const { keepShare, pickKeep } = await load();
    expect(keepShare(undefined)).toBe(0);
    expect(keepShare("")).toBe(0);
    expect(keepShare("nonsense")).toBe(0);
    expect(keepShare("0.5")).toBe(0.5);
    expect(keepShare("3")).toBe(1);
    expect(pickKeep({ userId: null, share: 0, draw: () => 0, inApp: false, tryOut: false })).toBe("plain");
  });

  it("is the new version for everyone at a share of 1, whatever was remembered", async () => {
    const { LETTER_KEEP_KEY, pickKeep } = await load();
    device.set("ethos-consent", "granted");
    device.set(LETTER_KEEP_KEY, "plain");
    expect(pickKeep({ userId: null, share: 1, draw: () => 0.99, inApp: false, tryOut: false })).toBe("keep");
    device.set(LETTER_KEEP_KEY, "keep");
    expect(pickKeep({ userId: null, share: 0, draw: () => 0, inApp: false, tryOut: false })).toBe("plain");
  });

  it("splits by the share, and one tab keeps its answer", async () => {
    const { forgetKeep, pickKeep } = await load();
    expect(pickKeep({ userId: null, share: 0.5, draw: () => 0.49, inApp: false, tryOut: false })).toBe("keep");
    expect(pickKeep({ userId: null, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe("keep");
    forgetKeep();
    expect(pickKeep({ userId: null, share: 0.5, draw: () => 0.5, inApp: false, tryOut: false })).toBe("plain");
  });

  it("gives one account one answer", async () => {
    const { forgetKeep, pickKeep } = await load();
    const id = "3f0c1f6e-8b1a-4a59-9a55-0d6a3f1f2b11";
    const first = pickKeep({ userId: id, share: 0.5, draw: () => 0, inApp: false, tryOut: false });
    forgetKeep();
    expect(pickKeep({ userId: id, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe(first);
  });

  it("follows ?keep= only where the build allows trying things out", async () => {
    const { askedKeepArm, pickKeep } = await load();
    expect(askedKeepArm("?keep=on", true)).toBe("keep");
    expect(askedKeepArm("?keep=off&x=1", true)).toBe("plain");
    expect(askedKeepArm("?keep=other", true)).toBeUndefined();
    expect(askedKeepArm("?keep=on", false)).toBeUndefined();
    expect(pickKeep({ userId: null, search: "?keep=on", share: 0, draw: () => 0.99, inApp: false, tryOut: true })).toBe("keep");
    expect(pickKeep({ userId: null, search: "?keep=on", share: 0, draw: () => 0.99, inApp: false, tryOut: false })).toBe("plain");
  });

  it("writes nothing to the device without a yes to cookies, remembers with one, and forgets when it is taken back", async () => {
    const { LETTER_KEEP_KEY, pickKeep } = await load();
    pickKeep({ userId: null, share: 0.5, draw: () => 0, inApp: false, tryOut: false });
    expect(device.has(LETTER_KEEP_KEY)).toBe(false);

    vi.resetModules();
    device.set("ethos-consent", "granted");
    const again = await load();
    expect(again.pickKeep({ userId: null, share: 0.5, draw: () => 0, inApp: false, tryOut: false })).toBe("keep");
    expect(device.get(LETTER_KEEP_KEY)).toBe("keep");
    again.forgetKeep();
    expect(again.pickKeep({ userId: null, share: 0.5, draw: () => 0.99, inApp: false, tryOut: false })).toBe("keep");

    vi.resetModules();
    device.set("ethos-consent", "denied");
    const later = await load();
    later.keepLetterKeep();
    expect(device.has(LETTER_KEEP_KEY)).toBe(false);
  });

  it("is always the send screen as it was inside the iPhone app", async () => {
    const { pickKeep } = await load();
    expect(pickKeep({ userId: null, search: "?keep=on", share: 1, draw: () => 0, inApp: true, tryOut: true })).toBe("plain");
  });

  it("counts a sale to the version its pay tap came from, once", async () => {
    const { rememberLetterClick, takeLetterClick } = await load();
    expect(takeLetterClick()).toBeNull();
    rememberLetterClick("keep");
    expect(takeLetterClick()).toBe("keep");
    expect(takeLetterClick()).toBeNull();
    rememberLetterClick("plain");
    expect(takeLetterClick()).toBe("plain");
  });

  it("offers a note with photos only for a gift it could send", async () => {
    const { canKeepPhotos } = await load();
    expect(canKeepPhotos({ photos: 1, longLetter: false, others: false }, 5)).toBe(true);
    expect(canKeepPhotos({ photos: 5, longLetter: false, others: false }, 5)).toBe(true);
    // More photos than it holds, a letter past the free length, or anything else paid: it would not go out.
    expect(canKeepPhotos({ photos: 6, longLetter: false, others: false }, 5)).toBe(false);
    expect(canKeepPhotos({ photos: 3, longLetter: true, others: false }, 5)).toBe(false);
    expect(canKeepPhotos({ photos: 3, longLetter: false, others: true }, 5)).toBe(false);
    expect(canKeepPhotos({ photos: 0, longLetter: false, others: false }, 5)).toBe(false);
  });
});
