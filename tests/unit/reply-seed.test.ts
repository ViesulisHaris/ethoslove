import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveReplySeed, takeReplySeed } from "@/lib/editor/reply-seed";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

describe("send one back", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hands the swapped names to the same template, once", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("bouquet")).toEqual({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("bouquet")).toBeNull();
  });

  it("ignores another template and a seed older than an hour", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(takeReplySeed("the-letter")).toBeNull();
    vi.useFakeTimers();
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(takeReplySeed("bouquet")).toBeNull();
  });

  it("carries the answered gift's own fields when there are some", () => {
    const fields = { from: { name: "Lisbon", lat: 38.7, lng: -9.1 }, palette: "blush" };
    saveReplySeed({ slug: "halfway", recipientName: "Iván", senderName: "Clara", fields });
    expect(takeReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "Iván", senderName: "Clara", fields });
  });

  it("leaves out fields that aren't an object, or are far too big", () => {
    window.sessionStorage.setItem("ethos:reply", JSON.stringify({ slug: "halfway", recipientName: "A", senderName: "B", fields: ["x"], savedAt: Date.now() }));
    expect(takeReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "A", senderName: "B" });
    saveReplySeed({ slug: "halfway", recipientName: "A", senderName: "B", fields: { note: "x".repeat(30_000) } });
    expect(takeReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "A", senderName: "B" });
  });

  it("never throws when storage is blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" })).not.toThrow();
    expect(takeReplySeed("bouquet")).toBeNull();
  });
});
