import { roundDown } from "@/lib/proof/numbers";
import { getManifest } from "@/templates/manifests";

/**
 * The figures of the press page (/press, "Ethos in numbers"): their shape as the query returns
 * them (scripts/press-numbers.sql), the gate that keeps the page off until they are whole, and the
 * one way they are written: counts rounded down to two significant figures, shares and averages
 * worked out here and rounded down, never typed by hand. Pure: no React, no environment, no files.
 */

export type PressLocale = "en" | "es";

/** The occasions a reminder can be for that the page may name ("other" is in the total only). */
export const REMINDER_OCCASIONS = ["birthday", "anniversary", "valentines"] as const;
export type ReminderOccasion = (typeof REMINDER_OCCASIONS)[number];

/**
 * The press page's figures as scripts/press-numbers.sql returns them: whole counts, never an
 * average or a share (those are worked out below, rounded down). `ready` is the page's switch.
 */
export type PressNumbers = {
  ready: boolean;
  /** The day the query was run, YYYY-MM-DD (UTC). */
  asOf: string;
  cardsMade: number;
  cardsOpened: number;
  opens: number;
  openedAgain: number;
  phoneOpens: number;
  deviceOpens: number;
  /** The five most-made templates, most first. */
  topTemplates: readonly { slug: string; made: number }[];
  /** Not from the database (it stores no country): typed in from Stripe's export, or null. */
  countries: number | null;
  reminders: ({ total: number } & Record<ReminderOccasion, number>) | null;
};

/** The counts a snapshot must have, each above zero, before the page may show. */
export const PRESS_COUNTS = ["cardsMade", "cardsOpened", "opens", "openedAgain", "phoneOpens", "deviceOpens"] as const;
export const PRESS_TOP = 5;
/** No count can be older than the day the query was written. */
export const PRESS_EARLIEST = "2026-11-01";
/** Fewer reminders than this and their split is not said at all. */
export const REMINDERS_WORTH_SAYING = 100;

export type PressFigureId = "cardsMade" | "cardsOpened" | "opensEach" | "openedAgain" | "onPhone" | "countries";
export type PressFigure = { id: PressFigureId; value: string } | { id: "reminder"; value: string; occasion: ReminderOccasion };

const isDay = (day: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  try {
    return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
  } catch {
    return false;
  }
};

const positive = (n: unknown): boolean => Number.isInteger(n) && (n as number) > 0;
const today = () => new Date().toISOString().slice(0, 10);

/** Every reason the snapshot may not be shown, as "<key>: <what>"; none when it is whole. */
export function pressProblems(numbers: PressNumbers, on: string = today()): string[] {
  const problems: string[] = [];
  const n = numbers;

  if (!isDay(n.asOf)) problems.push(`asOf: ${JSON.stringify(n.asOf)} is not a day`);
  else if (n.asOf > on) problems.push(`asOf: ${n.asOf} is after ${on}`);
  else if (n.asOf < PRESS_EARLIEST) problems.push(`asOf: ${n.asOf} is before ${PRESS_EARLIEST}`);

  for (const key of PRESS_COUNTS) if (!positive(n[key])) problems.push(`${key}: ${n[key]}`);

  if (n.cardsOpened > n.cardsMade) problems.push(`cardsOpened: ${n.cardsOpened} is more than cardsMade ${n.cardsMade}`);
  if (n.opens < n.cardsOpened) problems.push(`opens: ${n.opens} is fewer than cardsOpened ${n.cardsOpened}`);
  if (n.openedAgain > n.cardsOpened) problems.push(`openedAgain: ${n.openedAgain} is more than cardsOpened ${n.cardsOpened}`);
  if (n.deviceOpens > n.opens) problems.push(`deviceOpens: ${n.deviceOpens} is more than opens ${n.opens}`);
  if (n.phoneOpens > n.deviceOpens) problems.push(`phoneOpens: ${n.phoneOpens} is more than deviceOpens ${n.deviceOpens}`);

  if (n.topTemplates.length !== PRESS_TOP) problems.push(`topTemplates: ${n.topTemplates.length} templates, not ${PRESS_TOP}`);
  const seen = new Set<string>();
  n.topTemplates.forEach((t, i) => {
    if (!getManifest(t.slug)) problems.push(`topTemplates: "${t.slug}" is no template`);
    if (!positive(t.made)) problems.push(`topTemplates: ${t.slug} made ${t.made}`);
    if (seen.has(t.slug)) problems.push(`topTemplates: ${t.slug} twice`);
    seen.add(t.slug);
    const before = n.topTemplates[i - 1];
    if (before && t.made > before.made) problems.push(`topTemplates: ${t.slug} (${t.made}) is above ${before.slug} (${before.made})`);
  });
  const madeTop = n.topTemplates.reduce((sum, t) => sum + t.made, 0);
  if (madeTop > n.cardsMade) problems.push(`topTemplates: ${madeTop} made, more than cardsMade ${n.cardsMade}`);

  if (n.countries !== null && !(Number.isInteger(n.countries) && n.countries >= 1 && n.countries <= 249)) problems.push(`countries: ${n.countries}`);

  if (n.reminders !== null) {
    const r = n.reminders;
    if (!positive(r.total)) problems.push(`reminders: total ${r.total}`);
    for (const o of REMINDER_OCCASIONS) if (!(Number.isInteger(r[o]) && r[o] >= 0)) problems.push(`reminders: ${o} ${r[o]}`);
    const named = REMINDER_OCCASIONS.reduce((sum, o) => sum + r[o], 0);
    if (named > r.total) problems.push(`reminders: ${named} named, more than the total ${r.total}`);
  }

  return problems;
}

