import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import { getManifest, listManifests } from "@/templates/manifests";
import { OCCASION_GUIDES } from "./occasions";

/**
 * The gifts an occasion's page shows as cards: the gifts made for the occasion, best fit first, and
 * after them every gift the page's own ideas name. The Christmas page recommended twelve gifts and
 * its grid knew seven: idea 03 said "The Letter · Free" while "Free" answered that none of this
 * occasion's gifts are free (the user walk of 23 Nov 2026). An idea's gift is on the page, so it is
 * in the list and in the filter. /occasions counts the same list, so its tiles say what the page holds.
 */
export function occasionTemplates(occasion: Occasion, locale: GiftLocale) {
  const tagged = listManifests({ occasion });
  const named = (OCCASION_GUIDES[occasion][locale].ideas?.items ?? [])
    .map((idea) => getManifest(idea.template))
    .filter((m): m is NonNullable<typeof m> => m != null && !tagged.some((x) => x.slug === m.slug));
  return [...tagged, ...named.filter((m, i) => named.findIndex((x) => x.slug === m.slug) === i)];
}
