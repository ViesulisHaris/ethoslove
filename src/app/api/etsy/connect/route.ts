import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/commerce/db";
import { ETSY_OAUTH_COOKIE, etsyAuthorizeUrl, etsyConfig, pkcePair } from "@/lib/etsy/api";

export const runtime = "nodejs";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Starts the shop's one-time Etsy sign-in (docs/marketing/ETSY.md, step 5): opened by the shop's
 * owner as /api/etsy/connect?key=<ETSY_CONNECT_SECRET>, it sends them to Etsy to allow reading the
 * shop's orders. The PKCE verifier and the state ride in a short-lived cookie to /api/etsy/callback.
 */
export async function GET(request: NextRequest) {
  const config = etsyConfig();
  if (!config?.connectSecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!sameSecret(request.nextUrl.searchParams.get("key") ?? "", config.connectSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { verifier, challenge } = pkcePair();
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(etsyAuthorizeUrl(config, { redirectUri: `${siteOrigin()}/api/etsy/callback`, state, challenge }));
  res.cookies.set(ETSY_OAUTH_COOKIE, `${state}.${verifier}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/etsy", maxAge: 600 });
  return res;
}
