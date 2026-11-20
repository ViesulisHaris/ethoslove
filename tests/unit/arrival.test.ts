import { describe, expect, it } from "vitest";
import { arrivalEvent } from "@/lib/attribution/arrival";

const at = (path: string, search = "") => ({ pathname: path, search });

describe("an arrival the dashboard couldn't see", () => {
  it("is ChatGPT's when the address carries its tag or the referrer is its site", () => {
    expect(arrivalEvent(at("/templates/the-letter", "?utm_source=chatgpt.com"), "")).toBe("arrived_chatgpt");
    expect(arrivalEvent(at("/"), "https://chatgpt.com/")).toBe("arrived_chatgpt");
    expect(arrivalEvent(at("/es", "?utm_source=ChatGPT.com&x=1"), null)).toBe("arrived_chatgpt");
  });

  it("is another assistant's for Perplexity, Copilot, Gemini and Claude", () => {
    expect(arrivalEvent(at("/gifts"), "https://www.perplexity.ai/search/abc")).toBe("arrived_ai");
    expect(arrivalEvent(at("/gifts", "?utm_source=copilot.com"), "")).toBe("arrived_ai");
    expect(arrivalEvent(at("/gifts"), "https://gemini.google.com/")).toBe("arrived_ai");
    expect(arrivalEvent(at("/gifts"), "https://claude.ai/chat/1")).toBe("arrived_ai");
  });

  it("is Pinterest's for our pins' ref, Pinterest's own click id, or its referrer", () => {
    expect(arrivalEvent(at("/blog/love-notes-for-him", "?ref=pinterest"), "")).toBe("arrived_pinterest");
    expect(arrivalEvent(at("/templates/snow-globe", "?epik=dj0yJnU9abc"), "")).toBe("arrived_pinterest");
    expect(arrivalEvent(at("/"), "https://www.pinterest.com/pin/1/")).toBe("arrived_pinterest");
    expect(arrivalEvent(at("/"), "https://pin.it/abc")).toBe("arrived_pinterest");
  });

  it("is Instagram's for a bio link's tag or its referrer", () => {
    expect(arrivalEvent(at("/", "?utm_source=ig&utm_medium=social"), "")).toBe("arrived_instagram");
    expect(arrivalEvent(at("/create/bouquet"), "https://l.instagram.com/?u=x")).toBe("arrived_instagram");
  });

  it("is nothing for every other visit", () => {
    expect(arrivalEvent(at("/"), "")).toBeNull();
    expect(arrivalEvent(at("/templates"), "https://www.google.com/")).toBeNull();
    expect(arrivalEvent(at("/", "?ref=watermark"), "")).toBeNull();
    expect(arrivalEvent(at("/", "?utm_source=meta"), "")).toBeNull();
    // A tag that isn't a plain campaign name (an email, an id) is never read.
    expect(arrivalEvent(at("/", "?utm_source=chatgpt.com@x"), "")).toBeNull();
  });

  it("never counts someone opening a gift that was sent to them", () => {
    expect(arrivalEvent(at("/g/abc123xyz"), "https://l.instagram.com/")).toBeNull();
    expect(arrivalEvent(at("/es/g/abc123xyz", "?utm_source=chatgpt.com"), "")).toBeNull();
    expect(arrivalEvent(at("/hug", "?h=abc&ref=pinterest"), "")).toBeNull();
    // A page that only starts with the same letter is a page like any other.
    expect(arrivalEvent(at("/gifts", "?utm_source=chatgpt.com"), "")).toBe("arrived_chatgpt");
    expect(arrivalEvent(at("/games", "?ref=pinterest"), "")).toBe("arrived_pinterest");
  });
});
