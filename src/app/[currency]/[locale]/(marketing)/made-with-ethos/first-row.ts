/**
 * The order of /made-with-ethos (./page.tsx), which opens with the gift its visitor was just given.
 * Kept apart from the page so it can be tested without drawing one.
 */

type Slugged = { slug: string };

/**
 * `lead`: the template in the address when it is a real one that does not send free (a paid gift,
 * or a free reply in a premium template). It stands first on the page, in front of the free shelf,
 * and leaves the premium shelf, so it is shown once. A free template leads its own shelf instead.
 * Anything else in the address (no template, a made-up one) leads nothing.
 */
export function firstRow<M extends Slugged>(all: readonly M[], theirs: string | null, sendsFree: (m: M) => boolean): { lead: M | null; free: M[]; premium: M[] } {
  const free = all.filter((m) => sendsFree(m));
  const lead = (theirs ? all.find((m) => m.slug === theirs && !sendsFree(m)) : undefined) ?? null;
  return {
    lead,
    free: [...free.filter((m) => m.slug === theirs), ...free.filter((m) => m.slug !== theirs)],
    premium: all.filter((m) => !sendsFree(m) && m !== lead),
  };
}

/**
 * How many columns the free shelf's words take when `cards` cards come before them in a grid of
 * `columns`: what is left of the cards' last row, or a whole row under them when they fill theirs.
 */
export function wordsSpan(cards: number, columns: number): number {
  const over = cards % columns;
  return over === 0 ? columns : columns - over;
}
