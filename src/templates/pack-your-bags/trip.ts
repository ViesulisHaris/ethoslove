import type { GiftCountdown, GiftLocale } from "@/lib/gift/schema";
import { findAirport } from "@/lib/trips/airports";
import { haversineKm, resolvePlace } from "../_shared/places";
import { hashString, mulberry32 } from "../_shared/random";
import type { TripKind } from "./schema";

/**
 * What the ticket says: codes, gate, seats, times, the date and how far it is. All of it follows
 * from the gift itself (the names and the places seed the rest), so the pass reads the same on the
 * server, on the client, in the editor's still frame and on every replay.
 */

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * The three big letters on the pass: the airport's own code when we know the place ("London"
 * is LHR, "Crete" is HER), otherwise the first three letters of the name, as station boards do.
 */
export function placeCode(name: string): string {
  const airport = findAirport(name);
  if (airport) return airport.iata;
  const letters = fold(name).toUpperCase().replace(/[^A-Z]/g, "");
  return (letters || "XXX").slice(0, 3).padEnd(3, "X");
}

/** Coordinates for a place someone typed: the city table, then the airports, then nothing. */
export function locate(name: string, coords?: string): { lat: number; lng: number } | null {
  const place = resolvePlace(name, coords);
  if (place) return place;
  const airport = findAirport(name);
  return airport ? { lat: airport.lat, lng: airport.lng } : null;
}

/**
 * Kilometres along the trip as the crow flies, through every stop we can place. Null unless both
 * ends are known: a distance that quietly skipped the start would be a wrong number on a ticket.
 */
export function tripKm(from: { lat: number; lng: number } | null, stops: ({ lat: number; lng: number } | null)[], to: { lat: number; lng: number } | null): number | null {
  if (!from || !to) return null;
  const legs = [from, ...stops.filter((s): s is { lat: number; lng: number } => Boolean(s)), to];
  let km = 0;
  for (let i = 1; i < legs.length; i++) km += haversineKm(legs[i - 1], legs[i]);
  return Math.round(km);
}

/** Roads wander: a drive is about this much longer than the straight line between its towns. */
export const ROAD_WINDING = 1.25;
/** Cruising speed plus the half hour a flight spends taxiing, climbing and coming down. */
const FLIGHT_KMH = 800;
const FLIGHT_OVERHEAD_MIN = 30;
/** Averages with the stops included: an intercity train, and a car on country roads. */
const TRAIN_KMH = 120;
const ROAD_KMH = 75;

