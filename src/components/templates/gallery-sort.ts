/**
 * The gallery's order ("Sort by"). Like the price filter beside it (gallery-tier.ts) it lives in
 * the address, `?sort=new`, so opening a gift and coming Back lands on the same list, and a link
 * to the newest gifts is a link.
 *
 * - `popular` is the gallery as it has always stood: the best sellers, the new arrivals, then
 *   everything else (config/featured.ts). It is the default and leaves the address alone.
 * - `new` is the catalogue backwards: templates/manifests.ts lists the gifts in the order they
 *   were added, oldest first. The list a page hands the gallery is not in that order (it is
 *   sorted for the shelves), so the page also hands over the catalogue's own order, `added`.
 * - `az` is by the gift's name in the visitor's language.
 */
export const SORTS = ["popular", "new", "az"] as const;
export type GallerySort = (typeof SORTS)[number];

export const SORT_PARAM = "sort";

export function parseSort(value: string | null | undefined): GallerySort {
  return value === "new" || value === "az" ? value : "popular";
}

/** The query string with the order set, or dropped for the default; every other parameter is kept. */
export function searchWithSort(search: string, sort: GallerySort): string {
  const params = new URLSearchParams(search);
  if (sort === "popular") params.delete(SORT_PARAM);
  else params.set(SORT_PARAM, sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** `items` given back in the order asked for; `added` is every gift's slug, oldest first. `popular` is left to the shelves. */
export function sortTemplates<T extends { slug: string; name: Record<L, string> }, L extends string>(items: readonly T[], sort: GallerySort, locale: L, added: readonly string[]): T[] {
  if (sort === "new") {
    const at = new Map(added.map((slug, i) => [slug, i]));
    // A gift the list does not know is treated as the newest: it was added after the list was made.
    return [...items].sort((a, b) => (at.get(b.slug) ?? added.length) - (at.get(a.slug) ?? added.length));
  }
  if (sort === "az") return [...items].sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale, { sensitivity: "base" }));
  return [...items];
}
