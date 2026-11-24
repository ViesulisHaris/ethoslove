"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ideaHint, ideaMode, type IdeaHint } from "@/lib/lifecycle/monthly-idea";
import { readIdeaAccount } from "@/lib/lifecycle/monthly-idea-enrol";

/**
 * What the send sheet shows a signed-in account before a free gift goes out: the Terms box, or
 * nothing (lib/lifecycle/monthly-idea.ts ideaHint). No lookups unless the setting is "all", so with
 * it off this is one environment read. Its own action, not a field on getEntitlement, which the
 * note rules call too and stays as it was.
 */
export async function getIdeaHint(templateSlug: string): Promise<IdeaHint> {
  const mode = ideaMode();
  if (mode !== "all") return "none";
  try {
    const user = await getCurrentUser();
    if (!user) return "none";
    const admin = getSupabaseAdminClient();
    const supabase = await getSupabaseServerClient();
    if (!admin || !supabase) return "none";
    const [{ data: unlocked }, account] = await Promise.all([
      supabase.rpc("has_template_unlock", { p_user: user.id, p_slug: templateSlug }),
      readIdeaAccount(admin, user.id),
    ]);
    return ideaHint(mode, { unlocked: Boolean(unlocked), account });
  } catch {
    return "none";
  }
}
