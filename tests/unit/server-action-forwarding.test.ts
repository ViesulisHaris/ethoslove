import { describe, expect, it } from "vitest";
import { forwardedActionPath, isServerActionPost } from "@/lib/server-action-forwarding";

const ACTION = "40d16fb242b2139cd4abeb0a5dbee63122fc1f0227";

function request(method: string, pathname: string, headers: Record<string, string>) {
  return { method, headers: new Headers(headers), nextUrl: { pathname } };
}

describe("a Server Action Next passes on to the page that has it", () => {
  const passedOn = { "next-action": ACTION, "x-action-forwarded": "1" };

  it("is served from that page's code under the visitor's currency and the default language", () => {
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]/create/[templateSlug]", passedOn), "usd", "en")).toBe("/usd/en/create/[templateSlug]");
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]/dashboard", passedOn), "eur", "en")).toBe("/eur/en/dashboard");
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]", passedOn), "gbp", "en")).toBe("/gbp/en");
  });

  it("is recognised with its brackets percent-encoded too", () => {
    expect(forwardedActionPath(request("POST", "/%5Bcurrency%5D/%5Blocale%5D/create/%5BtemplateSlug%5D", passedOn), "usd", "en")).toBe("/usd/en/create/%5BtemplateSlug%5D");
    expect(forwardedActionPath(request("POST", "/%5bcurrency%5d/%5blocale%5d/create/x", passedOn), "usd", "en")).toBe("/usd/en/create/x");
  });

  it("leaves every other request to the usual routing", () => {
    // A visitor's own address, and the internal one the proxy makes of it.
    expect(forwardedActionPath(request("POST", "/create/the-letter", passedOn), "usd", "en")).toBeNull();
    expect(forwardedActionPath(request("POST", "/usd/en/create/the-letter", passedOn), "usd", "en")).toBeNull();
    // Not a passed-on action: no marker, no action id, or not a POST.
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]/create/[templateSlug]", { "next-action": ACTION }), "usd", "en")).toBeNull();
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]/create/[templateSlug]", { "x-action-forwarded": "1" }), "usd", "en")).toBeNull();
    expect(forwardedActionPath(request("GET", "/[currency]/[locale]/create/[templateSlug]", passedOn), "usd", "en")).toBeNull();
    // Only the route's own first two segments count.
    expect(forwardedActionPath(request("POST", "/[currency]/[locale]x/create", passedOn), "usd", "en")).toBeNull();
    expect(forwardedActionPath(request("POST", "/es/[currency]/[locale]/create/x", passedOn), "usd", "en")).toBeNull();
  });
});

describe("a Server Action call from the browser", () => {
  it("is a POST with the action's id", () => {
    expect(isServerActionPost(request("POST", "/templates", { "next-action": ACTION }))).toBe(true);
    expect(isServerActionPost(request("POST", "/templates", {}))).toBe(false);
    expect(isServerActionPost(request("GET", "/templates", { "next-action": ACTION }))).toBe(false);
  });
});
