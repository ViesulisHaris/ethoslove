import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

// Only the proxy's matcher is under test; what it does to a request needs Next's runtime.
vi.mock("next-intl/middleware", () => ({ default: () => () => undefined }));
vi.mock("@/lib/supabase/proxy", () => ({ refreshSupabaseSession: () => undefined }));
const { config: proxyConfig } = await import("@/proxy");

const AASA_PATH = "/.well-known/apple-app-site-association";
const aasa = JSON.parse(readFileSync(join(process.cwd(), `public${AASA_PATH}`), "utf8"));

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

  it("A1 the pages about trips that are not a trip stay on the web", () => {
    // The app opens /trips/<id> on a trip; a page by origin or by kind is no trip, so it is left to the browser. The first match wins.
    const components: { "/": string; exclude?: boolean }[] = aasa.applinks.details[0].components;
    const at = (path: string) => components.findIndex((c) => c["/"] === path);
    for (const [pattern, claim] of [
      ["/trips/from-*", "/trips/*"],
      ["/es/trips/from-*", "/es/trips/*"],
      ["/trips/ideas/*", "/trips/*"],
      ["/es/trips/ideas/*", "/es/trips/*"],
    ]) {
      expect(at(pattern), pattern).toBeGreaterThanOrEqual(0);
      expect(components[at(pattern)].exclude, pattern).toBe(true);
      expect(at(pattern), pattern).toBeLessThan(at(claim));
    }
  });

  it("let iCloud Keychain save and offer tryethos.io passwords in the same app", () => {
    // The app's entitlement is webcredentials:tryethos.io; iOS ignores it until this entry names the app.
    expect(aasa.webcredentials).toEqual({ apps: ["6STLVMDPXB.xyz.secuora.ethos"] });
    expect(aasa.webcredentials.apps).toEqual(aasa.applinks.details[0].appIDs);
    expect(Object.keys(aasa).sort()).toEqual(["applinks", "webcredentials"]);
  });

  it("are served the way Apple fetches them: JSON, from the file, with no locale redirect in front", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.find((rule) => rule.source === AASA_PATH)?.headers).toContainEqual({ key: "Content-Type", value: "application/json" });
    const redirects = await nextConfig.redirects!();
    expect(redirects.some((redirect) => redirect.source.includes("well-known") || redirect.source.includes(":path"))).toBe(false);
    // The locale proxy would send a Spanish visitor to /es/.well-known/…, a 404. It must not run here.
    const proxied = (path: string) => proxyConfig.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));
    expect(proxied(AASA_PATH)).toBe(false);
    expect(proxied("/plan")).toBe(true);
  });
});
