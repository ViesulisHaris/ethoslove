import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SITE } from "@/config/site";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { PRODUCTS, currencyFor, isProductId, type Currency } from "@/lib/pricing/products";
import { getStripe, resolvePriceId } from "@/lib/stripe/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { TEMPLATE_SLUGS } from "@/templates/registry";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({
  product: z.string(),
  templateSlugs: z.array(z.string()).default([]),
  returnTo: z.string().startsWith("/").optional(),
  currency: z.enum(["usd", "eur", "gbp"]).optional(),
  locale: z.enum(["en", "es"]).optional(),
  // Where the buyer came from (lib/attribution/ref.ts). A malformed one is dropped, never an error.
  ref: z.string().trim().toLowerCase().regex(REF_PATTERN).optional().catch(undefined),
});

/**
 * Creates a Stripe Checkout Session and returns its URL. Signed-in users get a pending
 * purchase row up front; guests pay first, and fulfilment creates their account from the
 * email Stripe collects (see lib/stripe/fulfil.ts), so nobody has to sign in before paying.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  // Purchases are written with the service role: users can only read their own rows (RLS),
  // and the amount/currency must come from the server, never the client.
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isProductId(parsed.data.product))
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { product, returnTo, ref } = parsed.data;
  const price = await resolvePriceId(stripe, product).catch(() => undefined);
  if (!price) return NextResponse.json({ error: "price_not_configured" }, { status: 503 });

  const slugs = Array.from(
    new Set(parsed.data.templateSlugs.filter((s) => TEMPLATE_SLUGS.includes(s))),
  );
  const needed = PRODUCTS[product].picks;
  if (Number.isFinite(needed) && slugs.length !== needed)
    return NextResponse.json({ error: "wrong_template_count", needed }, { status: 400 });

  const wanted: Currency =
    parsed.data.currency ??
    currencyFor(
      request.headers.get("x-vercel-ip-country") ??
        request.headers.get("accept-language")?.split(",")[0],
    );
  // Only charge in a currency the Price actually carries; otherwise fall back to its default.
  const priceObject = await stripe.prices.retrieve(price, { expand: ["currency_options"] });
  const supported = new Set<string>([
    priceObject.currency,
    ...Object.keys(priceObject.currency_options ?? {}),
  ]);
  const currency: Currency = supported.has(wanted) ? wanted : (priceObject.currency as Currency);
  let purchaseId: string;
  if (user) {
    const { data: purchase, error } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        product,
        template_slugs: product === "everything" ? [] : slugs,
        amount: PRODUCTS[product].amounts[currency],
        currency,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !purchase) {
      console.error("[stripe] purchase insert failed", error?.message);
      return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
    }
    purchaseId = purchase.id;
  } else {
    // Guest: the purchase row is written at fulfilment, under the account created for the buyer.
    purchaseId = crypto.randomUUID();
  }
  const locale =
    parsed.data.locale ??
    (request.headers.get("accept-language")?.toLowerCase().startsWith("es") ? "es" : "en");

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url;
  const back = returnTo ?? "/dashboard";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    currency,
    customer_email: user?.email ?? undefined,
    client_reference_id: purchaseId,
    metadata: {
      purchase_id: purchaseId,
      user_id: user?.id ?? "",
      guest: user ? "0" : "1",
      locale,
      product,
      template_slugs: slugs.join(","),
      ...(ref ? { ref } : {}),
    },
    allow_promotion_codes: true,
    // Shared Stripe account: make the charge recognisable on statements.
    payment_intent_data: { statement_descriptor_suffix: "ETHOS" },
    automatic_tax: process.env.STRIPE_AUTOMATIC_TAX === "true" ? { enabled: true } : undefined,
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(back)}`,
    cancel_url: `${origin}${back}`,
  });
  if (user)
    await admin.from("purchases").update({ stripe_session_id: session.id }).eq("id", purchaseId);
  return NextResponse.json({ url: session.url });
}
