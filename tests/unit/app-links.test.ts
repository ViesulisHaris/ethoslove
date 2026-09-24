import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const aasa = JSON.parse(readFileSync(join(process.cwd(), "public/.well-known/apple-app-site-association"), "utf8"));

describe("universal links for the iPhone app", () => {
  it("name the app and exactly the pages it opens, in both languages", () => {
    const [details] = aasa.applinks.details;
    expect(details.appIDs).toEqual(["6STLVMDPXB.xyz.secuora.ethos"]);
    const paths = details.components.map((c: { "/": string }) => c["/"]);
    for (const path of ["/plan", "/for-two/join", "/trips/*", "/templates/*"]) {
      expect(paths).toContain(path);
      expect(paths).toContain(`/es${path}`);
    }
    expect(details.components.find((c: { "/": string }) => c["/"] === "/for-two/join")["?"]).toEqual({ code: "?*" });
  });

  it("never claim a gift link: a recipient always gets the web gift", () => {
    const paths: string[] = aasa.applinks.details.flatMap((d: { components: { "/": string }[] }) => d.components.map((c) => c["/"]));
    expect(paths.some((p) => p.startsWith("/g") || p === "*" || p === "/*")).toBe(false);
  });
});