/** Roughly how long the trip takes, rounded to five minutes. */
export function travelMinutes(km: number, kind: TripKind): number {
  const minutes =
    kind === "flight" ? (km / FLIGHT_KMH) * 60 + FLIGHT_OVERHEAD_MIN : kind === "train" ? (km / TRAIN_KMH) * 60 : ((km * ROAD_WINDING) / ROAD_KMH) * 60;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** "3 h 40 min", "45 min", "6 h": the same in both languages. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Anything scattered on the pass is seeded from who it's for and where they're going. */
export function tripSeed(recipient: string, sender: string, from: string, to: string): number {
  return hashString(`${recipient}|${sender}|${from}|${to}|pack-your-bags`);
}

const GATE_LETTERS = "ABCDEFGH";

export type TicketDetails = {
  /** "HR 214": the two people's initials and a number. */
  flightNo: string;
  trainNo: string;
  gate: string;
  platform: string;
  coach: string;
  /** Side by side, on a plane: ["3A", "3B"]. */
  seats: [string, string];
  /** A train numbers its seats instead: ["21", "22"]. */
  trainSeats: [string, string];
  /** "09:40". */
  departs: string;
  /** Half an hour before a flight leaves. */
  boards: string;
};

const initial = (name: string) => fold(name).toUpperCase().replace(/[^A-Z]/g, "").charAt(0);

/** Minutes after midnight as a board prints them: "09:40". */
export const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** The departure time the countdown points at, in its own timezone, or null. */
export function countdownClock(countdown: GiftCountdown | undefined): number | null {
  if (!countdown) return null;
  const at = new Date(countdown.targetAt);
  if (Number.isNaN(at.getTime())) return null;
  const parts = (timeZone?: string) =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).formatToParts(at);
  let found: Intl.DateTimeFormatPart[];
  try {
    found = parts(countdown.timezone);
  } catch {
    found = parts("UTC");
  }
  const h = Number(found.find((p) => p.type === "hour")?.value);
  const m = Number(found.find((p) => p.type === "minute")?.value);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

export function ticketDetails(seed: number, names: { recipient: string; sender: string }, countdown?: GiftCountdown): TicketDetails {
  const rng = mulberry32(seed);
  const pick = (n: number) => Math.floor(rng() * n);
  const letters = `${initial(names.recipient)}${initial(names.sender)}`;
  const flightNo = `${letters.length === 2 ? letters : "XO"} ${100 + pick(900)}`;
  const trainNo = String(1000 + pick(9000));
  const gate = `${GATE_LETTERS[pick(GATE_LETTERS.length)]}${1 + pick(29)}`;
  const platform = String(1 + pick(12));
  const coach = String(1 + pick(9));
  const row = 1 + pick(12);
  const seatNo = 11 + pick(50);
  // Morning to early evening, on the five minutes, unless the countdown says exactly when.
  const seededTime = 6 * 60 + pick(160) * 5;
  const departsAt = countdownClock(countdown) ?? seededTime;
  return {
    flightNo,
    trainNo,
    gate,
    platform,
    coach,
    seats: [`${row}A`, `${row}B`],
    trainSeats: [String(seatNo), String(seatNo + 1)],
    departs: clock(departsAt),
    boards: clock(departsAt - 30),
  };
}

/**
 * The date on the ticket and the luggage tag: what the sender typed, else the countdown's day in
 * the gift's language ("Fri 16 Oct", "vie 16 oct"), else `soon`.
 */
export function ticketDate(when: string, countdown: GiftCountdown | undefined, locale: GiftLocale, soon: string): string {
  const typed = when.trim();
  if (typed) return typed;
  if (countdown) {
    const at = new Date(countdown.targetAt);
    if (!Number.isNaN(at.getTime())) {
      // en-GB gives "Fri 16 Oct", the order a ticket prints; plain "en" would give "Fri, Oct 16".
      const format = (timeZone?: string) =>
        new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone }).format(at).replace(/,/g, "").replace(/\.(?=\s|$)/g, "");
      try {
        return format(countdown.timezone);
      } catch {
        return format("UTC");
      }
    }
  }
  return soon;
}

/** What goes in the case when the sender didn't say: a list that fits the trip, in the gift's language. */
export const DEFAULT_CLUES: Record<TripKind, Record<GiftLocale, string[]>> = {
  flight: {
    en: ["passport", "sunglasses", "your comfiest hoodie", "something for warm evenings"],
    es: ["pasaporte", "gafas de sol", "tu sudadera más cómoda", "algo para las noches de calor"],
  },
  road: {
    en: ["a good playlist", "snacks for the car", "comfy shoes", "a jumper for the evenings"],
    es: ["una buena playlist", "picoteo para el coche", "zapatillas cómodas", "una chaqueta para la noche"],
  },
  train: {
    en: ["a good book", "a scarf", "snacks", "headphones"],
    es: ["un buen libro", "una bufanda", "algo para picar", "los cascos"],
  },
};

export function cluesFor(kind: TripKind, clues: string[], locale: GiftLocale): string[] {
  const own = clues.map((c) => c.trim()).filter(Boolean);
  return own.length ? own : (DEFAULT_CLUES[kind]?.[locale] ?? DEFAULT_CLUES[kind].en);
}

/** The pass's barcode as alternating bar and gap widths: guard bars, then seeded ones, the same every time. */
export function barcode(seed: number, pairs = 44): number[] {
  const rng = mulberry32(seed ^ 0x0ba5c0de);
  const widths = [1, 1, 1, 1];
  for (let i = 0; i < pairs * 2; i++) widths.push(1 + Math.floor(rng() * (i % 2 ? 3 : 4)));
  widths.push(1, 1, 1);
  return widths;
}

