import type { TemplateTier } from "@/templates/types";

/** The gallery's price filter: everything, or one tier. */
export type TierFilter = TemplateTier | "all";

export const TIER_FILTERS = ["all", "free", "premium"] as const satisfies readonly TierFilter[];

/**
 * The filter lives in the address (`?tier=premium`), not only in the page's state. State is gone
 * when someone opens a template and comes Back, while the browser still restores the scroll
 * position: the longer unfiltered list came back scrolled to the filtered list's offset, and they
 * landed on the wrong templates, far from the one they had opened.
 */
export const TIER_PARAM = "tier";

export function parseTier(value: string | null | undefined): TierFilter {
  return value === "free" || value === "premium" ? value : "all";
}

/** The query string with the tier set, or dropped for "all"; every other parameter is kept. */
export function searchWithTier(search: string, tier: TierFilter): string {
  const params = new URLSearchParams(search);
  if (tier === "all") params.delete(TIER_PARAM);
  else params.set(TIER_PARAM, tier);
  const query = params.toString();
  return query ? `?${query}` : "";
}
