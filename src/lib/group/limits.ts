import { CONTRIBUTION_LIMITS } from "@/lib/gift/schema";

/**
 * A group card's limits, in one place: the routes answer with these, the page counts against them,
 * and migration 0023's checks and trigger are the backstop for two requests arriving together
 * (tests/unit/migrations-group.test.ts keeps the SQL and this file in step).
 */
export const GROUP_LIMITS = {
  /** "Your name, as they know you" and "Who it's for", as the page at the link says them. */
  name: 40,
  /** "What should they write?", one line. */
  prompt: 140,
  /** A contributor's name and the longest note any template takes (the gift's own ceilings). */
  entryName: CONTRIBUTION_LIMITS.name,
  entryNote: CONTRIBUTION_LIMITS.note,
  /** The shortest `noteMax` a template may ask for. */
  noteFloor: 20,
  /** Notes waiting or in the gift, per group: at most the template's own, never more than this. */
  open: CONTRIBUTION_LIMITS.max,
  /** Every note a group has ever been sent, turned down and taken back ones included. */
  total: 60,
  /** A link takes notes for this many days; "Keep it open" adds as many again, never past `maxDays` from the start. */
  days: 30,
  maxDays: 90,
  /** A photo as it arrives, and its longest edge once the server has re-encoded it. */
  photoBytes: 2 * 1024 * 1024,
  photoEdge: 1600,
  /** The whole request, before anything is parsed. */
  bodyBytes: 3.5 * 1024 * 1024,
} as const;

/** How long the daily job keeps things (docs/GROUP.md, "What is kept and for how long"). */
export const GROUP_RETENTION = {
  /** A note turned down, removed or taken back keeps its words this long: the sender's undo. */
  undoHours: 24,
  /** An address that never confirmed. */
  unconfirmedDays: 7,
  /** Every note of a card that was sent. */
  afterSentDays: 7,
  /** Every note of a card never sent, counted from when its link closed. */
  afterClosedDays: 14,
} as const;
