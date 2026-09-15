import { GIFTS_BUCKET, isStoragePath, storageObjectKey } from "./assets";

/**
 * Finds every Supabase gift-bucket path referenced by a saved gift JSON blob.
 * The data is JSON, so a guarded recursive walk is enough and keeps template-specific
 * media fields covered without teaching this helper every template schema.
 */
export function giftStoragePaths(input: unknown): string[] {
  const paths = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === "string") {
      if (isStoragePath(value)) paths.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };

  visit(input);
  return Array.from(paths).sort();
}

export function giftStorageObjectKeys(input: unknown): string[] {
  return giftStoragePaths(input).map(storageObjectKey);
}

export function giftStoragePathFromKey(key: string): string {
  return `${GIFTS_BUCKET}/${key}`;
}
