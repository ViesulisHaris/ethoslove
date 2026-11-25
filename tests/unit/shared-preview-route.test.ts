import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/proxy", () => ({ refreshSupabaseSession: async (_request: unknown, response: unknown) => response }));

/**
 * /dates and /plan put their title, description, canonical and hreflang in the <head> for every reader
 * (reports/seoaudit-audit.md, M2): their tags read no query, because Next streams tags that await the
 * query into the body for every user agent outside htmlLimitedBots, Googlebot and a reader without
 * JavaScript included. A shared link's preview, which does need the query, is served by the page's
 * `shared` twin, which the proxy picks only for a link that carries one.
 */
async function rewriteOf(url: string): Promise<string | null> {
  const { proxy } = await import("@/proxy");
  const response = await proxy(new NextRequest(`https://tryethos.io${url}`));
  const rewrite = response.headers.get("x-middleware-rewrite");
  return rewrite ? new URL(rewrite).pathname : null;
}

const APP = path.join(__dirname, "../../src/app/[currency]/[locale]/(marketing)");

describe("pages whose shared links carry a preview", () => {
  it("serve the plain page for a plain address, in both languages", async () => {
    expect(await rewriteOf("/dates")).toBe("/eur/en/dates");
    expect(await rewriteOf("/es/dates")).toBe("/eur/es/dates");
    expect(await rewriteOf("/plan")).toBe("/eur/en/plan");
    // A query without a preview (the map's own state) is still the page itself.
    expect(await rewriteOf("/dates?lat=56.9&lng=24.1")).toBe("/eur/en/dates");
  });

  it("serve the shared twin for a link with a preview", async () => {
    expect(await rewriteOf("/dates?lat=56.9&lng=24.1&place=node%2F1&c=abc&t=Cafe")).toBe("/eur/en/dates/shared");
    expect(await rewriteOf("/es/dates?t=Cafe")).toBe("/eur/es/dates/shared");
    expect(await rewriteOf("/plan?c=abc&t=Our%20day&d=2026-12-01")).toBe("/eur/en/plan/shared");
    // Another page with the same query is left alone.
    expect(await rewriteOf("/trips?t=x")).toBe("/eur/en/trips");
  });

  it("the canonical pages' tags never await the query; only the twins read it", () => {
    for (const page of ["dates", "plan"]) {
      const source = fs.readFileSync(path.join(APP, page, "page.tsx"), "utf8");
      const meta = source.slice(source.indexOf("export async function generateMetadata"), source.indexOf("export default"));
      expect(meta, page).not.toMatch(/searchParams\s*\}|await searchParams/);
      const twin = fs.readFileSync(path.join(APP, page, "shared", "page.tsx"), "utf8");
      expect(twin, `${page}/shared`).toMatch(/robots: \{ index: false/);
    }
  });
});
