import { OCCASIONS, isOccasion, type Occasion } from "@/config/occasions";

/**
 * The gift finder's reasoning (/gifts/finder): two answers in (who, and the occasion), the
 * templates that fit out, best first, and a feeling that re-ranks them for anyone who wants to.
 * Pure, with no React and no template data of its own, so it runs the same in a test, on the
 * server and in the browser. What each template suits is written by hand in
 * src/content/finder.ts; the manifests say which occasions a template was made for.
 */

/** Who the gift is for. The first seven have a gift-ideas page of their own (/gifts/for-…). */
export const FINDER_RECIPIENTS = ["girlfriend", "boyfriend", "wife", "husband", "mom", "dad", "best-friend", "someone"] as const;
export type FinderRecipient = (typeof FINDER_RECIPIENTS)[number];
/**
 * The people the first question offers as cards: all but "someone else". With "Not sure" that is
 * eight cards, two even rows of four on a desk (the owner, 22 Nov 2026: "remove the someone else…
 * its not symmetrical"). "Someone else" is still an answer an address can carry (`?for=someone`),
 * so a link made before still opens on its picks; a visitor with nobody on the cards taps "Not sure".
 */
export const FINDER_RECIPIENTS_SHOWN = FINDER_RECIPIENTS.filter((r) => r !== "someone");

/** The four a "romantic" sentence is written to: it may say "the two of you", "the day you met", "both your names". */
export const FINDER_PARTNERS = ["girlfriend", "boyfriend", "wife", "husband"] as const satisfies readonly FinderRecipient[];

export const FINDER_FEELS = ["romantic", "funny", "sentimental", "unusual"] as const;
export type FinderFeel = (typeof FINDER_FEELS)[number];

/** "Not sure": the question was answered, and the answer narrows nothing. */
export const ANY = "any";
export type Any = typeof ANY;

/**
 * The two questions, in the order they are asked. The feeling used to be a third (the first
 * version, Nov 2026): it is now three or four small pills over the results, and never asked.
 */
export const FINDER_STEPS = ["for", "occasion"] as const;
export type FinderStep = (typeof FINDER_STEPS)[number];

/** Everything the address carries about a result, in the order it is written there. */
export const FINDER_KEYS = ["for", "occasion", "feel"] as const;
export type FinderKey = (typeof FINDER_KEYS)[number];

/** An answer per question; null while it is still open. The keys are the address's parameters. */
export type FinderAnswers = {
  for: FinderRecipient | Any | null;
  occasion: Occasion | Any | null;
  /** Not a question: a pill over the results. Null and "any" both mean no pill is on. */
  feel: FinderFeel | Any | null;
};

export const NO_ANSWERS: FinderAnswers = { for: null, occasion: null, feel: null };

const isRecipient = (v: string): v is FinderRecipient => (FINDER_RECIPIENTS as readonly string[]).includes(v);
const isFeel = (v: string): v is FinderFeel => (FINDER_FEELS as readonly string[]).includes(v);

/**
 * The answers an address carries (`?for=mom&occasion=birthday`, and `&feel=funny` when a pill is
 * on). Anything it doesn't recognise is an open question, never an error: a link cut short in a
 * chat, or typed by hand, starts at the first question it leaves unanswered. `who` is read as
 * `for` where an address has no `for`: it is what the question is called, and what people type.
 */
export function parseAnswers(search: string | URLSearchParams): FinderAnswers {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const read = (key: string) => (params.get(key) ?? "").trim().toLowerCase();
  const who = read("for") || read("who");
  const occasion = read("occasion");
  const feel = read("feel");
  return {
    for: who === ANY || isRecipient(who) ? who : null,
    occasion: occasion === ANY || isOccasion(occasion) ? occasion : null,
    feel: feel === ANY || isFeel(feel) ? feel : null,
  };
}

