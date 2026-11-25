import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/proxy", () => ({ refreshSupabaseSession: async (_request: unknown, response: unknown) => response }));

async function rewriteOf(url: string): Promise<string | null> {
  const { proxy } = await import("@/proxy");
  const response = await proxy(new NextRequest(`https://tryethos.io${url}`));
  const rewrite = response.headers.get("x-middleware-rewrite");
  return rewrite ? new URL(rewrite).pathname : null;
}

describe("the Portuguese letter page has one address (reports/seoaudit-audit.md, m5)", () => {
  it("sends /es/pt/carta-digital to /pt/carta-digital in one step", async () => {
    const { proxy } = await import("@/proxy");
    const response = await proxy(new NextRequest("https://tryethos.io/es/pt/carta-digital"));
    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/pt/carta-digital");
  });

  it("serves /pt/carta-digital itself for a Spanish visitor too, with the menus in their language, never redirecting", async () => {
    expect(await rewriteOf("/pt/carta-digital")).toBe("/eur/en/pt/carta-digital");
    const { proxy } = await import("@/proxy");
    const spanish = await proxy(new NextRequest("https://tryethos.io/pt/carta-digital", { headers: { cookie: "ETHOS_LOCALE=es", "accept-language": "es-ES,es;q=0.9" } }));
    expect(spanish.headers.get("location")).toBeNull();
    expect(new URL(spanish.headers.get("x-middleware-rewrite")!).pathname).toBe("/eur/es/pt/carta-digital");
  });
});