/**
 * A square ticket code: a bullseye in the middle, as the codes on rail tickets have, and seeded
 * dots around it. `size` cells a side, row by row.
 */
export function codeGrid(seed: number, size = 19): boolean[] {
  const rng = mulberry32(seed ^ 0x7a11c0de);
  const mid = Math.floor(size / 2);
  return Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    const ring = Math.max(Math.abs(x - mid), Math.abs(y - mid));
    if (ring <= 4) return ring % 2 === 0;
    if (ring === 5) return (x + y) % 2 === 0;
    return rng() < 0.5;
  });
}

/**
 * Where a torn edge is jagged, tooth by tooth, as fractions of its depth: high and low in turn,
 * each a little different, so the stub and the pass come apart like card rather than a zigzag rule.
 */
export function tearEdge(seed: number, teeth = 22): number[] {
  const rng = mulberry32(seed ^ 0x7ea2);
  return Array.from({ length: teeth + 1 }, (_, i) => (i % 2 ? 0.05 + rng() * 0.35 : 0.6 + rng() * 0.4));
}

/**
 * The other departures on the board, so it looks like a real one: well-known places a plane or a
 * train might leave for, in the gift's language, as a board would print them. Never the trip's own
 * places, and never more than ten letters, so the column stays narrow on a phone.
 */
export const DECOYS: Record<"air" | "rail", Record<GiftLocale, string[]>> = {
  air: {
    en: ["AMSTERDAM", "REYKJAVIK", "NEW YORK", "HELSINKI", "VIENNA", "COPENHAGEN", "ISTANBUL", "TOKYO", "OSLO", "PRAGUE", "DUBLIN", "ZURICH", "ATHENS", "BERLIN", "PARIS", "MARRAKECH"],
    es: ["ÁMSTERDAM", "REIKIAVIK", "NUEVA YORK", "HELSINKI", "VIENA", "COPENHAGUE", "ESTAMBUL", "TOKIO", "OSLO", "PRAGA", "DUBLÍN", "ZÚRICH", "ATENAS", "BERLÍN", "PARÍS", "MARRAKECH"],
  },
  rail: {
    en: ["PARIS", "VIENNA", "ZURICH", "PRAGUE", "MUNICH", "BERLIN", "MILAN", "BRUSSELS", "AMSTERDAM", "VENICE", "BOLOGNA", "SALZBURG"],
    es: ["PARÍS", "VIENA", "ZÚRICH", "PRAGA", "MÚNICH", "BERLÍN", "MILÁN", "BRUSELAS", "ÁMSTERDAM", "VENECIA", "BOLONIA", "SALZBURGO"],
  },
};

const plain = (s: string) => fold(s).toUpperCase().trim();

/** Three later departures: [time, place, gate or platform] each, padded to line up in columns. */
export function decoyRows(kind: "flight" | "train", locale: GiftLocale, seed: number, departs: string, avoid: string[]): string[][] {
  const rng = mulberry32(seed ^ 0xdec0);
  const skip = new Set(avoid.map(plain));
  const pool = (DECOYS[kind === "flight" ? "air" : "rail"][locale] ?? DECOYS.air.en).filter((p) => !skip.has(plain(p)));
  const picks: string[] = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const [h, m] = departs.split(":").map(Number);
  let at = (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
  const width = Math.max(...picks.map((p) => p.length), 1);
  return picks.map((place) => {
    at += 10 + Math.floor(rng() * 5) * 5;
    const where = kind === "flight" ? `${GATE_LETTERS[Math.floor(rng() * GATE_LETTERS.length)]}${1 + Math.floor(rng() * 29)}`.padEnd(3) : String(1 + Math.floor(rng() * 12)).padStart(2);
    return [clock(at), place.padEnd(width), where];
  });
}
