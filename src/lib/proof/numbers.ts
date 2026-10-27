/**
 * What the site may say about itself, worked out from what the database counts (./proof.ts reads
 * it): numbers always rounded down, so they stay true until the next count, and said only when they
 * are worth saying; reactions only when their writer agreed, the owner approved them and the sender
 * didn't say no, and then only the emoji and the words. Nothing here is ever typed in by hand.
 */

/** Below this many gifts opened, the line isn't shown at all. */
export const MIN_OPENED = 100;
/**
 * Opens per gift are said only from this many up. They count every open, the sender's own look
 * included (gift_views can't tell who opened), so the bar is set where the recipients' opens alone
 * are still well over one.
 */
export const OPENS_WORTH_SAYING = 3;

export type ProofNumbers = {
  /** Gifts opened at least once, rounded down to two significant figures. */
  opened: number;
  /** Whether there are more than `opened` ("14,000+"). */
  more: boolean;
  /** Opens per opened gift, down to a tenth, when worth saying; else null. */
  opensEach: number | null;
};

/** Down to two significant figures: 14,237 → 14,000; 987 → 980; 56 → 56. */
export function roundDown(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const whole = Math.floor(n);
  const digits = String(whole).length;
  const step = digits > 2 ? 10 ** (digits - 2) : 1;
  return Math.floor(whole / step) * step;
}

/** From proof_numbers() (0017): { opened, opens }. Null when there's too little to say, or nothing readable. */
export function toProof(raw: { opened?: unknown; opens?: unknown } | null | undefined): ProofNumbers | null {
  const opened = Math.floor(Number(raw?.opened));
  const opens = Math.floor(Number(raw?.opens));
  if (!Number.isFinite(opened) || opened < MIN_OPENED) return null;
  const each = Number.isFinite(opens) && opens >= opened ? Math.floor((opens / opened) * 10) / 10 : 0;
  const shown = roundDown(opened);
  return { opened: shown, more: shown < opened, opensEach: each >= OPENS_WORTH_SAYING ? each : null };
}

/** Words longer than this aren't shown: a line on a card, not a letter. */
export const SHOWN_TEXT_MAX = 140;
/** How long the sender has, after a reaction, to say no before it can appear. */
export const SENDER_DAYS = 7;
const DAY = 86_400_000;
/** Characters that show nothing or turn text round (as lib/lifecycle/reminder-input.ts). */
const UNSEEN = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export type ShownReaction = { emoji: string; text: string };

export type ReactionRow = {
  emoji: string;
  text: string | null;
  share_consent: boolean;
  approved_at: string | null;
  sender_withheld_at: string | null;
  created_at: string;
};

/**
 * A reaction as the site may show it, or null: its writer ticked the box, the owner approved it, the
 * sender didn't say no and has had SENDER_DAYS to, and it has a few words. Only the emoji and the
 * words leave: no name, no voice, nothing of the gift. The words are shown as text, never as markup.
 */
export function shownReaction(row: ReactionRow, now = Date.now()): ShownReaction | null {
  if (!row.share_consent || !row.approved_at || row.sender_withheld_at) return null;
  if (now - new Date(row.created_at).getTime() < SENDER_DAYS * DAY) return null;
  const text = (row.text ?? "").replace(UNSEEN, "").replace(/\s+/g, " ").trim();
  if (!text || text.length > SHOWN_TEXT_MAX) return null;
  return { emoji: row.emoji, text };
}
