import { FEATURED_DATES, type FeaturedDate } from "@/content/featured-dates";
import { isYmd, type Ymd } from "./calendar";

/*
 * Which places carry the "Featured" label today, and the label put on a list. Marking never adds,
 * drops or moves a place: a list keeps its own order and its own filters.
 */

/** The places featured on `today`: on or after `from`, and on or before `until` when there is one. */
export function featuredNow(today: Ymd, list: readonly FeaturedDate[] = FEATURED_DATES): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const f of list) {
    if (!isYmd(f.from) || f.from > today) continue;
    if (f.until !== undefined && (!isYmd(f.until) || f.until < today)) continue;
    ids.add(f.place);
  }
  return ids;
}

/** The same places in the same order, the flag on the listed ones, nothing added. */
export function markFeatured<T extends { id: string }>(places: readonly T[], ids: ReadonlySet<string>): (T & { featured?: true })[] {
  if (ids.size === 0) return [...places];
  return places.map((p) => (ids.has(p.id) ? { ...p, featured: true as const } : p));
}

/**
 * The places in `list` with no row in the record of who paid (docs/marketing/FEATURED-DATES.md): a
 * table row `| <place> | <who paid> | … |` whose second cell is not empty.
 */
export function missingPaidLines(list: readonly FeaturedDate[], doc: string): string[] {
  const paid = new Set<string>();
  for (const line of doc.split(/\r?\n/)) {
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim().replace(/^`|`$/g, ""));
    if (cells.length >= 2 && cells[0] && cells[1] && !/^-+$/.test(cells[1])) paid.add(cells[0]);
  }
  return list.filter((f) => !paid.has(f.place)).map((f) => f.place);
}
