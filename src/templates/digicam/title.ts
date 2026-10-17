/** The title's words in up to three rows, as even as the words allow. */
export function titleRows(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const total = words.join(" ").length;
  const target = Math.max(...words.map((w) => [...w].length), Math.ceil(total / 3));
  const rows: string[] = [];
  for (const word of words) {
    const last = rows[rows.length - 1];
    if (last !== undefined && [...`${last} ${word}`].length <= target) rows[rows.length - 1] = `${last} ${word}`;
    else rows.push(word);
  }
  while (rows.length > 3) rows.splice(rows.length - 2, 2, `${rows[rows.length - 2]} ${rows[rows.length - 1]}`);
  return rows;
}

/**
 * Capitals that stop reading as themselves in the ransom letters' script face: a script F looks
 * like a 7, a script I or R like a loop, a script D like a Q, a script Z like a 3.
 */
const MISREAD = new Set(["D", "F", "G", "I", "J", "L", "Q", "R", "S", "T", "Z"]);

/**
 * Whether RansomRows sets the letter at `index` (counting letters only) of row `row` in its
 * script face, for a given seed. Mirrors its own pick: `(seed + index * 7 + row * 3) % 97`, then
 * face `(pick >> 1) % 5`, where the script face is the fourth.
 */
export const scriptAt = (seed: number, index: number, row: number): boolean => (((seed + index * 7 + row * 3) % 97) >> 1) % 5 === 3;

/**
 * The ransom seed nearest `base` that keeps the script face off the letters it would make
 * unreadable, and leaves a letter or two in script for the look. The same title always gets the
 * same seed.
 */
export function ransomSeed(rows: string[], base: number): number {
  let best = base % 97;
  let bestScore = Infinity;
  for (let k = 0; k < 97; k++) {
    const seed = (base + k) % 97;
    let index = 0;
    let misread = 0;
    let script = 0;
    rows.forEach((row, r) => {
      for (const ch of row) {
        if (ch === " ") continue;
        if (scriptAt(seed, index, r)) {
          script += 1;
          if (MISREAD.has(ch.toUpperCase())) misread += 1;
        }
        index += 1;
      }
    });
    const want = index >= 6 ? 2 : 1;
    const score = misread * 100 + Math.abs(script - want) * 3 + k * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = seed;
    }
  }
  return best;
}
