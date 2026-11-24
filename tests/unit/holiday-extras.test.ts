import { describe, expect, it } from "vitest";
import { extraFor, HOLIDAY_EXTRAS, holidayExtraAtPublish, holidayExtrasOn, showsExtra, stampedExtra } from "@/lib/lifecycle/holiday-extras";

/** A gift first published at this instant. */
const made = (at: string, paid = true) => extraFor({ madeAt: at, paid });
const second = (iso: string, by: number) => new Date(Date.parse(iso) + by * 1000).toISOString();
const at = (iso: string) => Date.parse(iso);

/** The stamp a publish writes, with the switch on (the owner's NEXT_PUBLIC_TREE_TAG=1). */
const firstPublish = (iso: string, paid = true) => holidayExtraAtPublish({ publishedBefore: false, stored: {} }, at(iso), paid, true);
const publishAgain = (stored: unknown, iso: string, paid = true) => holidayExtraAtPublish({ publishedBefore: true, stored }, at(iso), paid, true);

describe("the Tree Tag's days", () => {
  it("is one extra, from the start of 24 November to the end of the 20th anywhere on earth, offered until the 25th has ended", () => {
    expect(HOLIDAY_EXTRAS).toEqual([{ id: "tree-tag", from: "2026-11-24T00:00:00Z", until: "2026-12-21T12:00:00Z", offeredUntil: "2026-12-26T12:00:00Z" }]);
  });

  it("starts on 24 November, not a second before", () => {
    expect(made(second("2026-11-24T00:00:00Z", -1))).toBeNull();
    expect(made("2026-11-24T00:00:00Z")).toBe("tree-tag");
    expect(made(second("2026-11-24T00:00:00Z", 1))).toBe("tree-tag");
  });

  it("holds while it is still 20 December somewhere, and is over at the instant the 21st begins at UTC-12", () => {
    // 11:59:59 on the 20th at UTC-12 is 11:59:59 UTC on the 21st; 12:00:00 UTC is midnight there.
    expect(made(second("2026-12-21T12:00:00Z", -1))).toBe("tree-tag");
    expect(made("2026-12-21T12:00:00Z")).toBeNull();
    expect(made("2026-12-21T00:00:00-12:00")).toBeNull();
    expect(made(second("2026-12-21T12:00:00Z", 1))).toBeNull();
  });

  it("is late on the 20th in Honolulu and in Auckland's 21st alike, and over on Christmas", () => {
    expect(made("2026-12-20T23:30:00-10:00")).toBe("tree-tag");
    expect(made("2026-12-21T09:00:00+13:00")).toBe("tree-tag");
    expect(made("2026-12-25T08:00:00Z")).toBeNull();
  });

  it("gives nothing to a free gift, to a gift never published, or to a gift from last year", () => {
    expect(made("2026-12-01T10:00:00Z", false)).toBeNull();
    expect(extraFor({ madeAt: null, paid: true })).toBeNull();
    expect(made("2025-12-10T10:00:00Z")).toBeNull();
    expect(made("yesterday")).toBeNull();
  });
});

