import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { EtsyError, etsyConfig, fetchReceipt, keepConnected } from "@/lib/etsy/api";
import { reconcileEtsyRefunds } from "@/lib/etsy/refunds";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily: Etsy orders that were cancelled or refunded after their template was handed over give it
 * back (lib/etsy/refunds.ts). Etsy sends us nothing when that happens, so we ask. It also keeps the
 * shop signed in to Etsy through weeks without orders (keepConnected).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) return NextResponse.json({ skipped: "not_configured" });

  const now = Date.now();
  let connection = "ok";
  try {
    await keepConnected(admin, config, now);
  } catch (e) {
    connection = e instanceof EtsyError ? e.code : "unavailable";
    // not_connected or unauthorized: the owner opens the connect link again (docs/marketing/ETSY.md).
    console.error("[etsy] the shop's Etsy sign-in failed", connection);
  }
  const result = await reconcileEtsyRefunds(admin, (receiptId) => fetchReceipt(admin, config, receiptId, now), now);
  return NextResponse.json({ ...result, connection });
}
