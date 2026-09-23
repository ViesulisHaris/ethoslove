import { NextResponse, type NextRequest } from "next/server";
import { currencyFor } from "@/lib/pricing/products";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { inviteUrl } from "@/lib/commerce/db";
import { SIGNED_OUT, packsFromRows, summarisePass, templatesFromRows, upgradeOffer, type Entitlements } from "@/lib/commerce/entitlements";
import { splitUnlocks } from "@/lib/commerce/unlocks";

export const runtime = "nodejs";
export const maxDuration = 5;

const NO_STORE = { "cache-control": "private, no-store" };

/**
 * What the signed-in visitor can use right now (contract C3): template unlocks, game packs, the pass
 * they hold, and the upgrade price if they have singles to upgrade from. Read with the visitor's own
 * session, so row-level security decides what comes back. `?locale=es` makes the invite link Spanish.
 */
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });
  const locale = request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en";

  const [unlocks, owned, joined, purchases] = await Promise.all([
    supabase.from("template_unlocks").select("template_slug, purchase_id").eq("user_id", user.id),
    supabase.from("couple_passes").select("*").eq("owner_user_id", user.id),
    supabase.from("couple_passes").select("*").eq("partner_user_id", user.id),
    supabase.from("purchases").select("product, amount, currency, status").eq("user_id", user.id).eq("status", "paid"),
  ]);
  const rows = unlocks.data ?? [];
  // Before migration 0009 the pass table doesn't exist yet: that reads as "no pass", not an error.
  const passes = [...(owned.data ?? []), ...(joined.data ?? [])];
  const slugs = rows.map((row) => row.template_slug);
  const forever = splitUnlocks(rows, passes.map((pass) => pass.purchase_id)).forever;
  const currency = currencyFor(request.headers.get("x-vercel-ip-country") ?? request.headers.get("accept-language")?.split(",")[0]);

  const body: Entitlements = {
    signedIn: true,
    templates: templatesFromRows(slugs),
    packs: packsFromRows(slugs),
    pass: summarisePass(passes, user.id, Date.now(), (code) => inviteUrl(code, locale)),
    upgrade: upgradeOffer(forever, purchases.data ?? [], currency),
  };
  return NextResponse.json(body, { headers: NO_STORE });
}