describe("decided once, at the first publish", () => {
  it("a paid gift first published inside the days is stamped; a free one is not", () => {
    expect(firstPublish("2026-12-01T10:00:00Z")).toBe("tree-tag");
    expect(firstPublish("2026-12-01T10:00:00Z", false)).toBeUndefined();
  });

  it("a gift from 2025 sent again on 1 December 2026 gets nothing: it was out before", () => {
    expect(publishAgain({ watermark: false }, "2026-12-01T10:00:00Z")).toBeUndefined();
  });

  it("a gift first sent before 24 November and edited on 1 December gets nothing", () => {
    expect(publishAgain({}, "2026-12-01T10:00:00Z")).toBeUndefined();
  });

  it("a draft begun on 20 December and first sent on 3 January gets nothing", () => {
    expect(firstPublish("2027-01-03T10:00:00Z")).toBeUndefined();
  });

  it("a gift that has it keeps it when sent again after the last day, in any year", () => {
    expect(publishAgain({ holidayExtra: "tree-tag" }, "2026-12-23T09:00:00Z")).toBe("tree-tag");
    expect(publishAgain({ holidayExtra: "tree-tag" }, "2027-02-01T10:00:00Z")).toBe("tree-tag");
    // Keeping it asks nothing of what the sender holds now, nor of the switch.
    expect(holidayExtraAtPublish({ publishedBefore: true, stored: { holidayExtra: "tree-tag" } }, at("2027-02-01T10:00:00Z"), false, false)).toBe("tree-tag");
  });

  it("never decides from what the browser sends, nor stamps anything while switched off", () => {
    expect(publishAgain({ holidayExtra: "free-tag" }, "2026-12-01T10:00:00Z")).toBeUndefined();
    expect(holidayExtraAtPublish({ publishedBefore: false, stored: {} }, at("2026-12-01T10:00:00Z"), true, false)).toBeUndefined();
  });
});

describe("where it is shown", () => {
  const out = { status: "live", data: { holidayExtra: "tree-tag" } };

  it("a gift that is out and carries the stamp is offered it until Christmas has ended everywhere", () => {
    expect(showsExtra(out, at("2026-12-01T10:00:00Z"), true)).toBe("tree-tag");
    expect(showsExtra({ ...out, status: "scheduled" }, at("2026-12-24T10:00:00Z"), true)).toBe("tree-tag");
    expect(showsExtra(out, at(second("2026-12-26T12:00:00Z", -1)), true)).toBe("tree-tag");
    expect(showsExtra(out, at("2026-12-26T12:00:00Z"), true)).toBeNull();
    expect(showsExtra(out, at("2027-07-01T10:00:00Z"), true)).toBeNull();
  });

  it("a draft, a gift without the stamp, or a build with the switch off is offered nothing", () => {
    expect(showsExtra({ ...out, status: "draft" }, at("2026-12-01T10:00:00Z"), true)).toBeNull();
    expect(showsExtra({ status: "live", data: {} }, at("2026-12-01T10:00:00Z"), true)).toBeNull();
    expect(showsExtra({ status: "live", data: null }, at("2026-12-01T10:00:00Z"), true)).toBeNull();
    expect(showsExtra(out, at("2026-12-01T10:00:00Z"), false)).toBeNull();
  });

  it("reads a stamp it knows and nothing else", () => {
    expect(stampedExtra({ holidayExtra: "tree-tag" })).toBe("tree-tag");
    expect(stampedExtra({ holidayExtra: "TREE-TAG" })).toBeNull();
    expect(stampedExtra("tree-tag")).toBeNull();
  });

  it("is switched on by NEXT_PUBLIC_TREE_TAG=1 only", () => {
    expect(holidayExtrasOn(undefined)).toBe(false);
    expect(holidayExtrasOn("")).toBe(false);
    expect(holidayExtrasOn("0")).toBe(false);
    expect(holidayExtrasOn("true")).toBe(false);
    expect(holidayExtrasOn("1")).toBe(true);
  });
});

describe("the publish and save actions keep the stamp the server's", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/app/actions/gift.ts", "utf8");

  it("a publish writes the stamp holidayExtraAtPublish decides from the row, over anything the browser sent", () => {
    expect(source).toMatch(/holidayExtraAtPublish\(\{ publishedBefore: gift\.published_at !== null, stored: \{ holidayExtra: gift\.stored_extra \} \}/);
    expect(source).toContain("data: { ...data, watermark: decision.watermark, holidayExtra } as unknown as Json");
  });

  it("a save, of a draft or of a gift that is out, keeps what the row holds", () => {
    expect(source).toContain("holidayExtra: stampedExtra({ holidayExtra: row.stored_extra }) ?? undefined,");
  });
});
