import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { env, isConfigured } from "@/lib/env";
import { isFreshToken } from "@/lib/auth/bearer";
import { getCurrentUser } from "@/lib/auth/get-user";
import { bearerToken } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { collectingClient, webSessionCookies } from "@/lib/app/web-session";
import { NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/app/web-session (Bearer only): a separate Supabase session for the app's web view, as
 * cookies for the app to install (lib/app/web-session.ts). The access token must be minutes old
 * (the app refreshes it right before), so a leaked one can't be turned into a long-lived session.
 */
export async function POST() {
  const token = await bearerToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  if (!isFreshToken(token, Date.now())) return NextResponse.json({ error: "stale_token" }, { status: 401, headers: NO_STORE });
  if (!(await rateLimit(`app-web-session:${user.id}`, { limit: 10, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  if (!user.email) return NextResponse.json({ error: "no_email" }, { status: 409, headers: NO_STORE });
  const admin = getSupabaseAdminClient();
  if (!admin || !isConfigured.supabase) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const result = await webSessionCookies(admin, { id: user.id, email: user.email }, collectingClient(env.supabaseUrl!, env.supabaseAnonKey!));
  if (!result.ok) {
    console.error("[app] web session not made", user.id, result.error);
    return NextResponse.json({ error: result.error }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ userId: user.id, cookies: result.cookies }, { headers: NO_STORE });
}
