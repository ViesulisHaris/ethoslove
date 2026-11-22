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
 * A tagline of more words than this, in either language, is a paragraph and not a line. It was 20,
 * which left ten gifts with two sentences and 17 to 19 words in italics: three or four rows on a
 * 320px phone, and on the Spanish Photo Booth "Crear regalo" began a pixel above the foot of the
 * first screen (the confirming test of 22 Nov 2026). A line left whole is now sixteen words at
 * most: three rows on that phone, and four for one (the Spanish Spooky Season), measured on all
 * 122 pages.
 */
export const TAGLINE_WORDS = 16;

/**
 * What a gift's hero says under its name: the italic line, the sentences under it, and what is
 * left for the closed block. The italic line is the gift's tagline, and for nearly every gift
 * that is a line. Seventeen have a tagline of two sentences and 17 to 31 words (Light the Candles
 * and Gingerbread House the longest; Photo Booth, Evergreen and Haunted House among the shorter):
 * set in italic display type it was three to five rows on a phone, with the description still to
 * come, and on a small phone it pushed "Make this gift" off the first screen (the deep test of
 * 21 Nov 2026). For those the first sentence is the italic line ("A Thanksgiving table at dusk,
 * five candles unlit.") and the rest of the tagline is the sentence under it, in the place of the
 * description's opening, which says the same scene at more length and stays the page's meta
 * description. That sentence may be short ("Whoever gets the big half gets the wish."): it was
 * written to follow the line above it, and the two are the whole tagline, so it is no stub.
 * The closed block keeps what it kept before, the description after that opening:
 * given the whole description it had room for only three or four of a gift's six ideas (Music
 * Box, Autumn Reel). Decided by the gift, not the language: a tagline long in one is split in
 * both, so the two pages are laid out alike.
 */
export function heroWords(tagline: Readonly<Record<string, string>>, description: string, locale: string): { line: string; lead: string; rest: string } {
  const own = (tagline[locale] ?? "").trim();
  const sentences = own.split(/(?<=[.!?])\s+/);
  if (sentences.length < 2 || !Object.values(tagline).some((t) => words(t) > TAGLINE_WORDS)) return { line: own, ...heroLead(description) };
  return { line: sentences[0], lead: sentences.slice(1).join(" "), rest: heroLead(description).rest };
}

/**
 * The phrase people search for, which stands in small capitals over a gift's name in its h1. Where
 * the two are the same words the name alone says it: the Spanish Midnight Countdown read "CUENTA
 * ATRÁS DE MEDIANOCHE" over "Cuenta atrás de medianoche".
 */
export function heroKeyword(keyword: string | undefined, name: string): string | null {
  const plain = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return keyword && plain(keyword) !== plain(name) ? keyword : null;
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

/**
 * The words of the closed block's two sentences of links, as the page writes them: "Made for a
 * birthday, an anniversary." and "A gift for your boyfriend, your girlfriend." (the second only
 * where the gift suits someone with a page of ideas). They are part of the block's 180 words, and
 * the page and its test (tests/unit/text-budget.test.ts) count them here, the same way.
 */
export function closedBlockLinks(madeFor: string, days: readonly string[], suitsLead: string, people: readonly string[]): number {
  const sentence = (lead: string, names: readonly string[]) => (names.length > 0 ? words(`${lead} ${names.join(", ")}.`) : 0);
  return sentence(madeFor, days) + sentence(suitsLead, people);
}

export const countWords = words;
