import { NextResponse, type NextRequest } from "next/server";
import { visitorCurrency } from "@/lib/pricing/products";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SIGNED_OUT, readEntitlements } from "@/lib/commerce/entitlements";

export const runtime = "nodejs";
export const maxDuration = 5;

const NO_STORE = { "cache-control": "private, no-store" };

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
  if (!supabase || !user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });
  const locale = request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en";
  // The visitor's country, exactly as the proxy read it to pick the page's currency (src/proxy.ts).
  const currency = visitorCurrency(request.headers);
  const body = await readEntitlements(supabase, user.id, { locale, currency, now: Date.now(), names: getSupabaseAdminClient() });
  return NextResponse.json(body, { headers: NO_STORE });
}
