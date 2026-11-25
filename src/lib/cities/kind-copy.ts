import { CITY_KIND_COPY, CITY_KIND_NOUNS, CITY_KIND_WORDS, DATE_KIND_COPY } from "@/content/date-kinds";
import type { DateKind } from "@/lib/dates/date-kinds";
import { cityName, type City } from "./cities";
import { CITY_KIND_PAIRS, pairHero, pairIdeas, pairPick } from "./kind-pairs";

/*
 * The words of a city pair's page (/dates/<city>/<kind>). Server and tests only, like ./kind-pairs.
 */

export type PairCopy = {
  title: string;
  description: string;
  heading: string;
  line: string;
  /** The hero's sentence when the page has no real places to name (the map's tiles failed). */
  sentence: string;
  hero: string;
  /** False for a pair whose words are composed: it is a page for visitors, kept out of the index and the sitemap (dates2-C2). */
  indexed: boolean;
};

const fill = (text: string, values: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const MAX_LINE_WORDS = 14;
const NUMBERS: Record<"en" | "es", readonly string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"],
  es: ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"],
};
/** A count in words inside a sentence, as the hand-written pages write it. */
const inWords = (n: number, locale: "en" | "es"): string => NUMBERS[locale][n] ?? String(n);

/** The pairs with words of their own (CITY_KIND_COPY): the only ones in the index and the sitemap. */
export const isWrittenPair = (citySlug: string, kind: string): boolean => `${citySlug}/${kind}` in CITY_KIND_COPY;
export const WRITTEN_CITY_KIND_PAIRS = CITY_KIND_PAIRS.filter((p) => isWrittenPair(p.city, p.kind));

/** The words of one pair's page: the hand-written ones where there are any, else composed from the kind's and the city's own data. */
export function pairCopy(city: City, kind: DateKind, locale: "en" | "es"): PairCopy {
  const copy = DATE_KIND_COPY[kind];
  if (!copy) throw new Error(`no words for the kind ${kind}`);
  const ideas = pairIdeas(city, kind);
  const written = CITY_KIND_COPY[`${city.slug}/${kind}`];
  if (written) {
    const hero = pairHero(city, kind, [written.hero, copy.hero].filter((id): id is string => Boolean(id)));
    return { title: written.title[locale], description: written.description[locale], heading: written.heading[locale], line: written.line[locale], sentence: written.sentence[locale], hero, indexed: true };
  }
  const words = CITY_KIND_WORDS[locale];
  const nouns = CITY_KIND_NOUNS[kind as keyof typeof CITY_KIND_NOUNS];
  const name = cityName(city, locale);
  const phrase = copy.phrase[locale];
  const values: Record<string, string> = {
    count: inWords(ideas.length, locale),
    city: name,
    phrase,
    phraseLower: phrase.toLowerCase(),
    phraseSentence: phrase.charAt(0) + phrase.slice(1).toLowerCase(),
    dates: nouns.dates[locale],
    short: nouns.short,
    first: ideas[0].title[locale],
    last: ideas[ideas.length - 1].title[locale],
  };
  // The searched form: "Cheap Date Ideas in NYC".
  const title = fill(words.title, { ...values, city: locale === "en" && city.slug === "new-york" ? "NYC" : name });
  // The line and the picture are the same idea: the city's own pick where it has one for this page.
  const pick = pairPick(city, kind);
  const pickLine = pick ? fill(words.pick, { city: name, idea: pick.title[locale] }) : null;
  const named = pickLine !== null && wordCount(pickLine) <= MAX_LINE_WORDS;
  const hero = named ? pick!.id : pairHero(city, kind, [copy.hero]);
  // Search shows about 155 characters: two long idea titles drop the planner's sentence, not a word of the first.
  const full = fill(words.description, values);
  const description = full.length <= 155 ? full : full.slice(0, full.indexOf(". ") + 1);
  return {
    title,
    description,
    heading: fill(words.heading, values),
    line: named ? pickLine! : copy.line[locale],
    sentence: fill(words.noPlaces, values),
    hero,
    indexed: false,
  };
}

/**
 * The hero's sentence on the page itself, which knows the city's real places: a composed page names
 * two of the places its cards stop at, so its sentence is its own; without any, it says the map will
 * find them. Hand-written pages keep their own sentence.
 */
export function pairSentence(city: City, kind: DateKind, locale: "en" | "es", copy: PairCopy, placeNames: readonly string[]): string {
  if (copy.indexed) return copy.sentence;
  const names = [...new Set(placeNames)].slice(0, 2);
  if (names.length === 0) return copy.sentence;
  const words = CITY_KIND_WORDS[locale];
  const nouns = CITY_KIND_NOUNS[kind as keyof typeof CITY_KIND_NOUNS];
  const places = names.length === 2 ? fill(words.two, { a: names[0], b: names[1] }) : names[0];
  return fill(words.withPlaces, { city: cityName(city, locale), count: inWords(pairIdeas(city, kind).length, locale), dates: nouns.dates[locale], places });
}
