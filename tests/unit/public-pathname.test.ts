import { describe, expect, it } from "vitest";
import { publicPathname } from "@/i18n/navigation";

// A page built ahead of time is drawn on the server at its path inside the app (/usd/en/occasions);
// the browser reads /occasions. Whatever is drawn from the path must read the same in both, or
// React throws away the page's HTML (error #418, seen on /occasions and /es/gifts).
describe("the path a page is drawn from", () => {
  it("is the same on the server's inside path as in the browser's address", () => {
    expect(publicPathname("/usd/en/occasions")).toBe("/occasions");
    expect(publicPathname("/eur/es/gifts")).toBe("/gifts");
    expect(publicPathname("/gbp/en/templates/bouquet")).toBe("/templates/bouquet");
    expect(publicPathname("/usd/en")).toBe("/");
    expect(publicPathname("/eur/es")).toBe("/");
  });

  it("leaves the browser's own paths alone", () => {
    for (const path of ["/occasions", "/gifts", "/", "/templates/bouquet", "/try/usd", "/dates/london"]) expect(publicPathname(path)).toBe(path);
  });

  it("takes only a currency followed by a language as the inside prefix", () => {
    expect(publicPathname("/usd/english")).toBe("/usd/english");
    expect(publicPathname("/abc/en/occasions")).toBe("/abc/en/occasions");
  });
});
