import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import { visitorCurrency, type Currency } from "@/lib/pricing/products";
import { forwardedActionPath, isServerActionPost } from "@/lib/server-action-forwarding";
import { ASKED_PATH_HEADER, isBehindWall } from "@/lib/auth/sign-in-wall";

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

/**
 * Pages whose shared links carry a link preview in their query (lib/share/links.ts: `c`, the cover,
 * and `t`, the title). The page itself reads no query, so its title, canonical and hreflang are in
 * the <head> of the HTML for every reader; a link with a preview is served by the page's `shared`
 * twin, which reads it (reports/seoaudit-audit.md, M2: tags that await the query are streamed into
 * the body for every reader but the bots in next.config.ts's htmlLimitedBots).
 */
const SHARED_PREVIEW_PAGES = new Set(["/dates", "/plan"]);

function toSharedPreview(request: NextRequest, response: NextResponse): NextResponse {
  const { searchParams } = request.nextUrl;
  if (!SHARED_PREVIEW_PAGES.has(unprefixedPathname(request.nextUrl.pathname)) || !(searchParams.get("c") || searchParams.get("t"))) return response;
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) return response;
  const url = new URL(rewrite);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/shared`;
  response.headers.set("x-middleware-rewrite", url.toString());
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
  const currency = visitorCurrency(request.headers);

  // A Server Action Next passes on from a page that doesn't have it to the page that does: served
  // from that page's code, not the not-found catch-all (src/lib/server-action-forwarding.ts).
  const forwarded = forwardedActionPath(request, currency, routing.defaultLocale);
  if (forwarded) {
    const url = request.nextUrl.clone();
    url.pathname = forwarded;
    return NextResponse.rewrite(url);
  }

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
  // A group card's link (/c/<token>) is the same: one address for everyone invited, whatever their
  // phone's language, shown in the card's own language and never redirected.
  if (pathname === "/g" || pathname.startsWith("/g/") || pathname === "/c" || pathname.startsWith("/c/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${currency}/${routing.defaultLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // The app's sign-in wall is a layout, which is not told its path: hand it over, so /login gets a
  // `next` (src/lib/auth/sign-in-wall.ts). next-intl passes the request's headers on to the page.
  const path = unprefixedPathname(pathname);
  if (isBehindWall(path)) request.headers.set(ASKED_PATH_HEADER, `${path}${request.nextUrl.search}`);
  else request.headers.delete(ASKED_PATH_HEADER);

  const response = toSharedPreview(request, inCurrency(request, handleI18n(request), currency));
  return needsServerSession(pathname) || isServerActionPost(request) ? refreshSupabaseSession(request, response) : response;
}

export const config = {
  // Skip API routes, auth callbacks, Next internals and any file with an extension.
  matcher: ["/((?!api|auth|_next|_vercel|monitoring|.*\\..*).*)"],
};
