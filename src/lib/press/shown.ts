import { PRESS_COPY, PRESS_PATH, PRESS_UPDATED } from "@/content/press";
import { PRESS_NUMBERS } from "@/content/press-numbers";
import { PRESS_SAMPLE } from "@/content/press-sample";
import { localizedUrl } from "@/lib/seo";
import { getManifest } from "@/templates/manifests";
import { pressDate, pressFigures, pressLive, type PressLocale, type PressNumbers } from "./figures";

export type ShownPress = { numbers: PressNumbers; sample: boolean };

/**
 * What /press shows: the committed snapshot once it is on and whole; on a dev server started with
 * PRESS_PREVIEW=1, the invented sample (marked as one, and noindex); otherwise nothing, and the
 * page is a 404. A production build never shows the sample, whatever the variable says.
 */
export function shownPress(given: { numbers?: PressNumbers; preview?: boolean; production?: boolean } = {}): ShownPress | null {
  const numbers = given.numbers ?? PRESS_NUMBERS;
  if (pressLive(numbers)) return { numbers, sample: false };
  const preview = given.preview ?? process.env.PRESS_PREVIEW === "1";
  const production = given.production ?? process.env.NODE_ENV === "production";
  return preview && !production ? { numbers: PRESS_SAMPLE, sample: true } : null;
}

/** The footer's link to the page, once the real figures are in. Never for the sample. */
export function pressNav(locale: PressLocale, numbers: PressNumbers = PRESS_NUMBERS): { href: string; label: string } | null {
  return pressLive(numbers) ? { href: PRESS_PATH, label: PRESS_COPY[locale].nav } : null;
}

/** The page's date for the sitemap: the later of its words' day and its figures' day; undefined while it is off. */
export function pressUpdated(numbers: PressNumbers = PRESS_NUMBERS): string | undefined {
  if (!pressLive(numbers)) return undefined;
  // Both are YYYY-MM-DD, so comparing the strings compares the days.
  return PRESS_UPDATED > numbers.asOf ? PRESS_UPDATED : numbers.asOf;
}

/** The figures as lines of /llms.txt (English), or none while the page is off. */
export function pressBrief(numbers: PressNumbers = PRESS_NUMBERS): string[] {
  if (!pressLive(numbers)) return [];
  const f = Object.fromEntries(pressFigures(numbers, "en").map((x) => [x.id, x.value]));
  const names = numbers.topTemplates.map(({ slug }) => getManifest(slug)?.name.en ?? slug).join(", ");
  return [
    "## Ethos in numbers",
    "",
    `- Counted from Ethos's own database on ${pressDate(numbers.asOf, "en")}; every figure is rounded down.`,
    `- Cards made (finished and published; drafts and test cards are left out): ${f.cardsMade}.`,
    `- Cards opened, not counting the ten minutes after a card's first open or last edit: ${f.cardsOpened}.`,
    `- Opens per opened card: ${f.opensEach}. Opened more than once: ${f.openedAgain}. Opens on a phone, of those whose device is known: ${f.onPhone}.`,
    `- The five most-made templates: ${names}.`,
    `- [Ethos in numbers](${localizedUrl("en", PRESS_PATH)}): the method, and pictures for an article.`,
    "",
  ];
}
