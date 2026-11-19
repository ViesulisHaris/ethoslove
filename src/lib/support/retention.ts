import "server-only";

import type { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Db = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

/** Help chats are kept 30 days (migration 0020, the privacy policy). */
export const SUPPORT_CHAT_DAYS = 30;

/**
 * Deletes help chats untouched for 30 days and the counters that have run out (the daily job,
 * api/cron/unlock). Null when it couldn't run, including before migration 0020 is applied.
 */
export async function forgetOldSupportChats(admin: Db): Promise<number | null> {
  try {
    const { data, error } = await admin.rpc("forget_support_chats", { p_days: SUPPORT_CHAT_DAYS });
    if (error) {
      console.error("[support] old chats not forgotten", error.code ?? "", error.message);
      return null;
    }
    return typeof data === "number" ? data : 0;
  } catch (e) {
    console.error("[support] old chats not forgotten", e instanceof Error ? e.message : "unknown");
    return null;
  }
}
