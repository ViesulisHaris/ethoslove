import { NextResponse, type NextRequest } from "next/server";
import { PERSONAL_PRICE_COOKIE, activePersonalPrice } from "@/lib/commerce/personal-price";
import { PERSONAL_PRICE, personalPriceAmounts } from "@/lib/pricing/products";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/offer: whether this browser holds a personal price that still works, for the pay sheet
 * and the notice at the top of the site. Asked only by a page that sees the cookie
 * (components/pricing/use-personal-price.ts). The answer is about the cookie, never about who is
 * signed in, and says nothing beyond the price and when it ends.
 */
export async function GET(request: NextRequest) {
  const none = NextResponse.json({ active: false }, { headers: { "cache-control": "no-store" } });
  const token = request.cookies.get(PERSONAL_PRICE_COOKIE)?.value;
  if (!token) return none;
  if (!(await rateLimit(`offer:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 600 }))) return none;
  const price = await activePersonalPrice(token);
  if (!price) {
    // Ended or spent: the cookie has nothing left to say.
    none.cookies.delete(PERSONAL_PRICE_COOKIE);
    return none;
  }
  // An offer email's answer is word for word what it was before the monthly idea (one amount per
  // currency), so a page loaded before a deploy reads it as it always did. Only the monthly idea's
  // price, which exists only while that setting is on, says its kind and an amount per product.
  return NextResponse.json(
    price.kind === "monthly"
      ? { active: true, kind: "monthly", endsAt: price.endsAt, amounts: personalPriceAmounts("monthly"), onto: PERSONAL_PRICE.onto }
      : { active: true, endsAt: price.endsAt, amounts: PERSONAL_PRICE.amounts, onto: PERSONAL_PRICE.onto },
    { headers: { "cache-control": "no-store" } },
  );
}
