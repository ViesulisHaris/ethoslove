import { NextResponse, type NextRequest } from "next/server";
import { bearerMatches } from "@/lib/gsc/search-console";
import { ReportError, salesReport } from "@/lib/attribution/report";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Website sales of the last 7 and 28 days by channel, landing page and source, for the cloud SEO
 * routines (docs/blog/SEO-DATA.md): GET with `Authorization: Bearer <GSC_EXPORT_KEY>`, the key their
 * cloud environment already adds for tryethos.io. Counts and sums only (lib/attribution/report.ts);
 * read-only, nothing stored.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured key nobody can read it.
  const key = process.env.GSC_EXPORT_KEY;
  if (!key || !bearerMatches(request.headers.get("authorization"), key)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    return NextResponse.json(await salesReport(admin, Date.now()), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof ReportError) {
      console.error("[sales]", e.message);
      return NextResponse.json({ error: "not_ready" }, { status: 503 });
    }
    throw e;
  }
}
