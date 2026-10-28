import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { EtsyError, etsyConfig, fetchReceipt } from "@/lib/etsy/api";
import { etsyOrderNumber, orderTemplates } from "@/lib/etsy/receipt";

export const runtime = "nodejs";
export const maxDuration = 15;

const input = z.object({ order: z.string().max(40) });

/**
 * "Bought on Etsy?" (/etsy): which gift an order is for, from its number alone, so a buyer needs
 * nothing but the order number in Etsy's email to start (no PDF, no Etsy sign-in). It hands nothing
 * over: the gift's own "Bought on Etsy" box claims the order when they send it (api/etsy/claim).
 * → { templates } | { error }
 */
export async function POST(request: NextRequest) {
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  const receiptId = parsed.success ? etsyOrderNumber(parsed.data.order) : null;
  if (!receiptId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  // Guessing order numbers is the attack to slow down, as on the claim: per address, per order.
  const allowed =
    (await rateLimit(`etsy-find-ip:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 3600 })) &&
    (await rateLimit(`etsy-find-order:${receiptId}`, { limit: 10, windowSeconds: 3600 }));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let receipt;
  try {
    receipt = await fetchReceipt(admin, config, receiptId, Date.now());
  } catch (e) {
    console.error("[etsy] order read failed", e instanceof EtsyError ? e.code : "unavailable");
    return NextResponse.json({ error: "etsy_unavailable" }, { status: 502 });
  }
  if (!receipt) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  const found = orderTemplates(receipt);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.error === "refunded" ? 410 : 402 });
  // An order of our shop with no gift in it (a listing without its SKU) is no order of a gift.
  if (found.templates.length === 0) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  return NextResponse.json({ templates: found.templates });
}
