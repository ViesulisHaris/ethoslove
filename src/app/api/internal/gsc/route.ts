import { NextResponse, type NextRequest } from "next/server";
import { GscError, accessToken, bearerMatches, parseGscQuery, parseServiceAccount, searchAnalytics } from "@/lib/gsc/search-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Search Console rows for the cloud SEO routines (docs/blog/SEO-DATA.md): GET with
 * `Authorization: Bearer <GSC_EXPORT_KEY>`, which the routines' cloud environment adds for
 * tryethos.io as a network secret. Read-only; nothing is stored. Parameters: lib/gsc/search-console.ts.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured key nobody can read it.
  const key = process.env.GSC_EXPORT_KEY;
  if (!key || !bearerMatches(request.headers.get("authorization"), key)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sa = parseServiceAccount(process.env.GSC_SERVICE_ACCOUNT_JSON);
  if (!sa) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const q = parseGscQuery(new URL(request.url).searchParams);
  if ("error" in q) return NextResponse.json(q, { status: 400 });
  const site = process.env.GSC_SITE || "sc-domain:tryethos.io";
  try {
    const rows = await searchAnalytics(site, q, await accessToken(sa));
    return NextResponse.json({ site, ...q, rowCount: rows.length, rows }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof GscError) {
      console.error("[gsc]", e.message);
      return NextResponse.json({ error: e.code, status: e.status }, { status: 502 });
    }
    throw e;
  }
}
