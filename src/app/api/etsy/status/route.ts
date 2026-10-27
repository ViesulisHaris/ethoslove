import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { etsyConfig } from "@/lib/etsy/api";
import { etsyHealth } from "@/lib/etsy/health";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * The Etsy chain's health, for the shop's owner: /api/etsy/status?key=<ETSY_CONNECT_SECRET>
 * (docs/marketing/ETSY.md). Without the key it only says which settings are missing, by name.
 */
export async function GET(request: NextRequest) {
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  const missing = [
    ...(process.env.ETSY_KEYSTRING ? [] : ["ETSY_KEYSTRING"]),
    ...(process.env.ETSY_SHARED_SECRET ? [] : ["ETSY_SHARED_SECRET"]),
    ...(process.env.ETSY_CONNECT_SECRET ? [] : ["ETSY_CONNECT_SECRET"]),
    ...(admin ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]),
  ];
  if (!config?.connectSecret || !admin) return NextResponse.json({ ok: false, missing }, { status: 503, headers: { "cache-control": "no-store" } });
  const given = Buffer.from(request.nextUrl.searchParams.get("key") ?? "");
  const expected = Buffer.from(config.connectSecret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const health = await etsyHealth(admin, config, { cronSecret: Boolean(process.env.CRON_SECRET) }, Date.now());
  return NextResponse.json(health, { status: health.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
