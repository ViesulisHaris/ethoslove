/**
 * A name set inside a sentence, where the name may be written right to left (Arabic, Hebrew and their
 * neighbours) and the sentence is not. Left alone, the name drags what stands next to it (a number,
 * an apostrophe, the full stop) to its own side. Wrapped in the two marks that tell the browser "work
 * this run out on its own" (U+2068 … U+2069, what `<bdi>` does), the sentence keeps its order and
 * the name keeps its own. A name in any other script comes back as it was, so nothing invisible is
 * added to the text most people see, or to what a test or a screen reader reads.
 *
 * Only ever applied to what is drawn. What is stored has these marks taken out (lib/group/clean.ts).
 *
 * The other half of the same care is `dir="auto"` on every element or field that holds nothing but a
 * name, a note or the prompt: the text then starts from the side its own script starts from.
 */
const RIGHT_TO_LEFT = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/;

export function isolated(name: string): string {
  return RIGHT_TO_LEFT.test(name) ? `⁨${name}⁩` : name;
}
