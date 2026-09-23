import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normaliseGiftCardCode } from "@/lib/commerce/codes";
import { redeemGiftCard, type RedeemError } from "@/lib/commerce/gift-cards";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ code: z.string().max(40) });

const STATUS: Record<RedeemError, number> = {
  not_found: 404,
  voided: 410,
  expired: 410,
  already_redeemed: 409,
  already_owned: 409,
  failed: 500,
};

/**
 * Redeems a "Give Everything" gift card for the signed-in visitor: Everything, forever. Single use.
 * Rate limited per person and per address, which is what keeps codes from being guessed.
 * → { ok: true } | { error: "unauthenticated" | "rate_limited" | "invalid_input" | RedeemError }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const allowed =
    (await rateLimit(`giftcard-redeem:${user.id}`, { limit: 10, windowSeconds: 3600 })) &&
    (await rateLimit(`giftcard-redeem-ip:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 3600 }));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  const code = parsed.success ? normaliseGiftCardCode(parsed.data.code) : null;
  if (!code) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const result = await redeemGiftCard(admin, { code, userId: user.id, now: Date.now() });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] });
  return NextResponse.json({ ok: true });
}
