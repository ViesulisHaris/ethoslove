import { FREE_SAVED_DATES } from "@/lib/pricing/products";
import type { SavedDatesList, SavedDateSummary, SavedPerson } from "@/lib/saved-dates/types";

/**
 * My dates in each of its states, for the development-only preview (/for-two/preview/my-dates):
 * the real page needs a signed-in account, and the dev server's database is production, where
 * nobody signs in for a screenshot or a test. No card has a cover place, so nothing asks the photo
 * store; the trip's picture is its preset's own.
 */
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const MY_DATES_PREVIEW_STATES = ["empty", "free", "free-full", "member", "ended"] as const;
export type MyDatesPreviewState = (typeof MY_DATES_PREVIEW_STATES)[number];

export const isMyDatesPreviewState = (value: unknown): value is MyDatesPreviewState => MY_DATES_PREVIEW_STATES.includes(value as MyDatesPreviewState);

const person = (name: string): SavedPerson => ({ name, initial: name[0] });
const ANA = person("Ana");
const BEN = person("Ben");

function item(n: number, over: Partial<SavedDateSummary>, now: number): SavedDateSummary {
  const at = new Date(now - n * 7 * HOUR).toISOString();
  return {
    id: `5a7ed0a7-0000-4000-8000-00000000000${n}`,
    kind: "date",
    title: "",
    city: "Lisbon",
    day: null,
    stopsCount: 3,
    cover: null,
    ideaId: null,
    tripId: null,
    mine: true,
    owner: ANA,
    lastEditedBy: ANA,
    editable: true,
    remind: true,
    version: 1,
    createdAt: at,
    updatedAt: at,
    ...over,
  };
}

const dayIn = (days: number, now: number) => new Date(now + days * DAY).toISOString().slice(0, 10);

export function previewSavedDates(state: MyDatesPreviewState, now: number = Date.now()): SavedDatesList {
  const free = (items: SavedDateSummary[]): SavedDatesList => ({ items, quota: { used: items.length, limit: FREE_SAVED_DATES }, member: false, partner: null });
  const evening = item(1, { title: "An evening in Alfama", day: dayIn(3, now), stopsCount: 4 }, now);
  const trip = item(2, { kind: "trip", title: "", city: null, stopsCount: 0, tripId: "lisbon-slow-weekend" }, now);
  const books = item(3, { title: "Bookshops and a long lunch", city: "Porto", stopsCount: 2, remind: false }, now);
  switch (state) {
    case "empty":
      return free([]);
    case "free":
      return free([evening]);
    case "free-full":
      return free([evening, trip, books]);
    case "member":
      return {
        items: [evening, item(4, { title: "Ben's rooftop surprise", mine: false, owner: BEN, lastEditedBy: BEN, stopsCount: 3 }, now), trip, books],
        quota: { used: 3, limit: null },
        member: true,
        partner: BEN,
      };
    case "ended":
      // Only the three most recently changed stay editable once the membership has ended (MEMBERSHIP 3.1).
      return free([evening, trip, books, item(5, { title: "The one from the summer", city: "Madrid", editable: false }, now)]);
  }
}
