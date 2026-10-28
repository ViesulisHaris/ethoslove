import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/commerce/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ETSY_OAUTH_COOKIE, EtsyError, etsyConfig, exchangeCode, ownedShopId, saveConnection } from "@/lib/etsy/api";

export const runtime = "nodejs";

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function page(status: number, text: string) {
  const res = new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Etsy</title><p style="font:16px/1.5 system-ui;margin:2rem">${escapeHtml(text)}</p>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
  res.cookies.set(ETSY_OAUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/api/etsy", maxAge: 0 });
  return res;
}

/**
 * Where Etsy sends the shop's owner back (the app's callback URL): the code is swapped for the
 * shop's tokens, kept with the shop that Etsy account owns. Only someone holding ETSY_CONNECT_SECRET
 * gets here, and with ETSY_SHOP_ID set, only that shop's owner can be connected.
 */
export async function GET(request: NextRequest) {
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) return page(503, "Etsy isn't set up on this server yet.");
  const params = request.nextUrl.searchParams;
  const [state, verifier] = (request.cookies.get(ETSY_OAUTH_COOKIE)?.value ?? "").split(".");
  const given = params.get("state") ?? "";
  const code = params.get("code");
  if (!state || !verifier || !code || given.length !== state.length || !timingSafeEqual(Buffer.from(given), Buffer.from(state)))
    return page(400, "This sign-in didn't come from our connect link, or it took longer than 10 minutes. Open the connect link again.");

  try {
    const tokens = await exchangeCode(config, { code, verifier, redirectUri: `${siteOrigin()}/api/etsy/callback` });
    const shopId = await ownedShopId(config, tokens.access_token);
    if (shopId === null || (config.shopId !== null && shopId !== config.shopId))
      return page(403, "That Etsy account doesn't own our shop. Sign in to Etsy as the shop's owner and open the connect link again.");
    const saved = await saveConnection(admin, shopId, tokens, Date.now());
    if (saved.error) return page(500, "Etsy said yes, but saving the connection failed. Try the connect link again.");
  } catch (e) {
    const err = e instanceof EtsyError ? e : null;
    console.error("[etsy] connect failed", err?.code ?? "unknown", err?.detail ?? "");
    return page(502, `Etsy didn't accept the sign-in${err?.detail ? `. Etsy said: "${err.detail}"` : ""}. Open the connect link again.`);
  }
  return page(200, "Etsy is connected. Orders typed on the site are now checked with Etsy. You can close this tab.");
}
