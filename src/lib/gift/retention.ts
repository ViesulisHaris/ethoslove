import "server-only";

import type { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GIFTS_BUCKET } from "./assets";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export type RetentionResult = { purgedDrafts: number; deletedFiles: number; freedGb: number; errors: string[] };

const PAGE = 500;
/** How long a gift unpublished by a refund or a chargeback waits in drafts (terms, section 10). */
export const UNPUBLISHED_DRAFT_DAYS = 90;
const REMOVE_BATCH = 100;

/**
 * The daily storage sweep, in two moves (see migration 0006):
 *   1. drafts untouched for `draftDays` are deleted, except a gift that had been published and was
 *      unpublished because its payment went back (a refund or a chargeback keeps published_at):
 *      that one is kept for `unpublishedDays`, long enough for a chargeback to be decided, so a
 *      won dispute can put it back live (lib/commerce/revoke.ts restorePurchase);
 *   2. files in the gifts bucket that no gift references and that are older than a day are
 *      removed, page by page, until the time budget runs out. Whatever is left waits for
 *      tomorrow's run. Live gifts keep every file they reference.
 */
export async function runStorageRetention(
  admin: AdminClient,
  { budgetMs = 40_000, draftDays = 7, unpublishedDays = UNPUBLISHED_DRAFT_DAYS }: { budgetMs?: number; draftDays?: number; unpublishedDays?: number } = {},
): Promise<RetentionResult> {
  const started = Date.now();
  const errors: string[] = [];
  const before = (days: number) => new Date(started - days * 86_400_000).toISOString();
  const [fresh, unpublished] = await Promise.all([
    admin.from("gifts").delete({ count: "exact" }).eq("status", "draft").is("published_at", null).lt("updated_at", before(draftDays)),
    admin.from("gifts").delete({ count: "exact" }).eq("status", "draft").not("published_at", "is", null).lt("updated_at", before(unpublishedDays)),
  ]);
  if (fresh.error) errors.push(`purge: ${fresh.error.message}`);
  if (unpublished.error) errors.push(`purge unpublished: ${unpublished.error.message}`);
  const purged = (fresh.count ?? 0) + (unpublished.count ?? 0);

  let deletedFiles = 0;
  let bytes = 0;
  while (Date.now() - started < budgetMs) {
    const { data: rows, error } = await admin.rpc("storage_orphans", { p_limit: PAGE });
    if (error) {
      errors.push(`orphans: ${error.message}`);
      break;
    }
    if (!rows?.length) break;
    for (let i = 0; i < rows.length; i += REMOVE_BATCH) {
      const batch = rows.slice(i, i + REMOVE_BATCH);
      const { error: removeError } = await admin.storage.from(GIFTS_BUCKET).remove(batch.map((r) => r.name));
      if (removeError) {
        errors.push(`remove: ${removeError.message}`);
        return { purgedDrafts: purged, deletedFiles, freedGb: gb(bytes), errors };
      }
      deletedFiles += batch.length;
      bytes += batch.reduce((sum, r) => sum + Number(r.bytes ?? 0), 0);
    }
    if (rows.length < PAGE) break;
  }
  return { purgedDrafts: purged, deletedFiles, freedGb: gb(bytes), errors };
}

const gb = (bytes: number) => Math.round((bytes / 1e9) * 100) / 100;
