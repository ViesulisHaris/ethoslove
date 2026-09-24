import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { currencyFor } from "@/lib/pricing/products";
import { readEntitlements } from "@/lib/commerce/entitlements";
import { applyCredit, isTransactionId, pullAppStore } from "@/lib/commerce/app-store";
import { appLocale, NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 20;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS = { invalid_input: 400, wrong_tier: 400, not_found: 404, already_applied: 409, already_owned: 409, failed: 500 } as const;

/**
 * POST /api/app/credits/apply { templateSlug, transactionId | purchaseId }: spends a template credit
 * bought in the app on one template (lib/commerce/app-store.ts applyCredit), then says what the
 * account owns. A credit RevenueCat hasn't told us about yet is asked for once before "not found".
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  if (!(await rateLimit(`app-credits:${user.id}`, { limit: 20, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  let body: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400, headers: NO_STORE });
  }
  const { templateSlug, transactionId, purchaseId } = body;
  const byTransaction = transactionId !== undefined && transactionId !== null;
  const byPurchase = purchaseId !== undefined && purchaseId !== null;
  if (typeof templateSlug !== "string" || templateSlug.length > 80 || !SLUG.test(templateSlug) || byTransaction === byPurchase || (byTransaction && !isTransactionId(transactionId)) || (byPurchase && (typeof purchaseId !== "string" || !UUID.test(purchaseId))))
    return NextResponse.json({ error: "invalid_input" }, { status: 400, headers: NO_STORE });
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const now = Date.now();
  const secret = env.revenueCatSecretKey;
  const result = await applyCredit(db, user.id, { templateSlug, ...(byTransaction ? { transactionId: transactionId as string } : { purchaseId: purchaseId as string }) }, {
    pull: secret && byTransaction ? async () => void (await pullAppStore(db, user.id, secret, now)) : null,
  });
  if (!result.ok) return NextResponse.json(result.error === "already_applied" ? { error: result.error, appliedTo: result.appliedTo } : { error: result.error }, { status: STATUS[result.error], headers: NO_STORE });

  const locale = appLocale(request.nextUrl.searchParams);
  const entitlements = await readEntitlements(db, user.id, { locale, currency: currencyFor(locale === "es" ? "ES" : "US"), now });
  return NextResponse.json({ ok: true, entitlements }, { headers: NO_STORE });
}
