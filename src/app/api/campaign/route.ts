import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { campaignStatusOf, grantCampaign, isCampaignPassword } from "@/lib/commerce/campaign";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ password: z.string().max(100) });

/**
 * The creator campaign's secret page (lib/commerce/campaign-rules.ts).
 * GET → { signedIn, campaign: CampaignStatus | null }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ signedIn: false, campaign: null });
  return NextResponse.json({ signedIn: true, campaign: campaignStatusOf(user, Date.now()) });
}

/**
 * The password, for the signed-in visitor: starts their campaign window, once. Rate limited per
 * person and per address so the password can't be guessed, and new windows are capped per address
 * too, so one person can't open account after account from the same place.
 * → { ok: true, campaign } | { error: "unauthenticated" | "rate_limited" | "invalid_input" | "wrong_password" | "too_many_accounts" | "failed" }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ip = clientIp(request.headers);
  const allowed =
    (await rateLimit(`campaign-password:${user.id}`, { limit: 8, windowSeconds: 3600 })) &&
    (await rateLimit(`campaign-password-ip:${ip}`, { limit: 20, windowSeconds: 3600 }));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!isCampaignPassword(parsed.data.password)) return NextResponse.json({ error: "wrong_password" }, { status: 403 });

  const now = Date.now();
  const existing = campaignStatusOf(user, now);
  if (existing) return NextResponse.json({ ok: true, campaign: existing });

  // Three new windows a week from one address: a household or a dorm, not a farm of fresh accounts.
  if (!(await rateLimit(`campaign-grant-ip:${ip}`, { limit: 3, windowSeconds: 7 * 86_400 }))) {
    return NextResponse.json({ error: "too_many_accounts" }, { status: 429 });
  }
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const granted = await grantCampaign(admin, user, now);
  if ("error" in granted) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true, campaign: campaignStatusOf({ app_metadata: { ...user.app_metadata, campaign: granted.grant } }, now) });
}
