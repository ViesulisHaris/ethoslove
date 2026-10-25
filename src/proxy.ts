import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import { visitorCurrency, type Currency } from "@/lib/pricing/products";

const handleI18n = createIntlMiddleware(routing);

/**
 * Every page lives under a hidden currency segment (src/app/[currency]/[locale]), built once per
 * currency, and this picks the copy for the visitor's country: /templates/bouquet in New York is
 * /usd/en/templates/bouquet inside, in Riga /eur/en/templates/bouquet. The address bar never shows
 * it. Whatever next-intl decided (a rewrite to /en/…, or the path as it came for /es/…) gets the
 * segment in front; its redirects go out as they are, and the request comes back through here.
 */
function inCurrency(request: NextRequest, response: NextResponse, currency: Currency): NextResponse {
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (rewrite) {
    const url = new URL(rewrite);
    url.pathname = `/${currency}${url.pathname}`;
    response.headers.set("x-middleware-rewrite", url.toString());
  } else if (response.headers.get("x-middleware-next")) {
    // A plain "carry on" (and the request headers next-intl set on it) becomes a rewrite to the
    // same path with the segment: NextResponse.rewrite is nothing more than this header.
    const url = request.nextUrl.clone();
    url.pathname = `/${currency}${url.pathname}`;
    response.headers.delete("x-middleware-next");
    response.headers.set("x-middleware-rewrite", url.toString());
  }
  return response;
}

/** Supabase auth codes are UUIDs; any other ?code= (a promo code in a link, say) is left alone. */
const AUTH_CODE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function unprefixedPathname(pathname: string): string {
  const parts = pathname.split("/");
  const maybeLocale = parts[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    const rest = `/${parts.slice(2).join("/")}`;
    return rest === "/" ? "/" : rest.replace(/\/$/, "") || "/";
  }
  return pathname;
}

function needsServerSession(pathname: string): boolean {
  const path = unprefixedPathname(pathname);
  return path.startsWith("/account") || path.startsWith("/dashboard") || path.startsWith("/my-dates") || path.startsWith("/create") || path.startsWith("/checkout");
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase sends OAuth / magic-link codes to the Site URL when the callback path is not
  // on its allow list. Catch a stray auth code anywhere and finish the exchange properly.
  if (AUTH_CODE.test(searchParams.get("code") ?? "") && !pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Gift links (/g/abc123) are shared across languages and printed on QR codes.
  // They must never redirect based on the viewer's browser language: rewrite them
  // to the default locale segment and let the page render in the sender's locale.
  const currency = visitorCurrency(request.headers);
  if (pathname === "/g" || pathname.startsWith("/g/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${currency}/${routing.defaultLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  const response = inCurrency(request, handleI18n(request), currency);
  return needsServerSession(pathname) ? refreshSupabaseSession(request, response) : response;
}

export const config = {
  // Skip API routes, auth callbacks, Next internals and any file with an extension.
  matcher: ["/((?!api|auth|_next|_vercel|monitoring|.*\\..*).*)"],
};
