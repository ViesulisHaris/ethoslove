import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { INVITE_CODE_PATTERN } from "@/lib/commerce/codes";
import { iso } from "@/lib/commerce/db";
import { joinPass, type JoinResult } from "@/lib/commerce/passes";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ code: z.string().trim().toLowerCase().regex(INVITE_CODE_PATTERN) });

const STATUS: Record<Extract<JoinResult, { ok: false }>["error"], number> = {
  not_found: 404,
  expired: 410,
  own_pass: 409,
  has_own: 409,
  taken: 409,
  failed: 500,
};

/**
 * The partner joins the owner's Ethos for Two with the invite code (signed in, not the owner, the
 * membership running, the place empty, no membership of their own) and gets everything it covers
 * while it runs. `endsAt` is when it ends, or null while it renews by itself (`renews`).
 * → { ok: true, endsAt: string | null, renews: boolean } | { error: "unauthenticated" | "rate_limited" | "invalid_input" | "not_found" | "expired" | "own_pass" | "has_own" | "taken" | "failed" }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const allowed =
    (await rateLimit(`pass-join:${user.id}`, { limit: 10, windowSeconds: 3600 })) &&
    (await rateLimit(`pass-join-ip:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 3600 }));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const result = await joinPass(admin, { code: parsed.data.code, userId: user.id, now: Date.now() });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] });
  return NextResponse.json({ ok: true, endsAt: result.renews ? null : iso(result.paidUntil), renews: result.renews });
}
