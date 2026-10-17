import { NextResponse, type NextRequest } from "next/server";
import { CHARGED_CURRENCIES, type Currency } from "@/lib/pricing/products";
import { getCurrentUser } from "@/lib/auth/get-user";
import { upgradeQuoteForUser } from "./quote";

export const runtime = "nodejs";
export const maxDuration = 10;

const NO_STORE = { "cache-control": "private, no-store" };

/**
 * GET /api/money/upgrade?currency=eur → { amount, currency } | { amount: null }. What the publish
 * sheet's "Everything for the difference" row and the pricing page's Everything card show. Checkout
 * works the price out again when the upgrade is bought; this only lets the page say it first. The
 * pricing page asks on every visit, so a guest is an ordinary "nothing to upgrade", not a 401 in
 * every visitor's console.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ amount: null }, { headers: NO_STORE });
  const asked = request.nextUrl.searchParams.get("currency");
  const currency: Currency = CHARGED_CURRENCIES.find((c) => c === asked) ?? CHARGED_CURRENCIES[0];
  const quote = await upgradeQuoteForUser(user.id, currency);
  return NextResponse.json(quote ?? { amount: null }, { headers: NO_STORE });
}
