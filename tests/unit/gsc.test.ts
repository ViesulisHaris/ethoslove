import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  GSC_SCOPE,
  accessToken,
  bearerMatches,
  gscRequestBody,
  parseGscQuery,
  parseServiceAccount,
  resetTokenCache,
  serviceAccountAssertion,
} from "@/lib/gsc/search-console";

/**
 * The cloud SEO routines read Search Console through /api/internal/gsc (docs/blog/SEO-DATA.md).
 * The key file and the export key live only in Vercel; these tests use a throwaway RSA key.
 */

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const SA = { client_email: "reader@ethos-gsc.iam.gserviceaccount.com", private_key: PEM };
const KEY_FILE = JSON.stringify({ type: "service_account", project_id: "ethos-gsc", ...SA });
const NOW = Date.parse("2026-11-13T12:00:00Z");

describe("the service account", () => {
  it("is read from the key file, with line breaks restored if it was pasted as one line", () => {
    expect(parseServiceAccount(KEY_FILE)).toEqual(SA);
    const oneLine = JSON.stringify({ ...SA, private_key: PEM.replace(/\n/g, "\\n") });
    expect(parseServiceAccount(oneLine)?.private_key).toBe(PEM);
  });

  it("is null for anything that isn't a key file", () => {
    for (const bad of [undefined, "", "not json", "{}", JSON.stringify({ client_email: "x", private_key: PEM }), JSON.stringify({ client_email: SA.client_email, private_key: "secret" })]) {
      expect(parseServiceAccount(bad), String(bad)).toBeNull();
    }
  });

  it("signs a one-hour, read-only token request that the key verifies", () => {
    const jwt = serviceAccountAssertion(SA, NOW / 1000);
    const [header, claim, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const c = JSON.parse(Buffer.from(claim!, "base64url").toString());
    expect(c).toMatchObject({ iss: SA.client_email, scope: GSC_SCOPE, aud: "https://oauth2.googleapis.com/token" });
    expect(c.exp - c.iat).toBe(3600);
    const verify = createVerify("RSA-SHA256");
    verify.update(`${header}.${claim}`);
    expect(verify.verify(publicKey, Buffer.from(signature!, "base64url"))).toBe(true);
  });
});

describe("the access token", () => {
  beforeEach(() => resetTokenCache());

  it("is asked for once and reused until a minute before it expires", async () => {
    const doFetch = vi.fn(async () => new Response(JSON.stringify({ access_token: "t1", expires_in: 3600 })));
    expect(await accessToken(SA, NOW, doFetch as unknown as typeof fetch)).toBe("t1");
    expect(await accessToken(SA, NOW + 3_000_000, doFetch as unknown as typeof fetch)).toBe("t1");
    expect(doFetch).toHaveBeenCalledTimes(1);
    await accessToken(SA, NOW + 3_550_000, doFetch as unknown as typeof fetch);
    expect(doFetch).toHaveBeenCalledTimes(2);
    const body = (doFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
  });

  it("fails loudly when Google refuses", async () => {
    const doFetch = vi.fn(async () => new Response("{}", { status: 400 }));
    await expect(accessToken(SA, NOW, doFetch as unknown as typeof fetch)).rejects.toMatchObject({ code: "token", status: 400 });
  });
});

describe("the request", () => {
  const q = (s: string) => parseGscQuery(new URLSearchParams(s), NOW);

  it("defaults to the 28 days ending two days ago, searches by page", () => {
    // 13 Nov noon, so the window ends 11 Nov and starts 27 days earlier.
    expect(q("")).toEqual({ startDate: "2026-10-15", endDate: "2026-11-11", dimensions: ["query", "page"], rowLimit: 5000, startRow: 0, page: undefined, query: undefined, country: undefined });
  });

  it("takes a window, an explicit range and filters", () => {
    expect(q("days=7&end=2026-11-01")).toMatchObject({ startDate: "2026-10-26", endDate: "2026-11-01" });
    expect(q("start=2026-10-01&end=2026-10-31&dimensions=query&page=/blog/monthiversary-ideas&country=USA")).toMatchObject({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      dimensions: ["query"],
      page: "/blog/monthiversary-ideas",
      country: "usa",
    });
  });

  it("refuses what Search Console wouldn't take", () => {
    for (const bad of ["days=0", "days=481", "end=2026-13-01", "end=2026-11-31", "start=2026-11-02&end=2026-11-01", "dimensions=keyword", "dimensions=", "limit=25001", "offset=-1", "country=us"]) {
      expect("error" in (q(bad) as object), bad).toBe(true);
    }
  });

  it("filters rows by page, search and country", () => {
    const body = gscRequestBody(q("page=/blog/&query=monthiversary&country=usa") as Exclude<ReturnType<typeof q>, { error: string }>);
    expect(body).toMatchObject({ type: "web", dataState: "all" });
    expect(body.dimensionFilterGroups?.[0]?.filters).toEqual([
      { dimension: "page", operator: "contains", expression: "/blog/" },
      { dimension: "query", operator: "contains", expression: "monthiversary" },
      { dimension: "country", operator: "equals", expression: "usa" },
    ]);
    expect(gscRequestBody(q("") as Exclude<ReturnType<typeof q>, { error: string }>)).not.toHaveProperty("dimensionFilterGroups");
  });
});

describe("GET /api/internal/gsc", () => {
  const call = async (headers: Record<string, string> = {}, search = "") => {
    const { GET } = await import("@/app/api/internal/gsc/route");
    return GET(new NextRequest(`https://tryethos.io/api/internal/gsc${search}`, { headers }));
  };

  beforeEach(() => resetTokenCache());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("answers nobody until the export key is set, and only the right key after", async () => {
    vi.stubEnv("GSC_EXPORT_KEY", "");
    expect((await call({ authorization: "Bearer anything" })).status).toBe(401);
    vi.stubEnv("GSC_EXPORT_KEY", "k-123");
    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer k-12" })).status).toBe(401);
    expect(bearerMatches("Bearer k-123", "k-123")).toBe(true);
  });

  it("says so when the service account isn't set up yet", async () => {
    vi.stubEnv("GSC_EXPORT_KEY", "k-123");
    vi.stubEnv("GSC_SERVICE_ACCOUNT_JSON", "");
    const res = await call({ authorization: "Bearer k-123" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_configured" });
  });

  it("returns Search Console's rows for the property, uncached", async () => {
    vi.stubEnv("GSC_EXPORT_KEY", "k-123");
    vi.stubEnv("GSC_SERVICE_ACCOUNT_JSON", KEY_FILE);
    const rows = [{ keys: ["monthiversary", "https://tryethos.io/blog/monthiversary-ideas"], clicks: 0, impressions: 33, ctr: 0, position: 8.2 }];
    const doFetch = vi.fn(async (url: string) =>
      url.includes("oauth2") ? new Response(JSON.stringify({ access_token: "t", expires_in: 3600 })) : new Response(JSON.stringify({ rows })),
    );
    vi.stubGlobal("fetch", doFetch);
    const res = await call({ authorization: "Bearer k-123" }, "?days=7");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ site: "sc-domain:tryethos.io", rowCount: 1, rows });
    expect(String(doFetch.mock.calls[1]?.[0])).toBe("https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Atryethos.io/searchAnalytics/query");
  });

  it("refuses a bad request before asking Google", async () => {
    vi.stubEnv("GSC_EXPORT_KEY", "k-123");
    vi.stubEnv("GSC_SERVICE_ACCOUNT_JSON", KEY_FILE);
    const doFetch = vi.fn();
    vi.stubGlobal("fetch", doFetch);
    expect((await call({ authorization: "Bearer k-123" }, "?dimensions=keyword")).status).toBe(400);
    expect(doFetch).not.toHaveBeenCalled();
  });
});
