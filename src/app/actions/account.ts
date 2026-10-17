"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { deleteAccountData } from "@/lib/auth/delete-account";

/** Deletes the account and everything under it (lib/auth/delete-account.ts), then signs this browser out. */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  const user = await getCurrentUser();
  if (!supabase || !admin || !user) return { ok: false, error: "unauthenticated" };

  const deleted = await deleteAccountData(admin, user.id);
  if (!deleted.ok) return deleted;
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
