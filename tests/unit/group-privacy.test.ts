/**
 * A group card's link is a key: whoever holds /c/<token> can add a note. So the token never reaches
 * analytics, an error log, a session recording or an ad pixel, and the page asks for no cookies.
 */
import { describe, expect, it } from "vitest";
import { hidesConsentBanner, isAdTrackingOff, isPrivatePath } from "@/lib/analytics/consent";
import { redactPath } from "@/lib/analytics/redact-path";
import { redactGiftPath, redactGroupPath, scrubStack } from "@/lib/client-error";
import { groupToken } from "@/lib/group/token";
import { metadataRef } from "@/lib/stripe/line-items";

const TOKEN = groupToken("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", 1, "secret");

describe("the link's token stays out of everything that reports a page", () => {
  it("analytics sees /c/[token], whatever the token and with or without a language in front", () => {
    expect(redactPath(`/c/${TOKEN}`)).toBe("/c/[token]");
    expect(redactPath(`/es/c/${TOKEN}`)).toBe("/es/c/[token]");
    expect(redactPath(`/en/c/${TOKEN}`)).toBe("/en/c/[token]");
    expect(redactPath("/c/x")).toBe("/c/[token]");
    // A gift's link as before, and nothing else is touched.
    expect(redactPath("/g/abc123def")).toBe("/g/[shortId]");
    expect(redactPath("/cities/c/paris")).toBe("/cities/c/paris");
    expect(redactPath("/create/the-letter")).toBe("/create/the-letter");
    expect(redactPath("/c")).toBe("/c");
  });

  it("error reports never carry it, from an uncaught error or a caught one, in the path or in a stack", () => {
    expect(redactGiftPath(`/c/${TOKEN}`)).toBe("/c/[token]");
    expect(redactGroupPath(`/c/${TOKEN}`)).toBe("/c/[token]");
    expect(redactGroupPath("/g/abc123def")).toBe("/g/abc123def");
    expect(redactGiftPath("/g/abc123def")).toBe("/g/[shortId]");
    const stack = `Error: boom\n    at submit (https://tryethos.io/c/${TOKEN}:12:3)\n    at https://tryethos.io/_next/static/chunks/app.js:1:2`;
    expect(scrubStack(stack)).not.toContain(TOKEN);
    expect(scrubStack(stack)).toContain("/c/[token]");
    expect(scrubStack(stack)).toContain("/_next/static/chunks/app.js");
  });

  it("no session recording, no ad pixel and no cookie banner on the page", () => {
    for (const path of [`/c/${TOKEN}`, `/es/c/${TOKEN}`, "/c"]) {
      expect(isPrivatePath(path), path).toBe(true);
      expect(isAdTrackingOff(path), path).toBe(true);
      expect(hidesConsentBanner(path), path).toBe(true);
    }
    // Pages that only start with the same letter are as they were.
    for (const path of ["/cities", "/create/the-letter", "/campaign", "/creators"]) expect(isPrivatePath(path), path).toBe(false);
  });

  it("the ref the page's one link out carries is a plain word, safe to pass on", () => {
    expect(metadataRef("group-contribute")).toBe("group-contribute");
    expect(metadataRef("group-signed")).toBe("group-signed");
  });
});
