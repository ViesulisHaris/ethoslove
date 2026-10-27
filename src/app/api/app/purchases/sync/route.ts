import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { visitorCurrency } from "@/lib/pricing/products";
import { readEntitlements } from "@/lib/commerce/entitlements";
import { pullAppStore, unusedCredits } from "@/lib/commerce/app-store";
import { appLocale, NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * POST /api/app/purchases/sync { pull?: boolean }: after a purchase or a restore in the app, what the
 * account owns now, and the template credits not spent yet. With `pull` (the default) RevenueCat is
 * asked first and anything it knows about that the webhook hasn't delivered is recorded; `pull:
 * false` only reads (launch, sign-in, coming back to the app). lib/commerce/app-store.ts.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  if (!(await rateLimit(`app-purchases:${user.id}`, { limit: 20, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  let body: unknown = {};
  try {
    const raw = await request.text();
    body = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400, headers: NO_STORE });
  }
  const pull = !(body && typeof body === "object" && (body as { pull?: unknown }).pull === false);
  const db = getSupabaseAdminClient();
  if (!db || (pull && !env.revenueCatSecretKey)) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const now = Date.now();
  if (pull) {
    const pulled = await pullAppStore(db, user.id, env.revenueCatSecretKey!, now);
    if (!pulled.ok) return NextResponse.json({ error: pulled.error === "upstream" ? "upstream" : "failed" }, { status: pulled.error === "upstream" ? 502 : 500, headers: NO_STORE });
  }
  const locale = appLocale(request.nextUrl.searchParams);
  const [entitlements, credits] = await Promise.all([
    readEntitlements(db, user.id, { locale, currency: visitorCurrency(request.headers), now }),
    unusedCredits(db, user.id),
  ]);
  return NextResponse.json({ entitlements, credits }, { headers: NO_STORE });
}