/** Whether the page may show these figures: switched on, and whole. */
export function pressLive(numbers: PressNumbers, on?: string): boolean {
  return numbers.ready && pressProblems(numbers, on).length === 0;
}

const intlLocale = (locale: PressLocale) => (locale === "es" ? "es-ES" : "en-GB");

/** A count, rounded down to two significant figures, with "+" when that took something off. */
function count(value: number, locale: PressLocale): string {
  const shown = roundDown(value);
  return `${new Intl.NumberFormat(intlLocale(locale)).format(shown)}${shown < value ? "+" : ""}`;
}

/** A share in whole per cent, rounded down. */
function share(part: number, of: number, locale: PressLocale): string {
  const whole = of > 0 ? Math.floor((part / of) * 100) : 0;
  return new Intl.NumberFormat(intlLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(whole / 100);
}

/** The figures the page shows, in its order; one the snapshot lacks is left out. */
export function pressFigures(numbers: PressNumbers, locale: PressLocale): PressFigure[] {
  const n = numbers;
  const each = n.cardsOpened > 0 ? Math.floor((n.opens / n.cardsOpened) * 10) / 10 : 0;
  const figures: PressFigure[] = [
    { id: "cardsMade", value: count(n.cardsMade, locale) },
    { id: "cardsOpened", value: count(n.cardsOpened, locale) },
    { id: "opensEach", value: new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(each) },
    { id: "openedAgain", value: share(n.openedAgain, n.cardsOpened, locale) },
    { id: "onPhone", value: share(n.phoneOpens, n.deviceOpens, locale) },
  ];
  if (n.countries !== null) figures.push({ id: "countries", value: new Intl.NumberFormat(intlLocale(locale)).format(n.countries) });
  const r = n.reminders;
  if (r && r.total >= REMINDERS_WORTH_SAYING) {
    // The largest; a tie goes to the earlier in REMINDER_OCCASIONS.
    const occasion = REMINDER_OCCASIONS.reduce((best, o) => (r[o] > r[best] ? o : best), REMINDER_OCCASIONS[0]);
    if (r[occasion] > 0) figures.push({ id: "reminder", value: share(r[occasion], r.total, locale), occasion });
  }
  return figures;
}

/** The five templates, in the snapshot's order, each with its share of all cards made. */
export function pressTemplates(numbers: PressNumbers, locale: PressLocale): { slug: string; share: string }[] {
  return numbers.topTemplates.map(({ slug, made }) => ({ slug, share: share(made, numbers.cardsMade, locale) }));
}

/** The day the figures were counted, written out: "20 November 2026", "20 de noviembre de 2026". */
export function pressDate(asOf: string, locale: PressLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${asOf}T12:00:00Z`));
}
