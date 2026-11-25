import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { likedCount, type VoteChange } from "./votes";

/*
 * The votes' two database calls, and what "not there yet" looks like. Until the owner applies
 * migration 0026 the table and the function are missing: that is answered quietly, never logged.
 */

type Db = SupabaseClient<Database>;
type DbError = { code?: string; message?: string } | null;

/** The table (42P01, PGRST205) or the function (42883, PGRST202) is not there: 0026 is not applied. */
export const isVotesMissing = (error: DbError): boolean => Boolean(error && ["42P01", "PGRST205", "42883", "PGRST202"].includes(error.code ?? ""));

export type VotesRead = { ok: true; liked: Record<string, number> } | { ok: false; missing: boolean; error?: DbError };

/** The yes counts from five up, for these targets: nothing below, and never a no. */
export async function readLiked(db: Db, targets: readonly string[]): Promise<VotesRead> {
  const { data, error } = await db.from("date_votes").select("target, yes").in("target", [...targets]);
  if (error) return { ok: false, missing: isVotesMissing(error), error };
  const liked: Record<string, number> = {};
  for (const row of (data ?? []) as { target: string; yes: number }[]) {
    const n = likedCount(row.yes);
    if (n !== null) liked[row.target] = n;
  }
  return { ok: true, liked };
}

export type VotesWrite = { ok: true } | { ok: false; missing: boolean; error?: DbError };

/** One tap's changes, in one call: the function adds them and keeps every counter at zero or more. */
export async function applyVotes(db: Db, changes: readonly VoteChange[]): Promise<VotesWrite> {
  const { error } = await db.rpc("date_votes_apply", { p_targets: changes.map((c) => c.target), p_yes: changes.map((c) => c.yes), p_no: changes.map((c) => c.no) });
  if (error) return { ok: false, missing: isVotesMissing(error), error };
  return { ok: true };
}
