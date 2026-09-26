/**
 * What the template gallery leads with. Two short, hand-kept lists, because both are editorial
 * decisions and neither can be derived from a manifest.
 *
 * POPULAR is the premium best sellers: the templates people pay for once they start one (26 Sept
 * 2026, gifts started against checkouts paid: Bouquet 6 of 6 and The Council 5 of 6 in a day, XOXO
 * 39 of 45 in a week, and Birthday Cinema the most sold premium template by count). It used to lead
 * with the free Letter, the most made by far but paid for about one time in twenty; the Letter now
 * offers these from its own editor, and the "Free" filter and the catalogue below still have it.
 * Keep it to one row of four.
 *
 * NEW is the latest templates: the 26 Sept batch (Party Animals redesigned, Digicam, Photo Booth, Music Box,
 * Picnic), then the strongest of the batch before. A template leaves this list when the next batch
 * ships; a slug that no longer exists is simply skipped, and a unit test says so out loud.
 */
export const POPULAR_SLUGS = ["bouquet", "xoxo", "birthday-cinema", "the-council"] as const;
export const NEW_SLUGS = ["party-animals", "digicam", "photo-booth", "music-box", "picnic", "coquette", "sticker-bomb"] as const;

/**
 * What a free template's editor offers to move the gift into ("Same words, a bigger moment"): best
 * sellers that take a letter's words and photos well. All premium, which a unit test checks.
 */
export const MOVE_TO_SLUGS = ["bouquet", "xoxo", "birthday-cinema"] as const;

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
