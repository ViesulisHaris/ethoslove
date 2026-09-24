import { NextResponse, type NextRequest } from "next/server";
import { currencyFor } from "@/lib/pricing/products";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SIGNED_OUT, readEntitlements } from "@/lib/commerce/entitlements";

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
  const currency = currencyFor(request.headers.get("x-vercel-ip-country") ?? request.headers.get("accept-language")?.split(",")[0]);
  const body = await readEntitlements(supabase, user.id, { locale, currency, now: Date.now() });
  return NextResponse.json(body, { headers: NO_STORE });
}
