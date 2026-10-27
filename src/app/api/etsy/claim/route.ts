import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyWelcome } from "@/lib/email/notify";
import { safeReturnPath } from "@/components/pricing/offers";
import { RETURN_PATH } from "@/lib/stripe/line-items";
import { accountCreatedByCheckout, findOrCreateUser } from "@/lib/stripe/fulfil";
import { isFresh } from "@/lib/commerce/after-checkout";
import type { Db } from "@/lib/commerce/db";
import { EtsyError, etsyConfig, fetchReceipt } from "@/lib/etsy/api";
import { claimable, etsyOrderNumber } from "@/lib/etsy/receipt";
import { claimEtsyItem } from "@/lib/etsy/claim";
import { isTemplateSlug } from "@/templates/manifests";

export const runtime = "nodejs";
export const maxDuration = 15;

const input = z.object({
  order: z.string().max(40),
  slug: z.string().max(80),
  // Only without an account: where the template goes, and the account it makes if there is none.
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  returnTo: z.string().max(1000).regex(RETURN_PATH).optional(),
  locale: z.enum(["en", "es"]).optional(),
});

/**
 * "Bought on Etsy": hands over the template an Etsy order paid for (docs/marketing/ETSY.md). The
 * order is read from Etsy on every request, so the only thing the browser decides is which order to
 * ask about: whether it is paid, refunded, and for which template is Etsy's answer, never the
 * page's. Each item of an order is handed over once (lib/etsy/claim.ts).
 *
 * Signed in: the template goes to that account. Otherwise to the account of the email given,
 * made if there is none; like a guest's Stripe checkout, this browser is signed in only to an
 * account this order just made, and an existing account's owner signs in as usual.
 * → { ok: true, signInUrl? , signIn? } | { error, templates? }
 */
export async function POST(request: NextRequest) {
  const config = etsyConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  const receiptId = parsed.success ? etsyOrderNumber(parsed.data.order) : null;
  if (!parsed.success || !receiptId || !isTemplateSlug(parsed.data.slug)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const body = parsed.data;
  // Order numbers are long, but guessing one is still the attack to slow down: per address, per order.
  const allowed =
    (await rateLimit(`etsy-claim-ip:${clientIp(request.headers)}`, { limit: 12, windowSeconds: 3600 })) &&
    (await rateLimit(`etsy-claim-order:${receiptId}`, { limit: 8, windowSeconds: 3600 }));
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const user = await getCurrentUser();
  if (!user && !body.email) return NextResponse.json({ error: "email_required" }, { status: 400 });

  const now = Date.now();
  let receipt;
  try {
    receipt = await fetchReceipt(admin, config, receiptId, now);
  } catch (e) {
    const code = e instanceof EtsyError ? e.code : "unavailable";
    console.error("[etsy] order read failed", code);
    return NextResponse.json({ error: "etsy_unavailable" }, { status: 502 });
  }
  if (!receipt) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  const verdict = claimable(receipt, body.slug);
  if (!verdict.ok)
    return verdict.error === "other_template"
      ? NextResponse.json({ error: "other_template", templates: verdict.templates }, { status: 409 })
      : NextResponse.json({ error: verdict.error }, { status: verdict.error === "refunded" ? 410 : 402 });

  const locale = body.locale ?? "en";
  // The marker an account made here carries: the first item, so a retry of the same order may sign
  // the same browser in again, and nothing else ever can (accountCreatedByCheckout).
  const marker = `etsy:${verdict.units[0].key}`;
  let userId: string;
  let created = false;
  if (user) userId = user.id;
  else {
    try {
      ({ userId, created } = await findOrCreateUser(admin, body.email!, locale, marker));
    } catch {
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
  }

  const claim = await claimEtsyItem(admin, { userId, slug: body.slug, units: verdict.units });
  if (!claim.ok) return NextResponse.json({ error: claim.error === "used" ? "order_used" : "failed" }, { status: claim.error === "used" ? 409 : 500 });
  if (user) return NextResponse.json({ ok: true });

  if (created) void notifyWelcome(body.email!, locale).catch(() => {});
  const next = safeReturnPath(body.returnTo ?? null, `/create/${body.slug}?resume=publish`);
  // Asking again (a lost tab, a second tap) signs in again only while the claim is fresh, as the
  // success page does for a Stripe session (lib/commerce/after-checkout.ts isFresh).
  if (created || (claim.again && (await claimedRecently(admin, claim.purchaseId, now)) && (await accountCreatedByCheckout(userId, marker)))) {
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: body.email! });
    const hash = link?.properties?.hashed_token;
    if (hash) return NextResponse.json({ ok: true, signInUrl: `/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=magiclink&next=${encodeURIComponent(next)}` });
  }
  // The template is on that account now; its owner signs in to send the gift.
  return NextResponse.json({ ok: true, signIn: true });
}

async function claimedRecently(admin: Db, purchaseId: string, at: number): Promise<boolean> {
  const { data } = await admin.from("purchases").select("created_at").eq("id", purchaseId).maybeSingle();
  return Boolean(data && isFresh(Date.parse(data.created_at) / 1000, at));
}
