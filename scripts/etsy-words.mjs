/**
 * Words a buyer types into the gift, swapped into a demo whose listing sells it for another day: the
 * Midnight Countdown demo counts to a birthday, its listing to New Year's Eve (its own countdown already
 * ends at midnight on 1 January). Only the fields' text changes; the template draws it as it would.
 * etsy-shots.mjs swaps them in the demo's scripts, etsy-making.mjs in the draft it types from.
 */
export const WORDS = {
  "midnight-countdown": [
    ["Thirty, at midnight", "Together at midnight"],
    ["Until you're 30", "Until 2027"],
    ["Happy birthday, Ana.", "Happy New Year, Ana."],
    ["I wanted to be the first. Not", "I wanted to be the first this year. Not"],
    ["the day gets loud", "everyone starts singing"],
    ["So: happy birthday. Here's the year in six frames.", "So: happy New Year. Here's the last one in six frames."],
  ],
};

/** `text` with the slug's swaps made. */
export const swapWords = (slug, text) => (WORDS[slug] ?? []).reduce((t, [from, to]) => t.split(from).join(to), text);
