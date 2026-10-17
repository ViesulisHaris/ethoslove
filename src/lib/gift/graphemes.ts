/**
 * Cutting names on what a reader sees as one character. `charAt(0)` and `slice(0, n)` count
 * UTF-16 units, so a name that starts or ends with an emoji came out as half a surrogate pair
 * ("�") on a wax seal, a chat avatar or a wheel label. `[...text]` counts code points, which still
 * splits 👩‍❤️‍👨, a flag or a skin tone. `Intl.Segmenter` counts graphemes; everywhere a gift runs has it
 * (Safari 14.1+, Chrome 87+, Firefox 125+, Node 16+), and code points are the fallback elsewhere.
 */

let segmenter: Intl.Segmenter | null | undefined;

export function graphemes(text: string): string[] {
  if (segmenter === undefined)
    segmenter =
      typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** The first character of a name for an initial, or "" for an empty one. */
export function firstGrapheme(text: string): string {
  return graphemes(text.trim())[0] ?? "";
}

/** At most `count` characters of `text`, never ending on half of one. */
export function sliceGraphemes(text: string, count: number): string {
  return graphemes(text).slice(0, count).join("");
}

/** An initial the way a seal or avatar prints it: upper case, except an emoji, which has none. */
export function initialOf(name: string, fallback = ""): string {
  return firstGrapheme(name).toUpperCase() || fallback;
}
