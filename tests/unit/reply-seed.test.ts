import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearReplySeed, readReplySeed, saveReplySeed } from "@/lib/editor/reply-seed";

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

  it("hands the swapped names to the same template, and again after a reload, until the reply has a draft of its own", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(readReplySeed("bouquet")).toEqual({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    // The editor reloaded, or left by Back and come to again by Forward, before anything was typed:
    // read once and thrown away, the reply opened with both names empty.
    expect(readReplySeed("bouquet")).toEqual({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    // The reply's first change saves its draft, names and all (editor-shell.tsx): the seed is done.
    clearReplySeed();
    expect(readReplySeed("bouquet")).toBeNull();
  });

  it("ignores another template and a seed older than an hour, and throws both away", () => {
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    expect(readReplySeed("the-letter")).toBeNull();
    // Gone: it does not wait for a later visit to Bouquet's editor.
    expect(readReplySeed("bouquet")).toBeNull();
    vi.useFakeTimers();
    saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" });
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(readReplySeed("bouquet")).toBeNull();
    expect(window.sessionStorage.getItem("ethos:reply")).toBeNull();
  });

  it("is cleared by the editor on the reply's first change, and not before", () => {
    const shell = readFileSync("src/components/editor/editor-shell.tsx", "utf8");
    expect(shell).toContain("remote ? null : readReplySeed(slug)");
    expect(shell).toContain("if (ready && dirty) clearReplySeed();");
  });

  it("carries the answered gift's own fields when there are some", () => {
    const fields = { from: { name: "Lisbon", lat: 38.7, lng: -9.1 }, palette: "blush" };
    saveReplySeed({ slug: "halfway", recipientName: "Iván", senderName: "Clara", fields });
    expect(readReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "Iván", senderName: "Clara", fields });
  });

  it("leaves out fields that aren't an object, or are far too big", () => {
    window.sessionStorage.setItem("ethos:reply", JSON.stringify({ slug: "halfway", recipientName: "A", senderName: "B", fields: ["x"], savedAt: Date.now() }));
    expect(readReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "A", senderName: "B" });
    saveReplySeed({ slug: "halfway", recipientName: "A", senderName: "B", fields: { note: "x".repeat(30_000) } });
    expect(readReplySeed("halfway")).toEqual({ slug: "halfway", recipientName: "A", senderName: "B" });
  });

  it("throws away a seed it cannot read", () => {
    window.sessionStorage.setItem("ethos:reply", "{not json");
    expect(readReplySeed("bouquet")).toBeNull();
    expect(window.sessionStorage.getItem("ethos:reply")).toBeNull();
    window.sessionStorage.setItem("ethos:reply", JSON.stringify({ slug: "bouquet", recipientName: 4, senderName: "B", savedAt: Date.now() }));
    expect(readReplySeed("bouquet")).toBeNull();
    expect(window.sessionStorage.getItem("ethos:reply")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => saveReplySeed({ slug: "bouquet", recipientName: "Leo", senderName: "Mia" })).not.toThrow();
    expect(readReplySeed("bouquet")).toBeNull();
    expect(() => clearReplySeed()).not.toThrow();
  });
});
