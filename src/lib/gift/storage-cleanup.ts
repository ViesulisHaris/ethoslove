import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { GIFTS_BUCKET, REACTIONS_BUCKET } from "./assets";
import { giftStorageObjectKeys } from "./storage-paths";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
type Bucket = typeof GIFTS_BUCKET | typeof REACTIONS_BUCKET;
type ListedObject = { name: string; id?: string | null; metadata?: unknown };

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;

export type StorageCleanupResult = {
  deleted: number;
  kept: number;
  errors: string[];
  skipped?: "already_pruned" | "not_found" | "not_live" | "scheduled" | "unopened";
};

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function isFolderLike(item: ListedObject): boolean {
  return item.id == null && item.metadata == null;
}

async function listStorageKeys(admin: AdminClient, bucket: Bucket, prefix: string): Promise<{ keys: string[]; errors: string[] }> {
  const keys: string[] = [];
  const errors: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      errors.push(`${bucket}/${prefix}: ${error.message}`);
      break;
    }

    const page = (data ?? []) as ListedObject[];
    for (const item of page) {
      const key = `${prefix}/${item.name}`;
      if (isFolderLike(item)) {
        const nested = await listStorageKeys(admin, bucket, key);
        keys.push(...nested.keys);
        errors.push(...nested.errors);
      } else {
        keys.push(key);
      }
    }

    if (page.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return { keys, errors };
}

async function removeStorageKeys(admin: AdminClient, bucket: Bucket, keys: string[]): Promise<string[]> {
  const errors: string[] = [];
  for (const batch of chunks(keys, REMOVE_BATCH_SIZE)) {
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) errors.push(`${bucket}: ${error.message}`);
  }
  return errors;
}

export async function deleteGiftStorage(giftId: string): Promise<StorageCleanupResult> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { deleted: 0, kept: 0, errors: ["supabase_admin_not_configured"] };

  let deleted = 0;
  const errors: string[] = [];

  for (const bucket of [GIFTS_BUCKET, REACTIONS_BUCKET] as const) {
    const listed = await listStorageKeys(admin, bucket, giftId);
    errors.push(...listed.errors);
    if (listed.keys.length === 0) continue;
    const removeErrors = await removeStorageKeys(admin, bucket, listed.keys);
    errors.push(...removeErrors);
    if (removeErrors.length === 0) deleted += listed.keys.length;
  }

  return { deleted, kept: 0, errors };
}

/**
 * After a live gift has been opened, remove upload leftovers that are no longer referenced
 * by the published gift JSON. Scheduled gifts are skipped until they become live.
 */
export async function pruneOpenedGiftStorage(giftId: string): Promise<StorageCleanupResult> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { deleted: 0, kept: 0, errors: ["supabase_admin_not_configured"] };

  const { data: gift, error } = await admin
    .from("gifts")
    .select("id, status, data, storage_pruned_at")
    .eq("id", giftId)
    .maybeSingle();
  if (error) return { deleted: 0, kept: 0, errors: [error.message] };
  if (!gift) return { deleted: 0, kept: 0, errors: [], skipped: "not_found" };
  if (gift.status === "scheduled") return { deleted: 0, kept: 0, errors: [], skipped: "scheduled" };
  if (gift.status !== "live") return { deleted: 0, kept: 0, errors: [], skipped: "not_live" };
  if (gift.storage_pruned_at) return { deleted: 0, kept: 0, errors: [], skipped: "already_pruned" };

  const { count, error: countError } = await admin
    .from("gift_views")
    .select("id", { count: "exact", head: true })
    .eq("gift_id", giftId);
  if (countError) return { deleted: 0, kept: 0, errors: [countError.message] };
  if ((count ?? 0) < 1) return { deleted: 0, kept: 0, errors: [], skipped: "unopened" };

  const keep = new Set(giftStorageObjectKeys(gift.data as Database["public"]["Tables"]["gifts"]["Row"]["data"]));
  const listed = await listStorageKeys(admin, GIFTS_BUCKET, giftId);
  if (listed.errors.length) return { deleted: 0, kept: keep.size, errors: listed.errors };

  const stale = listed.keys.filter((key) => !keep.has(key));
  const removeErrors = await removeStorageKeys(admin, GIFTS_BUCKET, stale);
  if (removeErrors.length) return { deleted: 0, kept: keep.size, errors: removeErrors };

  await admin
    .from("gifts")
    .update({ storage_pruned_at: new Date().toISOString() })
    .eq("id", giftId)
    .is("storage_pruned_at", null);

  return { deleted: stale.length, kept: keep.size, errors: [] };
}
