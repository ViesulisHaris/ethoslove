import { describe, expect, it } from "vitest";
import { SITE } from "@/config/site";
import { drawFirst, SHARE_CARD, shareCardUrl } from "@/lib/gift/share-card";

describe("a gift's share card", () => {
  it("lives beside the gift, with no locale in front to redirect", () => {
    const url = shareCardUrl("abc123", { recipientName: "Ana", locale: "en" });
    expect(url.startsWith(`${SITE.url}/g/abc123/card.jpg?v=`)).toBe(true);
    expect(url).not.toContain("/en/");
  });

  it("gets a new address when what it shows changes, and never carries the name", () => {
    const a = shareCardUrl("abc123", { recipientName: "Ana", locale: "en" });
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "en" })).toBe(a);
    expect(shareCardUrl("abc123", { recipientName: "Anna", locale: "en" })).not.toBe(a);
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "es" })).not.toBe(a);
    expect(a).not.toContain("Ana");
  });

  it("is big enough for iMessage's full-width preview", () => {
    expect(SHARE_CARD).toEqual({ width: 2400, height: 1256 });
  });
});

describe("drawing a gift's share card", () => {
  // What the image generator threw for an Arabic name with "ال" in it, on both cards, 140 times.
  const unreadableFont = async (): Promise<string> => {
    throw new Error("lookupType: 5 - substFormat: 3 is not yet supported");
  };

  it("still draws a card when their name can't be drawn, without the name", async () => {
    const failed: string[] = [];
    const card = await drawFirst(
      [
        { label: "envelope", draw: unreadableFont },
        { label: "plain card", draw: unreadableFont },
        { label: "envelope without the name", draw: async () => "envelope, for you" },
        { label: "plain card without the name", draw: async () => "never needed" },
      ],
      (label) => failed.push(label),
    );
    expect(card).toBe("envelope, for you");
    expect(failed).toEqual(["envelope", "plain card"]);
  });

  it("draws the envelope with the name when it can, trying nothing else", async () => {
    const tried: string[] = [];
    const draw = (label: string) => async () => {
      tried.push(label);
      return label;
    };
    expect(await drawFirst([{ label: "envelope", draw: draw("envelope") }, { label: "plain card", draw: draw("plain card") }], () => {})).toBe("envelope");
    expect(tried).toEqual(["envelope"]);
  });

  it("throws the last error only when nothing at all can be drawn", async () => {
    const fail = (message: string) => async (): Promise<string> => {
      throw new Error(message);
    };
    await expect(drawFirst([{ label: "a", draw: fail("first") }, { label: "b", draw: fail("last") }], () => {})).rejects.toThrow("last");
  });
});
