import "server-only";

import type { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

/**
 * Whether an address (by its emailKey) is on the unsubscribe list. Besides the checkout reminder, the
 * list covers the offers inside service emails (the receipt's "Everything for the difference", the
 * "start the next gift" line), which the privacy policy promises to leave out for anyone on it. A
 * lookup that fails counts as on the list: no offer is worth sending against someone's wishes.
 */
export async function optedOut(admin: Admin, key: string): Promise<boolean> {
  const { data, error } = await admin.from("email_optouts").select("email_sha256").eq("email_sha256", key).maybeSingle();
  return Boolean(error || data);
}