/** The answers as a query string, in the order they are asked, or "" when there are none. */
export function answersQuery(answers: FinderAnswers): string {
  const params = new URLSearchParams();
  for (const key of FINDER_KEYS) {
    const value = answers[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The first question still open, or null once both are answered and the picks can show. */
export function openStep(answers: FinderAnswers): FinderStep | null {
  return FINDER_STEPS.find((step) => answers[step] === null) ?? null;
}

/** The feeling whose pill is on, if one is. */
export function chosenFeel(answers: FinderAnswers): FinderFeel | null {
  return answers.feel && answers.feel !== ANY ? answers.feel : null;
}

/**
 * The question an address asks to see again (`&ask=for`): someone on the results tapped one of
 * their two answers to change it. The answers stay in the address, so the question opens with the
 * current one marked, and Back returns to the results.
 */
export const FINDER_ASK = "ask";
export function askedStep(search: string | URLSearchParams): FinderStep | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const asked = (params.get(FINDER_ASK) ?? "").trim().toLowerCase();
  return (FINDER_STEPS as readonly string[]).includes(asked) ? (asked as FinderStep) : null;
}

// --- the occasions the second question shows ---

/** How many occasions the second question shows at once; the rest wait behind "More occasions". */
export const OCCASIONS_SHOWN = 6;

const COUPLE_DAYS: readonly Occasion[] = ["birthday", "anniversary", "valentines", "christmas", "long-distance", "apology"];
const MARRIED_DAYS: readonly Occasion[] = ["birthday", "anniversary", "valentines", "christmas", "apology", "just-because"];

/**
 * The six occasions that matter most for each person, most likely first: a mother is asked about
 * Mother's Day and never about Valentine's, a friend about a graduation. Whatever is left is
 * behind "More occasions", so nothing is out of reach.
 */
export const OCCASIONS_FOR: Record<FinderRecipient | Any, readonly Occasion[]> = {
  girlfriend: COUPLE_DAYS,
  boyfriend: COUPLE_DAYS,
  wife: MARRIED_DAYS,
  husband: MARRIED_DAYS,
  mom: ["birthday", "mothers-day", "christmas", "long-distance", "apology", "just-because"],
  dad: ["birthday", "fathers-day", "christmas", "long-distance", "apology", "just-because"],
  "best-friend": ["birthday", "christmas", "graduation", "wedding", "long-distance", "just-because"],
  someone: ["birthday", "anniversary", "christmas", "wedding", "graduation", "just-because"],
  [ANY]: ["birthday", "anniversary", "valentines", "christmas", "long-distance", "just-because"],
};

/** A day people shop for weeks ahead: from the first date to the day itself, month and day, both included. */
const SEASONS: readonly { occasion: Occasion; from: readonly [number, number]; to: readonly [number, number] }[] = [
  { occasion: "christmas", from: [11, 15], to: [12, 25] },
  { occasion: "valentines", from: [1, 25], to: [2, 14] },
];

/** A date as the page was rendered with it: "2026-11-22". Only its month and day are read. */
export type FinderDay = string;

/** The occasions in season on a day, by the calendar date written in it (no time zones: the page passes the day it was rendered). */
export function occasionsInSeason(day: FinderDay): Occasion[] {
  const [, month, date] = day.split("-").map(Number);
  if (!month || !date) return [];
  const at = month * 100 + date;
  return SEASONS.filter(({ from, to }) => at >= from[0] * 100 + from[1] && at <= to[0] * 100 + to[1]).map(({ occasion }) => occasion);
}

/**
 * The second question for a person, on a day: the six that matter most to them, with whatever is
 * in season moved to the front (Christmas from 15 Nov to 25 Dec), and the rest for "More occasions".
 * A season only reorders a person's own six: a mother is not asked about Valentine's in February.
 */
export function occasionsFor(who: FinderAnswers["for"], day: FinderDay): { first: Occasion[]; more: Occasion[] } {
  const own = OCCASIONS_FOR[who ?? ANY];
  const season = occasionsInSeason(day).filter((o) => own.includes(o));
  const first = [...season, ...own.filter((o) => !season.includes(o))].slice(0, OCCASIONS_SHOWN);
  return { first, more: OCCASIONS.filter((o) => !first.includes(o)) };
}

// --- which templates fit, and in what order ---

/** What the finder knows about one template: its manifest's occasions and order, and its hand-written fit. */
export type FinderGift = {
  slug: string;
  /** From the manifest, most central first. */
  occasions: readonly Occasion[];
  sortOrder: number;
  /** Who it suits. Someone outside this list is never offered it, whatever else matches. */
  for: readonly FinderRecipient[];
  /** What it feels like, strongest first. */
  feels: readonly FinderFeel[];
  /**
   * The only occasions it is offered for: a seasonal template (Halloween, Christmas, Thanksgiving)
   * or one drawn around a single day (a birthday cake, a graduation cap). Without it a template
   * can be offered for any occasion, and ranks higher for the ones in its manifest.
   */
  only?: readonly Occasion[];
  /** The people whose gift-ideas page (/gifts/for-…) already recommends it. */
  listedFor?: readonly FinderRecipient[];
  /**
   * It only makes sense when something the finder never asks is true (Pack Your Bags: the present
   * is a trip). It is still offered, and its sentence opens with the condition, but it is never the
   * first pick: the best template that needs nothing of the kind goes ahead of it.
   */
  conditional?: boolean;
};

/** Ties go to what people buy most, in this order (the owner's list, Nov 2026). */
export const BEST_SELLERS = ["the-letter", "birthday-cinema", "bouquet", "constellations", "xoxo", "the-council"] as const;

/** A template made for the occasion leads one that merely suits it: 30 for the first in its manifest, 4 less per place. */
const OCCASION_POINTS = 30;
const OCCASION_STEP = 4;
const OCCASION_FLOOR = 10;
/** Its strongest feeling, its second, its third. */
const FEEL_POINTS = [20, 14, 10] as const;
/** It is already on that person's gift-ideas page. */
const LISTED_POINTS = 8;

/** Whether a template may be shown for these answers at all. */
export function fits(gift: FinderGift, answers: FinderAnswers): boolean {
  if (answers.for && answers.for !== ANY && !gift.for.includes(answers.for)) return false;
  if (gift.only) return answers.occasion !== null && answers.occasion !== ANY && gift.only.includes(answers.occasion);
  return true;
}

/** How well a template that fits matches: the occasion counts most, then the feeling, then the person. */
export function score(gift: FinderGift, answers: FinderAnswers): number {
  let points = 0;
  if (answers.occasion && answers.occasion !== ANY) {
    const place = gift.occasions.indexOf(answers.occasion);
    if (place >= 0) points += Math.max(OCCASION_POINTS - OCCASION_STEP * place, OCCASION_FLOOR);
  }
  if (answers.feel && answers.feel !== ANY) {
    const place = gift.feels.indexOf(answers.feel);
    if (place >= 0) points += FEEL_POINTS[place] ?? FEEL_POINTS[FEEL_POINTS.length - 1];
  }
  if (answers.for && answers.for !== ANY && gift.listedFor?.includes(answers.for)) points += LISTED_POINTS;
  return points;
}

const sellerRank = (slug: string) => {
  const place = (BEST_SELLERS as readonly string[]).indexOf(slug);
  return place < 0 ? BEST_SELLERS.length : place;
};

/**
 * Every template that fits the answers, best first. Ties go to the best sellers, then to the
 * gallery's own order, then to the name, so the same answers always give the same list. A
 * conditional template never leads it (see FinderGift.conditional).
 */
export function rankGifts<T extends FinderGift>(gifts: readonly T[], answers: FinderAnswers): T[] {
  const ranked = gifts
    .filter((gift) => fits(gift, answers))
    .map((gift) => ({ gift, points: score(gift, answers) }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        sellerRank(a.gift.slug) - sellerRank(b.gift.slug) ||
        a.gift.sortOrder - b.gift.sortOrder ||
        a.gift.slug.localeCompare(b.gift.slug),
    )
    .map(({ gift }) => gift);
  const lead = ranked.findIndex((gift) => !gift.conditional);
  if (lead > 0) ranked.unshift(...ranked.splice(lead, 1));
  return ranked;
}

/** How many picks a result opens with, and how many "Show three more" adds. */
export const PICKS_PER_PAGE = 3;

/**
 * The gift each answer card shows: one that answer leads to. The best pick for the first answer,
 * and for each one after it the best that no earlier card already shows, so nine answers are nine
 * different pictures (the best seller alone would be on most of them). A gift that only makes
 * sense when something nobody asked is true (a trip's reveal) is not what an answer is pictured
 * by. Every card gets a picture: with nothing new left to show, an answer repeats its own best pick.
 *
 * `answers` is what is already known; `step` the question the cards answer; `options` its answers
 * in the order the cards are drawn ("any" for "Not sure").
 */
export function answerGifts<T extends FinderGift, V extends string>(gifts: readonly T[], answers: FinderAnswers, step: FinderStep, options: readonly V[]): Map<V, T> {
  const shown = new Set<string>();
  const cards = new Map<V, T>();
  for (const option of options) {
    const ranked = rankGifts(gifts, { ...answers, [step]: option });
    const gift = ranked.find((g) => !shown.has(g.slug) && !g.conditional) ?? ranked.find((g) => !shown.has(g.slug)) ?? ranked[0];
    if (!gift) continue;
    shown.add(gift.slug);
    cards.set(option, gift);
  }
  return cards;
}

/**
 * Set on the tool's wrapper, before the page paints, when the address already carries answers: the
 * static HTML shows the first question, and a shared result would flash it before the picks. The
 * page's inline script sets it (and takes it off again by itself if nothing hydrates); the tool
 * removes it the moment it has read the address.
 */
export const FINDER_WAIT = "data-finder-wait";

/** That inline script: only when the address answers the first question (as `for`, or as `who`). */
export const finderWaitScript = (): string =>
  `(function(s){try{var q=new URLSearchParams(location.search);if(q.get("for")||q.get("who")){var e=s.parentElement;e.setAttribute(${JSON.stringify(FINDER_WAIT)},"");setTimeout(function(){e.removeAttribute(${JSON.stringify(FINDER_WAIT)})},4000)}}catch(_){}})(document.currentScript)`;

/**
 * Why a template fits, in the words written for the answer: the person's own sentence when it has
 * one (a gift reads differently for a mother than for a girlfriend), else the feeling's, else the
 * template's general one.
 *
 * The "romantic" sentence is written to a partner and read by nobody else. A mother, a father, a
 * friend, "someone else" and "Not sure" get the general one: the first draft showed a mother that
 * "Will you marry me?" fits the last scratch card. Every other sentence is written for anyone.
 *
 * A partner is the commonest answer, and since the feeling stopped being a question nobody is asked
 * for one: so on the days a partner's gift is a romantic one anyway (ROMANTIC_DAYS), a partner
 * reads the romantic sentence without tapping its pill. With another pill on, that pill is what
 * they asked for, and they read its sentence or the general one.
 */
export type FinderReasons<T> = { base: T } & Partial<Record<FinderRecipient | FinderFeel, T>>;

/** For a partner these read as romantic without asking: an anniversary, Valentine's, no occasion at all, and "Not sure". */
export const ROMANTIC_DAYS: readonly (Occasion | Any)[] = ["anniversary", "valentines", "just-because", ANY];

/** Which of a template's sentences an answer reads. */
export function reasonKey<T>(why: FinderReasons<T>, answers: FinderAnswers): keyof FinderReasons<T> {
  const who = answers.for && answers.for !== ANY ? answers.for : null;
  if (who && why[who] !== undefined) return who;
  const partner = who !== null && (FINDER_PARTNERS as readonly string[]).includes(who);
  const feel = chosenFeel(answers);
  const written = feel !== "romantic" || partner;
  if (feel && written && why[feel] !== undefined) return feel;
  if (!feel && partner && answers.occasion !== null && ROMANTIC_DAYS.includes(answers.occasion) && why.romantic !== undefined) return "romantic";
  return "base";
}

export function pickReason<T>(why: FinderReasons<T>, answers: FinderAnswers): T {
  return why[reasonKey(why, answers)] as T;
}

// --- the line under a pick ---

/** The most words a pick's line may be (DESIGN-LESS-TEXT.md: a section's one line is fourteen at most). */
export const REASON_WORDS = 14;

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * A pick's line: its sentence cut to at most fourteen words, and never mid-thought. As many whole
 * sentences as fit; where even the first is too long, that sentence up to its first colon or
 * semicolon, or else its last comma, wherever that leaves a clause of five words or more. Never at
 * a comma inside a list of choices (cutsList): "hearts, stars or cakes" cut after "hearts" says one
 * thing where the gift has three. Null where nothing gives a whole clause. The rule is a first
 * draft, not the last word: a line it cuts badly, or cannot cut, is written by hand
 * (content/finder.ts, FINDER_SHORT), and a test fails for a sentence that has neither. The whole
 * sentence is still on the card, in its closed "Why this one".
 */
export function shortReason(sentence: string, max = REASON_WORDS): string | null {
  // A sentence ends where the next word starts one: «¿serás mi boo?» si no… and "be my boo?" unless… carry on.
  const sentences: string[] = [];
  let from = 0;
  for (const end of sentence.matchAll(/[.!?]+["”»]?(?=\s+[A-ZÁÉÍÓÚÑ¿¡"«“\d]|\s*$)/g)) {
    sentences.push(sentence.slice(from, end.index + end[0].length).trim());
    from = end.index + end[0].length;
  }
  if (sentence.slice(from).trim()) sentences.push(sentence.slice(from).trim());
  let whole = "";
  for (const next of sentences) {
    const joined = whole ? `${whole} ${next}` : next;
    if (countWords(joined) > max) break;
    whole = joined;
  }
  if (whole) return whole;
  const first = sentences[0];
  const clause = (at: number) => first.slice(0, at).trim();
  const fitsLine = (text: string) => countWords(text) <= max && countWords(text) >= 5;
  const stops = [...first.matchAll(/[;:](?=\s)/g)].map((m) => m.index!);
  const commas = [...first.matchAll(/,(?=\s)/g)]
    .map((m) => m.index!)
    .filter((at) => !cutsList(first.slice(at)))
    .reverse();
  for (const at of [...stops, ...commas]) if (fitsLine(clause(at))) return `${clause(at)}.`;
  return null;
}

/** One thing in a list: up to four words with no punctuation between them ("black and white", "Brahms' Lullaby"). */
const LIST_ITEM = /\s+(?:[^\s,.;:]+\s+){0,3}[^\s,.;:]+/.source;
/** From a comma on: any number of such things, each closed by its own comma, then one that goes on to "or" ("o", "u"). */
const LIST_REST = new RegExp(`^(?:,${LIST_ITEM})*,\\s+(?:[^\\s,.;:]+\\s+){1,4}(?:or|o|u)\\s+\\S`);

/**
 * Whether what follows a comma (the comma first) is the rest of a list of choices: "…falling
 * hearts, stars or cakes in a small retro game", "…in colour, black and white or sepia", "…a heart,
 * and Swan Lake, Brahms' Lullaby or Für Elise". A line cut at such a comma names the first of the
 * choices as if it were the only one, so the rule never cuts there.
 */
export function cutsList(rest: string): boolean {
  return LIST_REST.test(rest);
}
