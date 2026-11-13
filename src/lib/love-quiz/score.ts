/**
 * The love language quiz's arithmetic, apart from its words (content/love-language-quiz.ts) so the
 * browser gets only one language's questions. Thirty choices, each between two languages; every
 * pair of the five comes up three times, so each language is on offer twelve times and its score
 * is how often it was picked. A result travels in a link as five base-13 digits, which only
 * decode when they add up to thirty.
 */
export const LANGUAGES = ["words", "time", "gifts", "service", "touch"] as const;
export type LoveLanguage = (typeof LANGUAGES)[number];
export type Scores = Record<LoveLanguage, number>;

/** One question's two options, by the language each stands for. */
export type Pair = readonly [LoveLanguage, LoveLanguage];
/** The option picked: 0 is the first, 1 the second, null not yet answered. */
export type Answer = 0 | 1 | null;

export const QUIZ_LENGTH = 30;
/** How many times each language is on offer: 30 questions × 2 options ÷ 5 languages. */
export const PER_LANGUAGE = (QUIZ_LENGTH * 2) / LANGUAGES.length;
/** A first name, as the link carries it. */
export const NAME_MAX = 24;

const DIGITS = "0123456789abc";

export function isLanguage(x: unknown): x is LoveLanguage {
  return typeof x === "string" && (LANGUAGES as readonly string[]).includes(x);
}

export function emptyScores(): Scores {
  return { words: 0, time: 0, gifts: 0, service: 0, touch: 0 };
}

/** How often each language was picked. */
export function score(answers: readonly Answer[], pairs: readonly Pair[]): Scores {
  const s = emptyScores();
  answers.forEach((a, i) => {
    const pair = pairs[i];
    if (pair && (a === 0 || a === 1)) s[pair[a]] += 1;
  });
  return s;
}

export function answered(answers: readonly Answer[]): number {
  return answers.filter((a) => a === 0 || a === 1).length;
}

/** Highest first; a tie keeps the order the five are always listed in. */
export function ranked(s: Scores): LoveLanguage[] {
  return [...LANGUAGES].sort((x, y) => s[y] - s[x]);
}

/** Every language that shares the top score: one, or a tie. */
export function tops(s: Scores): LoveLanguage[] {
  const max = Math.max(...LANGUAGES.map((l) => s[l]));
  return LANGUAGES.filter((l) => s[l] === max);
}

/** Every language that shares the bottom score. */
export function lowest(s: Scores): LoveLanguage[] {
  const min = Math.min(...LANGUAGES.map((l) => s[l]));
  return LANGUAGES.filter((l) => s[l] === min);
}

/** Each language's share of all the answers, in whole percent that add up to 100 (largest remainder). */
export function shares(s: Scores): Scores {
  const total = LANGUAGES.reduce((n, l) => n + s[l], 0);
  const out = emptyScores();
  if (total <= 0) return out;
  const exact = LANGUAGES.map((l) => ({ l, v: (s[l] * 100) / total }));
  let left = 100;
  for (const { l, v } of exact) {
    out[l] = Math.floor(v);
    left -= out[l];
  }
  const byRemainder = [...exact].sort((x, y) => y.v - Math.floor(y.v) - (x.v - Math.floor(x.v)) || LANGUAGES.indexOf(x.l) - LANGUAGES.indexOf(y.l));
  for (let i = 0; i < left; i++) out[byRemainder[i % byRemainder.length]!.l] += 1;
  return out;
}

export function sameScores(x: Scores, y: Scores): boolean {
  return LANGUAGES.every((l) => x[l] === y[l]);
}

/** Five digits, words to touch. */
export function encodeScores(s: Scores): string {
  return LANGUAGES.map((l) => DIGITS[Math.max(0, Math.min(PER_LANGUAGE, s[l]))]).join("");
}

/** A result from a link, or null for anything a finished quiz couldn't have produced. */
export function decodeScores(code: string | null | undefined): Scores | null {
  if (!code || code.length !== LANGUAGES.length) return null;
  const s = emptyScores();
  for (let i = 0; i < LANGUAGES.length; i++) {
    const v = DIGITS.indexOf(code[i]!.toLowerCase());
    if (v < 0 || v > PER_LANGUAGE) return null;
    s[LANGUAGES[i]!] = v;
  }
  return LANGUAGES.reduce((n, l) => n + s[l], 0) === QUIZ_LENGTH ? s : null;
}

/** A first name fit to show: no control characters or line breaks, single spaces, 24 characters at most. */
export function cleanName(raw: string | null | undefined): string {
  if (!raw) return "";
  // Control and format characters (line breaks, zero-width and direction marks) become spaces.
  const flat = raw
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(flat).slice(0, NAME_MAX).join("").trim();
}

export type Person = { scores: Scores; name: string };

/**
 * A shared link's people, from its hash: `#a=<scores>&an=<name>` is one person's result, sent to
 * their partner; `&b=<scores>&bn=<name>` adds the partner's, sent back. The hash never reaches a
 * server, and while it holds a value the ad pixels stay off (lib/analytics/consent).
 */
export function readLink(hash: string): { a: Person | null; b: Person | null } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const person = (key: string): Person | null => {
    const scores = decodeScores(params.get(key));
    return scores ? { scores, name: cleanName(params.get(`${key}n`)) } : null;
  };
  const a = person("a");
  return { a, b: a ? person("b") : null };
}

export function linkHash(a: Person, b?: Person | null): string {
  const params = new URLSearchParams({ a: encodeScores(a.scores) });
  if (a.name) params.set("an", a.name);
  if (b) {
    params.set("b", encodeScores(b.scores));
    if (b.name) params.set("bn", b.name);
  }
  return `#${params.toString()}`;
}
