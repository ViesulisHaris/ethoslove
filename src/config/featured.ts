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
 * NEW is the latest templates: the holiday gifts of 11 and 16 Nov, Christmas first (Nice List,
 * Unwrapped, Snow Globe, Frosted Window, String the Lights, Gingerbread House), then the two for
 * Thanksgiving (Light the Candles, Wishbone). A template leaves this list when the next batch ships
 * (the Halloween and autumn ones left with this one, three weeks after Halloween, and are in the
 * catalogue below); a slug that no longer exists is simply skipped, and a unit test says so out loud.
 */
export const POPULAR_SLUGS = ["bouquet", "xoxo", "birthday-cinema", "the-council"] as const;
export const NEW_SLUGS = ["nice-list", "unwrapped", "snow-globe", "frosted-window", "string-the-lights", "gingerbread-house", "light-the-candles", "wishbone"] as const;

/**
 * LATER is the gifts out of season: the ten whose first occasion is Halloween. From the morning after
 * Halloween they stood in the middle of the gallery, places 25 to 44, where the visitors who scroll
 * that far actually are (Clarity, 21–27 Nov 2026: half leave before card 15, a quarter reach the
 * middle). They close the gallery instead, in the order they had; the Halloween page keeps them first.
 * The owner's yes of 27 Nov 2026. Empty it in September.
 */
export const LATER_SLUGS = ["seance", "bat-swarm", "cauldron", "jack-o-lantern", "haunted-house", "trick-or-treat", "spooky-season", "be-my-boo", "fall-for-you", "autumn-reel"] as const;

/**
 * The three best sellers under the front page's buttons (components/marketing/platform/hero-best-sellers.tsx):
 * gifts people pay for once they start one (Bouquet, XOXO; Coquette pays on one editor open in ten).
 * All premium, which a unit test checks.
 */
export const HOME_PICKS = ["bouquet", "xoxo", "coquette"] as const;

/**
 * What a free template's editor offers to move the gift into ("Same words, a bigger moment"): best
 * sellers that take a letter's words and photos well. All premium, which a unit test checks.
 */
export const MOVE_TO_SLUGS = ["bouquet", "xoxo", "birthday-cinema"] as const;

export type Featured = "popular" | "new";
export type GallerySection<T> = { id: Featured | "all"; items: T[] };

const POPULAR: readonly string[] = POPULAR_SLUGS;
const NEW: readonly string[] = NEW_SLUGS;
const LATER: readonly string[] = LATER_SLUGS;

/** The badge a card wears, if any. A best seller that is also new is, first of all, a best seller. */
export const featuredFor = (slug: string): Featured | undefined => (POPULAR.includes(slug) ? "popular" : NEW.includes(slug) ? "new" : undefined);

/**
 * The gallery in three shelves: the best sellers, the new arrivals, then everything else in the
 * order it was given, the gifts out of season (LATER) last. Every item lands on exactly one shelf,
 * and an empty shelf is left out, so a filter that removes all the new ones removes their heading too.
 */
export function sectionTemplates<T extends { slug: string }>(items: T[]): GallerySection<T>[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const pick = (slugs: readonly string[]) => slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  const popular = pick(POPULAR);
  const fresh = pick(NEW.filter((slug) => !POPULAR.includes(slug)));
  const shelved = new Set([...popular, ...fresh].map((item) => item.slug));
  const rest = items.filter((item) => !shelved.has(item.slug));
  const sections: GallerySection<T>[] = [
    { id: "popular", items: popular },
    { id: "new", items: fresh },
    { id: "all", items: [...rest.filter((item) => !LATER.includes(item.slug)), ...rest.filter((item) => LATER.includes(item.slug))] },
  ];
  return sections.filter((section) => section.items.length > 0);
}
