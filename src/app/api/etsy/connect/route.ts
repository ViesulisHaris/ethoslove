import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/commerce/db";
import { ETSY_OAUTH_COOKIE, etsyAuthorizeUrl, etsyConfig, keysAccepted, pkcePair } from "@/lib/etsy/api";

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
  // A wrong keystring or shared secret would only show up after the Etsy sign-in, as a refusal.
  const keys = await keysAccepted(config);
  if (!keys.ok) {
    console.error("[etsy] keys refused", keys.detail);
    return NextResponse.json(
      { error: "keys_refused", etsy: keys.detail, fix: "Paste ETSY_KEYSTRING and ETSY_SHARED_SECRET again in Vercel (reveal the shared secret with the eye before copying it), redeploy, then open this link again." },
      { status: 502 },
    );
  }

  const { verifier, challenge } = pkcePair();
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(etsyAuthorizeUrl(config, { redirectUri: `${siteOrigin()}/api/etsy/callback`, state, challenge }));
  res.cookies.set(ETSY_OAUTH_COOKIE, `${state}.${verifier}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/etsy", maxAge: 600 });
  return res;
}
