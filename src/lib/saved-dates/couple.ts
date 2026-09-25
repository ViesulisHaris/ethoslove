import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Who shares with whom, as the saved-dates rules need it: whether a user holds a running
 * membership, and who the other person in it is. Both are 0015's functions, asked with the service
 * role (which may ask about anyone) so a partner's answer is the same whoever asks. Passed into the
 * saved-dates logic rather than imported, so the rules are tested without a database.
 */
export type Couple = {
  isMember(userId: string): Promise<boolean>;
  partnerOf(userId: string): Promise<string | null>;
};

/** A database that can't answer: the caller answers 503 rather than guessing someone is free. */
export class CoupleUnavailable extends Error {}

export function supabaseCouple(db: SupabaseClient<Database>): Couple {
  return {
    async isMember(userId) {
      const { data, error } = await db.rpc("is_member", { p_user: userId });
      if (error) throw new CoupleUnavailable(`is_member: ${error.message}`);
      return data === true;
    },
    async partnerOf(userId) {
      const { data, error } = await db.rpc("couple_partner", { p_user: userId });
      if (error) throw new CoupleUnavailable(`couple_partner: ${error.message}`);
      return typeof data === "string" && data !== userId ? data : null;
    },
  };
}
