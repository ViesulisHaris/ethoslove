/**
 * Which front page a visitor gets, from the link they arrived through.
 *
 * Every sale so far has come from someone who saw a gift on social media (a bio link such as
 * `?ref=tt-couple`) or on a gift itself (the free-tier badge, `?ref=watermark`). They came to make
 * a gift, and the Dates-first front page made them look for it. Everyone else — search, typed-in,
 * no ref — still gets Dates first.
 *
 * Decided on the server from the query string, so the right hero is in the first HTML and never
 * swaps in after hydration.
 */
export type HomeHero = "dates" | "gift";

/** A bio or post link on TikTok, Instagram, YouTube, Pinterest or Facebook. */
const SOCIAL_REF_PREFIXES = ["tt-", "ig-", "yt-", "pin-", "fb-"] as const;
const GIFT_INTENT_REFS: readonly string[] = ["watermark"];

export function homeHeroFor(ref: string | string[] | undefined): HomeHero {
  // `?ref=a&ref=b` arrives as an array; the first one is what URLSearchParams.get, and so the
  // checkout attribution, reads.
  const value = (Array.isArray(ref) ? ref[0] : ref)?.trim().toLowerCase();
  if (!value) return "dates";
  if (GIFT_INTENT_REFS.includes(value)) return "gift";
  return SOCIAL_REF_PREFIXES.some((prefix) => value.startsWith(prefix)) ? "gift" : "dates";
}
