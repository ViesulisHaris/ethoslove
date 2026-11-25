import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { REPLY_TOKEN_PATTERN, readReplyToken } from "@/lib/commerce/reply-token";
import { linkSecret } from "@/lib/lifecycle/links";
import { firstOpenOf } from "@/lib/gift/first-open";
import { openedWithin7 } from "@/lib/attribution/recipient-started";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 5;

const NO_STORE = { "cache-control": "private, no-store" };
const input = z.object({ reply: z.string().regex(REPLY_TOKEN_PATTERN) });

/**
 * For the count of recipients who start a gift of their own (docs/marketing/LOOP-KPI.md): given the
 * sealed token a paid gift's "Send one back" carries, whether that gift was first opened within
 * seven days. One yes or no comes back, or null when the token isn't ours or nothing can be read.
 * Nothing is written, nobody is signed in, and the answer names no gift.
 */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`loop-started:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 600 })))
    return NextResponse.json({ within7: null }, { status: 429, headers: NO_STORE });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ within7: null }, { status: 400, headers: NO_STORE });
  const secret = linkSecret();
  const admin = getSupabaseAdminClient();
  const claim = secret ? readReplyToken(parsed.data.reply, secret) : null;
  if (!claim || !admin) return NextResponse.json({ within7: null }, { headers: NO_STORE });
  return NextResponse.json({ within7: openedWithin7(await firstOpenOf(admin, claim.giftId), Date.now()) }, { headers: NO_STORE });
}
