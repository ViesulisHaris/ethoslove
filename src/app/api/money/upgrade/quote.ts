import "server-only";

import type { Currency } from "@/lib/pricing/products";
import { upgradeOffer } from "@/lib/commerce/entitlements";
import { foreverUnlocks } from "@/lib/commerce/unlocks";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UpgradeQuote } from "@/components/pricing/offers";

/**
 * The signed-in user's "Everything for the difference" price, or null when they have nothing to
 * upgrade from or already own Everything for good. Worked out with checkout's own rules
 * (lib/commerce), so the price a page quotes is the price the upgrade charges. Read with the user's
 * session: RLS lets them see every row it needs (their purchases, their unlocks, their passes).
 */
export async function upgradeQuoteForUser(userId: string, currency: Currency): Promise<UpgradeQuote | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const [{ data: purchases }, forever] = await Promise.all([
    supabase.from("purchases").select("product, amount, currency, status").eq("user_id", userId),
    foreverUnlocks(supabase, userId),
  ]);
  return upgradeOffer(forever, purchases ?? [], currency);
}
