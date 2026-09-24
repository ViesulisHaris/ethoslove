import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { deleteGiftStorage } from "@/lib/gift/storage-cleanup";

type Admin = SupabaseClient<Database>;

const PAGE = 1000;

/**
 * Deletes an account and everything under it: every gift's files in storage first (rows cascade,
 * files don't), then the auth user, whose rows cascade from there. Purchases outlive it without a
 * user, as the accounts need (migration 0011). Shared by the account page's server action and the
 * iPhone app's POST /api/app/account/delete; the caller has already decided who `userId` is.
 * The storage step stops the deletion if it fails, so nobody is left with files and no account.
 */
export async function deleteAccountData(admin: Admin, userId: string, removeStorage: (giftId: string) => Promise<{ errors: string[] }> = deleteGiftStorage): Promise<{ ok: true } | { ok: false; error: string }> {
  const giftIds: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("gifts")
      .select("id")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    giftIds.push(...(data ?? []).map((g) => g.id));
    if ((data?.length ?? 0) < PAGE) break;
  }

  const errors: string[] = [];
  for (const giftId of giftIds) {
    const cleanup = await removeStorage(giftId);
    errors.push(...cleanup.errors);
  }
  if (errors.length) return { ok: false, error: "storage_cleanup_failed" };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
