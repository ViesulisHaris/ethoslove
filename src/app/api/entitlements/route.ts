import { NextResponse, type NextRequest } from "next/server";
import { pairOnSale, visitorCurrency } from "@/lib/pricing/products";
import { readyGifts } from "@/lib/commerce/gift-credits";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SIGNED_OUT, readEntitlements } from "@/lib/commerce/entitlements";

export const runtime = "nodejs";
export const maxDuration = 5;

const NO_STORE = { "cache-control": "private, no-store" };
/** An id no account has (lib/commerce/gift-credits.ts readyGifts). */
const NO_ONE = "00000000-0000-4000-8000-000000000000";

/**
 * What the signed-in visitor can use right now (contract C3): template unlocks, game packs, Ethos for
 * Two (`membership`, and `pass` as older app builds read it), how many dates they can save, and the
 * upgrade price if they have singles to upgrade from. Read with the visitor's own session, so
 * row-level security decides what comes back; only the other person's name in the membership is
 * read with the service role (profiles are own-row only). `?locale=es` makes the invite link Spanish.
 */
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    // A guest may add two more gifts to the gift they pay for, while they are on sale and their table
    // is there (counting no one's gifts ready reads null without it).
    const admin = getSupabaseAdminClient();
    const addPair = pairOnSale() && admin !== null && (await readyGifts(admin, NO_ONE)) !== null;
    return NextResponse.json({ ...SIGNED_OUT, addPair }, { headers: NO_STORE });
  }
  const locale = request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en";
  // The visitor's country, exactly as the proxy read it to pick the page's currency (src/proxy.ts).
  const currency = visitorCurrency(request.headers);
  const body = await readEntitlements(supabase, user.id, { locale, currency, now: Date.now(), names: getSupabaseAdminClient() });
  return NextResponse.json(body, { headers: NO_STORE });
}
