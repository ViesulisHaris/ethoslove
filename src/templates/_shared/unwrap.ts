import type { GiftLocale, GiftUnwrap, GiftUnwrapStop } from "@/lib/gift/schema";
import { KIND_ART, kindImage } from "@/lib/dates/art";
import { formatDay } from "@/lib/dates/calendar";
import { GROUPS, KINDS, type PlaceGroup, type PlaceKind } from "@/lib/dates/kinds";

/**
 * The words and the calendar file behind "a surprise inside" (./UnwrapGift): pure, so the day, the
 * nights and the .ics are unit tested rather than trusted to a component.
 */

const isKind = (kind: string | undefined): kind is PlaceKind => Boolean(kind && kind in KIND_ART);

/** A stop's kind as a reader says it: the dates map's own name for it, or the words the sender gave. */
export function kindLabel(kind: string | undefined, locale: GiftLocale): string | null {
  if (!kind) return null;
  return isKind(kind) ? KINDS[kind].label[locale] : kind;
}

/** What stands in for a stop's photograph: its kind's picture and colour, when it has a kind we draw. */
export function stopArt(stop: Pick<GiftUnwrapStop, "kind" | "name">): { src: string; group: PlaceGroup; tint: string } | null {
  if (!isKind(stop.kind)) return null;
  const group = KINDS[stop.kind].group;
  return { src: kindImage(stop.kind, stop.name), group, tint: GROUPS[group].color };
}

/** "Saturday 12 October" / "sábado, 12 de octubre", or the sender's own words for when, or null for "soon". */
export function unwrapDay(unwrap: Pick<GiftUnwrap, "date" | "when">, locale: GiftLocale): string | null {
  if (unwrap.date) return formatDay(unwrap.date, locale);
  return unwrap.when?.trim() || null;
}

const dayMonth = (ymd: string, locale: GiftLocale) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short" });
};

/** "12 Oct – 17 Oct", or the one day there is. */
export function tripDates(trip: NonNullable<GiftUnwrap["trip"]>, locale: GiftLocale): string | null {
  if (trip.depart && trip.back) return `${dayMonth(trip.depart, locale)} – ${dayMonth(trip.back, locale)}`;
  if (trip.depart) return dayMonth(trip.depart, locale);
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** The nights away: the ones they were given, or the ones between the two days when both are set. */
export function tripNights(trip: NonNullable<GiftUnwrap["trip"]>): number | null {
  if (trip.depart && trip.back) {
    const nights = Math.round((utcDay(trip.back) - utcDay(trip.depart)) / DAY_MS);
    if (nights > 0) return nights;
  }
  return trip.nights ?? null;
}

/* ------------------------------------------------------------------------------------------ */
/* Add to calendar                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Before this a time belongs to the small hours after the evening, as on /plan: 00:30 follows 23:00. */
const NIGHT_ENDS_MIN = 5 * 60;
/** A stop with nothing after it lasts this long. */
const LAST_STOP_MIN = 90;
/** The evening a plan without times is booked as. */
const EVENING = { start: 19 * 60, end: 23 * 60 };

const minuteOf = (time: string) => {
  const m = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return m < NIGHT_ENDS_MIN ? m + 24 * 60 : m;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A floating local time ("20261012T190000", no zone): the evening happens at seven wherever they
 * are, which is what a calendar should show them, not seven in the time zone the gift was made in.
 */
function stamp(ymd: string, minute: number): string {
  const d = new Date(utcDay(ymd) + minute * 60 * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

const utcStamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** RFC 5545 text: backslashes, semicolons, commas and line breaks escaped. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets are folded onto continuation lines, never splitting a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

function hash(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

const EVENT_WORDS = { en: { evening: "Date night", at: "at" }, es: { evening: "Noche de cita", at: "a las" } } as const;

/**
 * The date as a calendar file, or null when there is no day to put it on. Every stop with a time
 * is an event of its own, running until the next one starts; a plan where any stop has no time is
 * one event for the evening instead, with the stops written into it in order.
 */
export function unwrapIcs(unwrap: GiftUnwrap, locale: GiftLocale, now: Date = new Date()): string | null {
  if (unwrap.kind !== "date" || !unwrap.date) return null;
  const day = unwrap.date;
  const words = EVENT_WORDS[locale] ?? EVENT_WORDS.en;
  const where = (name: string) => (unwrap.city ? `${name}, ${unwrap.city}` : name);
  const uid = (i: number) => `${day.replace(/-/g, "")}-${i}-${hash(`${unwrap.title}|${unwrap.stops.map((s) => s.name).join("|")}`)}@tryethos.io`;
  const events: string[][] = [];
  const stops = unwrap.stops;
  const timed = stops.length > 0 && stops.every((s) => s.time);

  if (timed) {
    stops.forEach((s, i) => {
      const start = minuteOf(s.time!);
      const next = stops[i + 1]?.time ? minuteOf(stops[i + 1].time!) : null;
      const end = next !== null && next > start ? next : start + LAST_STOP_MIN;
      events.push([
        `UID:${uid(i)}`,
        `DTSTART:${stamp(day, start)}`,
        `DTEND:${stamp(day, end)}`,
        `SUMMARY:${text(s.name)}`,
        `LOCATION:${text(where(s.name))}`,
        ...(s.lat !== undefined && s.lng !== undefined ? [`GEO:${s.lat};${s.lng}`] : []),
        ...(s.note ? [`DESCRIPTION:${text(s.note)}`] : []),
      ]);
    });
  } else {
    // It starts when the first stop does; when the first has no time, at seven (or earlier, if a later one says so).
    const times = stops.flatMap((s) => (s.time ? [minuteOf(s.time)] : []));
    const start = stops[0]?.time ? minuteOf(stops[0].time) : Math.min(EVENING.start, ...times);
    const end = Math.max(EVENING.end, (times.length ? Math.max(...times) : start) + LAST_STOP_MIN);
    const list = stops.map((s, i) => `${i + 1}. ${s.name}${s.time ? ` ${words.at} ${s.time}` : ""}`).join("\n");
    events.push([
      `UID:${uid(0)}`,
      `DTSTART:${stamp(day, start)}`,
      `DTEND:${stamp(day, end)}`,
      `SUMMARY:${text(unwrap.title || words.evening)}`,
      ...(unwrap.city ? [`LOCATION:${text(unwrap.city)}`] : []),
      ...(list ? [`DESCRIPTION:${text(list)}`] : []),
    ]);
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ethos//A surprise inside//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((e) => ["BEGIN:VEVENT", `DTSTAMP:${utcStamp(now)}`, ...e, "END:VEVENT"]),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
