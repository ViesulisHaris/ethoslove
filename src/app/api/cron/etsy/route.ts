import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { etsyConfig, fetchReceipt } from "@/lib/etsy/api";
import { reconcileEtsyRefunds } from "@/lib/etsy/refunds";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily: Etsy orders that were cancelled or refunded after their template was handed over give it
 * back (lib/etsy/refunds.ts). Etsy sends us nothing when that happens, so we ask.
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) return NextResponse.json({ skipped: "not_configured" });

  const now = Date.now();
  const result = await reconcileEtsyRefunds(admin, (receiptId) => fetchReceipt(admin, config, receiptId, now), now);
  return NextResponse.json(result);
}
