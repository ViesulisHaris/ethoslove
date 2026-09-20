/**
 * What the template gallery leads with. Two short, hand-kept lists, because both are editorial
 * decisions and neither can be derived from a manifest.
 *
 * POPULAR is the best sellers by paid purchases, most sold first (the purchases table, 30 days to
 * 2026-09-20: The Letter 115, Birthday Cinema 98, Bouquet 52, Constellations 28, then a long way
 * down to the rest). Re-run the count before changing it, and keep it to one row of four.
 *
 * NEW is the latest templates, the cats first. A template leaves this list when the next batch
 * ships; a slug that no longer exists is simply skipped, and a unit test says so out loud.
 */
export const POPULAR_SLUGS = ["the-letter", "birthday-cinema", "bouquet", "constellations"] as const;
export const NEW_SLUGS = ["party-animals", "the-council", "sticker-bomb", "coquette", "xoxo", "keepsake", "balloons", "popup-card", "sketchbook"] as const;

export type Featured = "popular" | "new";
export type GallerySection<T> = { id: Featured | "all"; items: T[] };

const POPULAR: readonly string[] = POPULAR_SLUGS;
const NEW: readonly string[] = NEW_SLUGS;

/** The badge a card wears, if any. A best seller that is also new is, first of all, a best seller. */
export const featuredFor = (slug: string): Featured | undefined => (POPULAR.includes(slug) ? "popular" : NEW.includes(slug) ? "new" : undefined);

/**
 * The gallery in three shelves: the best sellers, the new arrivals, then everything else in the
 * order it was given. Every item lands on exactly one shelf, and an empty shelf is left out, so a
 * filter that removes all the new ones removes their heading too.
 */
export function sectionTemplates<T extends { slug: string }>(items: T[]): GallerySection<T>[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const pick = (slugs: readonly string[]) => slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  const popular = pick(POPULAR);
  const fresh = pick(NEW.filter((slug) => !POPULAR.includes(slug)));
  const shelved = new Set([...popular, ...fresh].map((item) => item.slug));
  const sections: GallerySection<T>[] = [
    { id: "popular", items: popular },
    { id: "new", items: fresh },
    { id: "all", items: items.filter((item) => !shelved.has(item.slug)) },
  ];
  return sections.filter((section) => section.items.length > 0);
}
