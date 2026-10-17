import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isFreshToken } from "@/lib/auth/bearer";
import { deleteAccountData } from "@/lib/auth/delete-account";
import { getCurrentUser } from "@/lib/auth/get-user";
import { bearerToken } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/app/account/delete (Bearer only): deletes the signed-in account and everything under it,
 * as the account page does (lib/auth/delete-account.ts). Like the web session, it needs a token
 * issued in the last ten minutes: the app refreshes its session first, so a leaked token can't.
 */
export async function POST() {
  const token = await bearerToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  if (!isFreshToken(token, Date.now())) return NextResponse.json({ error: "stale_token" }, { status: 401, headers: NO_STORE });
  if (!(await rateLimit(`app-account-delete:${user.id}`, { limit: 5, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 500, headers: NO_STORE });

  const deleted = await deleteAccountData(admin, user.id);
  if (!deleted.ok) {
    console.error("[app] account not deleted", user.id, deleted.error);
    return NextResponse.json({ error: deleted.error }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
