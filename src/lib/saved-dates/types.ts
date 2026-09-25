import type { PlaceKind } from "@/lib/dates/kinds";
import type { Plan } from "@/lib/dates/plan";

/**
 * Saved dates and trips (docs/MEMBERSHIP.md 3): what /api/saved-dates answers, and what the plan
 * editor, My dates and the iPhone app read. A saved date is a plan kept with an account; a saved
 * trip is a bookmark of one of the ready-made trips. Free accounts keep FREE_SAVED_DATES of them,
 * members any number, shared with their partner.
 */
export type SavedKind = "date" | "trip";
export type SavedTripData = { v: 1; tripId: string; depart?: string; note?: string };
/** Somebody's name as a card shows it. Never their email: `initial` falls back to its first letter. */
export type SavedPerson = { name: string | null; initial: string };
export type SavedDateSummary = {
  id: string;
  kind: SavedKind;
  title: string;
  city: string | null;
  day: string | null;
  stopsCount: number;
  /** A date's photo comes from its first named stop (the dates photo store); a trip's from its preset. */
  cover: { name: string; lat: number; lng: number; kind: PlaceKind } | null;
  ideaId: string | null;
  tripId: string | null;
  mine: boolean;
  owner: SavedPerson;
  lastEditedBy: SavedPerson | null;
  editable: boolean;
  remind: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type SavedDate = SavedDateSummary & { data: Plan | SavedTripData };
export type SavedDatesList = {
  /** Own and the partner's, newest change first. */
  items: SavedDateSummary[];
  /** `limit` is null for members. */
  quota: { used: number; limit: number | null };
  member: boolean;
  /** The other person, while sharing. */
  partner: SavedPerson | null;
};
export type SavedDatesError =
  | "unauthenticated"
  | "invalid_input"
  | "empty_plan"
  | "unknown_trip"
  | "limit_reached"
  | "read_only"
  | "not_found"
  | "not_owner"
  | "conflict"
  | "rate_limited"
  | "not_configured";

/** Why the upsell sheet opened: the free limit, a read-only date, or a members-only button. */
export type UpsellReason = "limit" | "read_only" | "maps" | "reminders";

/**
 * Sent by the website's own requests (lib/saved-dates/client.ts): "say an outage quietly". Without
 * it (the iPhone app, anything else) saving being unavailable (0015 not applied, the database down,
 * Supabase not configured) is `503 { error: "not_configured" }`, as the contract says. With it the
 * answer is `200 { unavailable: true }`: the page hides its saving buttons, and no failed request
 * lands in the browser's console on every signed-in view of /plan or a trip.
 */
export const QUIET_HEADER = "x-ethos-quiet";
export type SavedDatesUnavailable = { unavailable: true };
