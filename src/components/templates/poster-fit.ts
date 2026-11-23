/**
 * A poster whose picture does not fill its own frame. Frosted Window's poster (and its film) was
 * recorded with flat beige bars at both sides, an eighth of its width each: on a card the window
 * stood between two beige strips, where every other poster runs to the card's edges (walk-agreed-7,
 * 23 Nov 2026). Its card zooms in from the top by the bars' share, so the window fills the card.
 * The zoom also lifts the poster's own "WIPE THE FROST AWAY" off the card's foot, where the finder's
 * "Watch it" button lay over it.
 *
 * Whole class names, so Tailwind finds them. Keyed by the poster's path, so any card that draws a
 * poster (and its film, the same recording) can ask.
 */
const FIT: Record<string, string> = {
  "/templates/frosted-window/poster.jpg": "origin-top scale-[1.3]",
};

export function posterFit(poster: string | undefined): string | undefined {
  return poster ? FIT[poster] : undefined;
}
