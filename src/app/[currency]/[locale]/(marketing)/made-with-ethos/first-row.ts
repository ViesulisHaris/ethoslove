/**
 * The order of /made-with-ethos (./page.tsx), which opens with the gift its visitor was just given.
 * Kept apart from the page so it can be tested without drawing one.
 */

type Slugged = { slug: string };

/**
 * `lead`: the template in the address when it is a real one that does not send free (a paid gift,
 * or a free reply in a premium template). It stands first on the page, under its own label, in front
 * of the free shelf, and leaves the premium shelf, so it is shown once. A free template leads its own
 * shelf instead. Anything else in the address (no template, a made-up one) leads nothing.
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
 * How many columns the free shelf takes in a grid of `columns` when their card leads: the rest of the
 * row beside it when its cards fit there, or a whole row of its own under it when they do not.
 */
export function freeSpan(freeCards: number, columns: number): number {
  return 1 + freeCards <= columns ? columns - 1 : columns;
}

/**
 * How many columns the free shelf's words take when there is no card in front of the shelf: they
 * stand first, at the left, in what its cards leave of the row (a spread: the words, then the
 * pictures), or over them in a row of their own when the cards fill it.
 */
export function wordsSpan(cards: number, columns: number): number {
  const over = cards % columns;
  return over === 0 ? columns : columns - over;
}

/** The premium shelf is one row on every screen, then a link to all of them. */
export const PREMIUM_SHOWN = 4;
