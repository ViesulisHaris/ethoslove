import type { GiftCountdown, GiftData } from "@/lib/gift/schema";
import { countdownDay } from "@/lib/lifecycle/reminders";
import { findAirport } from "@/lib/trips/airports";
import { aviasalesSearch, autoEuropeHire, tiqetsSearch, type PartnerId } from "@/lib/trips/partners";
// The manifest, not lib/trips/trip-gift: that one brings every preset trip into the share screen.
import { manifest as packYourBags } from "@/templates/pack-your-bags/manifest";

/**
 * "Book the trip", under a published "Pack your bags": the surprise is made, now the real tickets.
 * Only what the gift already says is used: where from, where to, the kind of trip, the day the
 * countdown ends and the nights. A flight search needs both airports; anything we can't place
 * gets no flight button rather than a search for the wrong airport.
 */

export type TripLink = { partner: PartnerId; href: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** The countdown's day, in its own timezone, as YYYY-MM-DD; null when it has passed or can't be read. */
export function departDate(countdown: GiftCountdown | undefined, now: Date): string | null {
  if (!countdown || !(Date.parse(countdown.targetAt) >= now.getTime())) return null;
  return countdownDay(countdown);
}

const plusDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** The destination as the buttons name it, and the buttons; null for any other gift. */
export function tripLinks(data: Pick<GiftData, "templateSlug" | "fields" | "countdown">, locale: "en" | "es", now = new Date()): { city: string; links: TripLink[] } | null {
  if (data.templateSlug !== packYourBags.slug) return null;
  const fields = data.fields ?? {};
  const kind = fields.trip === "road" || fields.trip === "train" ? fields.trip : "flight";
  const fromName = text(fields.fromCity);
  const toName = text(fields.toCity);
  if (!toName) return null;
  const links: TripLink[] = [];

  if (kind === "flight") {
    const from = findAirport(fromName);
    const to = findAirport(toName);
    if (from && to && from.iata !== to.iata) {
      const depart = departDate(data.countdown, now) ?? undefined;
      const nights = typeof fields.nights === "number" && Number.isInteger(fields.nights) && fields.nights > 0 ? fields.nights : undefined;
      // The metro code where there is one: "any London airport" finds the cheaper Gatwick flight.
      links.push({ partner: "aviasales", href: aviasalesSearch({ from: from.metro ?? from.iata, to: to.metro ?? to.iata, depart, back: depart && nights ? plusDays(depart, nights) : undefined }) });
    }
  }

  // The destination as the sender typed it, in the gift's language: the airport table's name for it
  // could be another town's.
  links.push({ partner: "tiqets", href: tiqetsSearch(toName, locale) });

  if (kind === "road") links.push({ partner: "autoeurope", href: autoEuropeHire() });
  return { city: toName, links };
}
