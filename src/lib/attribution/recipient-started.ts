import type { RecipientVia } from "./recipient";

/**
 * The rule behind `recipient_started` (docs/marketing/LOOP-KPI.md): a recipient "starts their own
 * within seven days" (audit R7). Pure, and safe in the browser: it imports a type only.
 */

/** Seven whole days, to the millisecond. */
export const STARTED_WITHIN_DAYS = 7;
const WINDOW_MS = STARTED_WITHIN_DAYS * 86_400_000;

/**
 * Where the gift this one came from is known (a sealed reply token named it): whether it was first
 * opened no more than seven days before `now`. No open recorded yet reads as "just now" (the page
 * that minted the token was drawn a moment ago); so does a first open that reads later than `now`.
 */
export function openedWithin7(firstOpenedAt: number | null, now: number): boolean {
  if (firstOpenedAt === null) return true;
  return now - firstOpenedAt <= WINDOW_MS;
}

/**
 * Where nothing names the gift: the door says it. "reply", "g" and "watermark" live in the tab's
 * memory only, so the gift is being started in the visit it was opened in. "gift-keep" is the
 * reminder a kept gift sends, nine days before a date and usually months after the gift.
 */
export function within7ByDoor(via: RecipientVia): boolean {
  return via !== "gift-keep";
}
