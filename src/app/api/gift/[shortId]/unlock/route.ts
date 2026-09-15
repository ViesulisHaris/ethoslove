import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fetchPublicGift, passwordCookieName } from "@/lib/gift/public";
import { seal } from "@/lib/crypto";
import { isShortId } from "@/lib/gift/short-id";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 5;

const input = z.object({ password: z.string().min(1).max(64) });

/** Verifies a gift password and stores it (encrypted) in an HttpOnly cookie for this gift. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gift/[shortId]/unlock">) {
  const { shortId } = await ctx.params;
  if (!isShortId(shortId)) return NextResponse.json({ ok: false }, { status: 404 });
  const ip = clientIp(request.headers);
  if (!(await rateLimit(`unlock:${ip}:${shortId}`, { limit: 10, windowSeconds: 600 }))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const gift = await fetchPublicGift(shortId, parsed.data.password);
  if (!gift) return NextResponse.json({ ok: false }, { status: 404 });
  if (!gift.passwordOk) return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(passwordCookieName(shortId), await seal(parsed.data.password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/g/${shortId}`,
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
