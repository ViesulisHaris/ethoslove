/**
 * Which front page a visitor gets, from the link they arrived through.
 *
 * Gifts first, for everyone (the owner's call, 8 Oct 2026). Every sale comes from someone who
 * came to make a gift: from a carousel that shows tryethos.io (typed in, so no ref at all), a bio
 * link such as `?ref=tt-couple`, or a gift's free-tier badge (`?ref=watermark`). The Dates-first
 * front page made all of them look for it. Only a link made for Dates (`?ref=dates`,
 * `?ref=dates-<campaign>`) opens on the date ideas.
 *
 * Decided on the server from the query string, so the right hero is in the first HTML and never
 * swaps in after hydration.
 */
export type HomeHero = "dates" | "gift";

/** A link made to bring someone to the date ideas. */
const DATES_REF = /^dates(-|$)/;

export function homeHeroFor(ref: string | string[] | undefined): HomeHero {
  // `?ref=a&ref=b` arrives as an array; the first one is what URLSearchParams.get, and so the
  // checkout attribution, reads.
  const value = (Array.isArray(ref) ? ref[0] : ref)?.trim().toLowerCase();
  return value && DATES_REF.test(value) ? "dates" : "gift";
}
