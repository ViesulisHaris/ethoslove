const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * What of a template's description the hero shows: its opening sentences, as many as fit in
 * thirty words (the hero's limit beside the picture, DESIGN-LESS-TEXT.md). Whole sentences only,
 * never a cut one. But never a stub either: where that leaves fewer than a dozen words ("Tap to
 * break the seal." and nothing more), the next sentence comes too, as long as the two stay within
 * forty. The rest is not thrown away: the page keeps it in its closed block, and the whole
 * description stays the page's meta description. A description that cannot give a dozen words
 * within forty gives the hero none, where the tagline above it does the telling.
 */
export function heroLead(description: string, max = 30, least = 12, most = 40): { lead: string; rest: string } {
  const sentences = description.trim().split(/(?<=[.!?])\s+/);
  let taken = 0;
  let count = 0;
  while (taken < sentences.length && count + words(sentences[taken]) <= (count < least ? most : max)) {
    count += words(sentences[taken]);
    taken += 1;
  }
  if (count < least) taken = 0;
  return { lead: sentences.slice(0, taken).join(" "), rest: sentences.slice(taken).join(" ") };
}

/**
 * Which of a list of sentences fit in what is left of a word budget. They are taken in order of
 * `priority` (the indexes of `sentences`, most wanted first) and given back in their own order,
 * so the closed block of a page keeps what a search needs most and never runs past its limit.
 */
export function fitSentences(sentences: readonly (string | null)[], priority: readonly number[], budget: number): string[] {
  const kept = new Set<number>();
  let left = budget;
  for (const i of priority) {
    const sentence = sentences[i];
    if (!sentence || words(sentence) > left) continue;
    kept.add(i);
    left -= words(sentence);
  }
  return sentences.filter((sentence, i): sentence is string => sentence !== null && kept.has(i));
}

/** The closed block's limit (DESIGN-LESS-TEXT.md): longer words that search needs, at most 180. */
export const CLOSED_BLOCK_WORDS = 180;

export const countWords = words;
