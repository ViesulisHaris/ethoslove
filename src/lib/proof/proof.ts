import "server-only";

import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SENDER_DAYS, shownReaction, toProof, type ProofNumbers, type ShownReaction } from "./numbers";

/** The cache tag of the reactions read below: a sender's "keep it private" clears it (api/reactions/private). */
export const REACTIONS_TAG = "proof-reactions";

/**
 * The proof the site shows (./numbers.ts says what may be shown and how), read with the service
 * role and cached: the counts for an hour, the reactions for ten minutes. A read that fails shows
 * nothing rather than a guess: no numbers line, and the sample reactions stay.
 */

export const proofNumbers = unstable_cache(
  async (): Promise<ProofNumbers | null> => {
    const admin = getSupabaseAdminClient();
    if (!admin) return null;
    const { data, error } = await admin.rpc("proof_numbers");
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
    return toProof(data as { opened?: unknown; opens?: unknown });
  },
  ["proof-numbers-v1"],
  { revalidate: 3600 },
);

/**
 * The newest approved reactions written in `locale`, as many as `limit`, newest approval first. A
 * page shows only its own language's: with too few, it keeps its samples rather than borrow another's.
 */
export const shownReactions = unstable_cache(
  async (limit: number, locale: "en" | "es"): Promise<ShownReaction[]> => {
    const admin = getSupabaseAdminClient();
    if (!admin) return [];
    const now = Date.now();
    const { data, error } = await admin
      .from("reactions")
      .select("emoji, text, share_consent, approved_at, sender_withheld_at, created_at")
      .eq("share_consent", true)
      .eq("locale", locale)
      .not("approved_at", "is", null)
      .is("sender_withheld_at", null)
      .lt("created_at", new Date(now - SENDER_DAYS * 86_400_000).toISOString())
      .order("approved_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 24) * 2);
    if (error) return [];
    return (data ?? []).flatMap((row) => shownReaction(row, now) ?? []).slice(0, limit);
  },
  ["proof-reactions-v2"],
  { revalidate: 600, tags: [REACTIONS_TAG] },
);
