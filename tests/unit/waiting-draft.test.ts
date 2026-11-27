import { describe, expect, it } from "vitest";
import { findWaitingDraft } from "@/lib/editor/waiting-draft";

/** A Storage over a plain object, as findWaitingDraft reads it. */
function storage(entries: Record<string, unknown>) {
  const keys = Object.keys(entries);
  return {
    get length() {
      return keys.length;
    },
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => (k in entries ? (typeof entries[k] === "string" ? (entries[k] as string) : JSON.stringify(entries[k])) : null),
  };
}

const NOW = Date.UTC(2026, 10, 27, 12);
const HOUR = 60 * 60 * 1000;
const SLUGS = ["the-letter", "bouquet", "xoxo"];
const draft = (slug: string, over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  version: 1,
  slug,
  status: "draft",
  updatedAt: NOW - HOUR,
  data: { recipientName: "Ana", senderName: "", message: "", photos: [], ...data },
  ...over,
});

describe("the gift waiting on this phone", () => {
  it("finds a started gift and says who it is for", () => {
    expect(findWaitingDraft(storage({ "ethos:draft:bouquet": draft("bouquet") }), SLUGS, NOW)).toEqual({ slug: "bouquet", recipient: "Ana", updatedAt: NOW - HOUR });
  });

  it("counts words without a name, and nothing typed at all as nothing", () => {
    const words = findWaitingDraft(storage({ "ethos:draft:the-letter": draft("the-letter", {}, { recipientName: " ", message: "Three years" }) }), SLUGS, NOW);
    expect(words).toEqual({ slug: "the-letter", recipient: "", updatedAt: NOW - HOUR });
    expect(findWaitingDraft(storage({ "ethos:draft:xoxo": draft("xoxo", {}, { recipientName: "", message: "  " }) }), SLUGS, NOW)).toBeNull();
  });

  it("picks the most recently touched of several", () => {
    const found = findWaitingDraft(
      storage({
        "ethos:draft:the-letter": draft("the-letter", { updatedAt: NOW - 5 * HOUR }),
        "ethos:draft:xoxo": draft("xoxo", { updatedAt: NOW - 2 * HOUR }, { recipientName: "Maya" }),
      }),
      SLUGS,
      NOW,
    );
    expect(found?.slug).toBe("xoxo");
    expect(found?.recipient).toBe("Maya");
  });

  it("leaves out sent and scheduled gifts, replies, unknown templates, a week-old draft and broken entries", () => {
    expect(
      findWaitingDraft(
        storage({
          "ethos:draft:bouquet": draft("bouquet", { status: "live" }),
          "ethos:draft:xoxo": draft("xoxo", { status: "scheduled" }),
          "ethos:draft:the-letter:reply": draft("the-letter"),
          "ethos:draft:gone-template": draft("gone-template"),
          "ethos:draft:the-letter": draft("the-letter", { updatedAt: NOW - 8 * 24 * HOUR }),
          "ethos:consent": "denied",
        }),
        SLUGS,
        NOW,
      ),
    ).toBeNull();
    expect(findWaitingDraft(storage({ "ethos:draft:bouquet": "{not json" }), SLUGS, NOW)).toBeNull();
    // A draft filed under another template's key is not that template's.
    expect(findWaitingDraft(storage({ "ethos:draft:bouquet": draft("xoxo") }), SLUGS, NOW)).toBeNull();
  });

  it("keeps a long name to forty characters, as the form does", () => {
    const found = findWaitingDraft(storage({ "ethos:draft:bouquet": draft("bouquet", {}, { recipientName: "A".repeat(60) }) }), SLUGS, NOW);
    expect(found?.recipient).toHaveLength(40);
  });

  it("answers nothing when the storage itself fails", () => {
    const broken = { length: 1, key: () => { throw new Error("blocked"); }, getItem: () => null };
    expect(findWaitingDraft(broken, SLUGS, NOW)).toBeNull();
  });
});
