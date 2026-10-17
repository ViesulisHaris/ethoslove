import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listMyGifts } from "@/lib/gift/dashboard";
import { siteOrigin } from "@/lib/commerce/db";
import { appGift, type AppGift } from "@/lib/app/gifts";
import { NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 10;

/** GET /api/app/gifts: the signed-in user's gifts for "My gifts" in the app (lib/app/gifts.ts). Bearer or cookie session. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  if (!(await rateLimit(`app-gifts:${user.id}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  const origin = siteOrigin();
  const gifts = (await listMyGifts(user.id)).map((gift) => appGift(gift, origin)).filter((gift): gift is AppGift => gift !== null);
  return NextResponse.json({ gifts }, { headers: NO_STORE });
}
