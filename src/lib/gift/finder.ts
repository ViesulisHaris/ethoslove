import { OCCASIONS, isOccasion, type Occasion } from "@/config/occasions";

/**
 * The gift finder's reasoning (/gifts/finder): three answers in, the templates that fit out, best
 * first. Pure, with no React and no template data of its own, so it runs the same in a test, on
 * the server and in the browser. What each template suits is written by hand in
 * src/content/finder.ts; the manifests say which occasions a template was made for.
 */

/** Who the gift is for. The first seven have a gift-ideas page of their own (/gifts/for-…). */
export const FINDER_RECIPIENTS = ["girlfriend", "boyfriend", "wife", "husband", "mom", "dad", "best-friend", "someone"] as const;
export type FinderRecipient = (typeof FINDER_RECIPIENTS)[number];

/** The four a "romantic" sentence is written to: it may say "the two of you", "the day you met", "both your names". */
export const FINDER_PARTNERS = ["girlfriend", "boyfriend", "wife", "husband"] as const satisfies readonly FinderRecipient[];

export const FINDER_FEELS = ["romantic", "funny", "sentimental", "unusual"] as const;
export type FinderFeel = (typeof FINDER_FEELS)[number];

/** The occasions the second question shows at once; the rest wait behind "Something else". */
export const FINDER_OCCASIONS = ["birthday", "anniversary", "valentines", "christmas", "long-distance", "apology", "just-because"] as const satisfies readonly Occasion[];
export const FINDER_MORE_OCCASIONS: readonly Occasion[] = OCCASIONS.filter((o) => !(FINDER_OCCASIONS as readonly Occasion[]).includes(o));

/** "Not sure": the question was answered, and the answer narrows nothing. */
export const ANY = "any";
export type Any = typeof ANY;

export const FINDER_STEPS = ["for", "occasion", "feel"] as const;
export type FinderStep = (typeof FINDER_STEPS)[number];

/** An answer per question; null while it is still open. The keys are the address's parameters. */
export type FinderAnswers = {
  for: FinderRecipient | Any | null;
  occasion: Occasion | Any | null;
  feel: FinderFeel | Any | null;
};

export const NO_ANSWERS: FinderAnswers = { for: null, occasion: null, feel: null };

const isRecipient = (v: string): v is FinderRecipient => (FINDER_RECIPIENTS as readonly string[]).includes(v);
const isFeel = (v: string): v is FinderFeel => (FINDER_FEELS as readonly string[]).includes(v);

/**
 * The answers an address carries (`?for=mom&occasion=birthday&feel=funny`). Anything it doesn't
 * recognise is an open question, never an error: a link cut short in a chat, or typed by hand,
 * starts at the first question it leaves unanswered.
 */
export function parseAnswers(search: string | URLSearchParams): FinderAnswers {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const read = (key: FinderStep) => (params.get(key) ?? "").trim().toLowerCase();
  const who = read("for");
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
  for (const step of FINDER_STEPS) {
    const value = answers[step];
    if (value) params.set(step, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The first question still open, or null once all three are answered and the picks can show. */
export function openStep(answers: FinderAnswers): FinderStep | null {
  return FINDER_STEPS.find((step) => answers[step] === null) ?? null;
}

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
 * Set on the tool's wrapper, before the page paints, when the address already carries answers: the
 * static HTML shows the first question, and a shared result would flash it before the picks. The
 * page's inline script sets it (and takes it off again by itself if nothing hydrates); the tool
 * removes it the moment it has read the address.
 */
export const FINDER_WAIT = "data-finder-wait";

/** That inline script: only when one of the three answers is in the address. */
export const finderWaitScript = (): string =>
  `(function(s){try{var q=new URLSearchParams(location.search);if(${FINDER_STEPS.map((step) => `q.get(${JSON.stringify(step)})`).join("||")}){var e=s.parentElement;e.setAttribute(${JSON.stringify(FINDER_WAIT)},"");setTimeout(function(){e.removeAttribute(${JSON.stringify(FINDER_WAIT)})},4000)}}catch(_){}})(document.currentScript)`;

/**
 * Why a template fits, in the words written for the answer: the person's own sentence when it has
 * one (a gift reads differently for a mother than for a girlfriend), else the feeling's, else the
 * template's general one.
 *
 * The "romantic" sentence is written to a partner and read by nobody else. A mother, a father, a
 * friend, "someone else" and "Not sure" get the general one: the first draft showed a mother that
 * "Will you marry me?" fits the last scratch card. Every other sentence is written for anyone.
 */
export type FinderReasons<T> = { base: T } & Partial<Record<FinderRecipient | FinderFeel, T>>;

export function pickReason<T>(why: FinderReasons<T>, answers: FinderAnswers): T {
  const who = answers.for && answers.for !== ANY ? answers.for : null;
  if (who && why[who] !== undefined) return why[who] as T;
  const feel = answers.feel && answers.feel !== ANY ? answers.feel : null;
  const written = feel !== "romantic" || (who !== null && (FINDER_PARTNERS as readonly string[]).includes(who));
  if (feel && written && why[feel] !== undefined) return why[feel] as T;
  return why.base;
}
