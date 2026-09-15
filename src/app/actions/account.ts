"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { deleteGiftStorage } from "@/lib/gift/storage-cleanup";

/** Deletes the account and everything under it. Rows cascade; storage is wiped explicitly. */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const user = await getCurrentUser();
  if (!supabase || !admin || !user) return { ok: false, error: "unauthenticated" };

  const giftIds: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("gifts")
      .select("id")
      .eq("user_id", user.id)
      .range(from, from + 999);
    if (error) return { ok: false, error: error.message };
    giftIds.push(...(data ?? []).map((g) => g.id));
    if ((data?.length ?? 0) < 1000) break;
  }

  const errors: string[] = [];
  for (const giftId of giftIds) {
    const cleanup = await deleteGiftStorage(giftId);
    errors.push(...cleanup.errors);
  }
  if (errors.length) return { ok: false, error: "storage_cleanup_failed" };

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  return { ok: true };
}

export async function updateProfile(input: { name: string; locale: "en" | "es" }): Promise<{ ok: boolean }> {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return { ok: false };
  const { error } = await supabase.from("profiles").update({ name: input.name.slice(0, 80) || null, locale: input.locale }).eq("id", user.id);
  return { ok: !error };
}
