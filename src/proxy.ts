import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

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
  return path.startsWith("/account") || path.startsWith("/dashboard") || path.startsWith("/create") || path.startsWith("/checkout");
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
  if (pathname === "/g" || pathname.startsWith("/g/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  const response = handleI18n(request);
  return needsServerSession(pathname) ? refreshSupabaseSession(request, response) : response;
}

export const config = {
  // Skip API routes, auth callbacks, Next internals and any file with an extension.
  matcher: ["/((?!api|auth|_next|_vercel|monitoring|.*\\..*).*)"],
};
