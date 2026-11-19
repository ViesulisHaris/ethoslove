import { NextResponse, type NextRequest } from "next/server";
import { PERSONAL_PRICE_COOKIE, readPersonalPrice } from "@/lib/commerce/personal-price";
import { REF_PATTERN } from "@/lib/attribution/ref";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * GET /api/offer/open?t=<token>&l=es&r=<ref>: the button in an offer email. It keeps the personal
 * price in a cookie until the link ends (lib/commerce/personal-price.ts) and opens the gallery, where
 * the pay sheet shows it on any gift. Nothing is spent here: a mail app or a scanner that opens the
 * link first only sets a cookie on its own side. A link that has ended, or isn't ours, still opens
 * the gallery, at the usual prices.
 *
 * `r` is the email's ref (?ref=), so its sales are counted to it like any link's.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const lang = url.searchParams.get("l") === "es" ? "/es" : "";
  const ref = url.searchParams.get("r")?.trim().toLowerCase();
  const target = new URL(`${lang}/templates`, url.origin);
  if (ref && REF_PATTERN.test(ref)) target.searchParams.set("ref", ref);
  const response = NextResponse.redirect(target);
  const token = url.searchParams.get("t");
  const price = await readPersonalPrice(token);
  if (price && token) {
    response.cookies.set(PERSONAL_PRICE_COOKIE, token, {
      path: "/",
      expires: new Date(price.endsAt),
      sameSite: "lax",
      secure: url.protocol === "https:",
      // Readable by the page: it only tells the pay sheet there is a price to ask about (GET /api/offer).
      // The signature is checked on the server every time; the cookie gives the page nothing to change.
      httpOnly: false,
    });
  }
  return response;
}
