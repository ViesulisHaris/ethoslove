import { CITY_KIND_COPY, CITY_KIND_NOUNS, CITY_KIND_WORDS, DATE_KIND_COPY } from "@/content/date-kinds";
import type { DateKind } from "@/lib/dates/date-kinds";
import { cityName, type City } from "./cities";
import { pairHero, pairIdeas } from "./kind-pairs";

/*
 * The words of a city pair's page (/dates/<city>/<kind>). Server and tests only, like ./kind-pairs.
 */

export type PairCopy = { title: string; description: string; heading: string; line: string; sentence: string; hero: string };

const fill = (text: string, values: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const MAX_LINE_WORDS = 14;

/** The words of one pair's page: the hand-written ones where there are any, else composed from the kind's and the city's own data. */
export function pairCopy(city: City, kind: DateKind, locale: "en" | "es"): PairCopy {
  const copy = DATE_KIND_COPY[kind];
  if (!copy) throw new Error(`no words for the kind ${kind}`);
  const ideas = pairIdeas(city, kind);
  const written = CITY_KIND_COPY[`${city.slug}/${kind}`];
  const hero = pairHero(
    city,
    kind,
    [written?.hero, copy.hero].filter((id): id is string => Boolean(id)),
  );
  if (written) {
    return { title: written.title[locale], description: written.description[locale], heading: written.heading[locale], line: written.line[locale], sentence: written.sentence[locale], hero };
  }
  const words = CITY_KIND_WORDS[locale];
  const nouns = CITY_KIND_NOUNS[kind as keyof typeof CITY_KIND_NOUNS];
  const name = cityName(city, locale);
  const phrase = copy.phrase[locale];
  const values: Record<string, string> = {
    count: String(ideas.length),
    city: name,
    phrase,
    phraseLower: phrase.toLowerCase(),
    phraseSentence: phrase.charAt(0) + phrase.slice(1).toLowerCase(),
    dates: nouns.dates[locale],
    short: nouns.short,
  };
  // The searched form: "Cheap Date Ideas in NYC".
  const title = fill(words.title, { ...values, city: locale === "en" && city.slug === "new-york" ? "NYC" : name });
  const shown = new Set(ideas.map((idea) => idea.id));
  const pickLine = city.picks
    .map((id) => ideas.find((idea) => idea.id === id && shown.has(id)))
    .filter((idea) => idea !== undefined)
    .map((idea) => fill(words.pick, { city: name, idea: idea.title[locale] }))
    .find((line) => wordCount(line) <= MAX_LINE_WORDS);
  return {
    title,
    description: fill(words.description, values),
    heading: fill(words.heading, values),
    line: pickLine ?? copy.line[locale],
    sentence: fill(words.sentence, values),
    hero,
  };
}
