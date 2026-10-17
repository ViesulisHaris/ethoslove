import type { MembershipPlan, MembershipStatus } from "@/lib/membership/types";

/**
 * What the checkout success page says about Ethos for Two, from the row the checkout started (read by
 * its purchase, docs/MEMBERSHIP.md 4.3). Three things can stand between a paid checkout and that row,
 * and each reads differently: the bank still confirming the first payment ("processing": nothing has
 * gone wrong, we'll email), the row not written yet ("arriving": try again in a moment), or the read
 * itself failing ("unreadable": the payment is fine, the account page has it). Only the first is a
 * payment still being processed.
 */
export type StartedRow = { plan: MembershipPlan; status: MembershipStatus; current_period_end: string | null; partner_user_id: string | null };
export type StartedRead = { kind: "found"; row: StartedRow } | { kind: "arriving" } | { kind: "unreadable" };

/** A few short tries on the server before the page says it's still arriving: a webhook racing the page takes well under a second. */
export const ARRIVING_TRIES = 3;
export const ARRIVING_WAIT_MS = 350;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Reads the row with `read` (a query that answers { data, error }), trying again while it isn't
 * there yet. An error is not retried: it isn't going to be there on the next try either.
 */
export async function readStartedMembership(
  read: () => PromiseLike<{ data: StartedRow | null; error: unknown }>,
  options: { tries?: number; waitMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<StartedRead> {
  const { tries = ARRIVING_TRIES, waitMs = ARRIVING_WAIT_MS, sleep = pause } = options;
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt > 0) await sleep(waitMs * attempt);
    let answer: { data: StartedRow | null; error: unknown };
    try {
      answer = await read();
    } catch {
      return { kind: "unreadable" };
    }
    if (answer.error) return { kind: "unreadable" };
    if (answer.data) return { kind: "found", row: answer.data };
  }
  return { kind: "arriving" };
}

export type MembershipSuccess =
  | { kind: "on"; plan: MembershipPlan; renewsOn: string | null; partnerJoined: boolean }
  | { kind: "processing" }
  | { kind: "arriving" }
  | { kind: "unreadable" };

/**
 * `pending`: Stripe says the checkout isn't paid yet (a bank debit, a bank confirming). Otherwise the
 * row decides. One that has already ended (a withdrawal within minutes) is left to the account page,
 * which knows the rest: this page never says it's on when it isn't.
 */
export function membershipSuccess(pending: boolean, read: StartedRead | null): MembershipSuccess {
  if (pending) return { kind: "processing" };
  if (!read || read.kind === "unreadable") return { kind: "unreadable" };
  if (read.kind === "arriving") return { kind: "arriving" };
  const { row } = read;
  if (row.status === "incomplete") return { kind: "processing" };
  if (row.status === "ended") return { kind: "unreadable" };
  return { kind: "on", plan: row.plan, renewsOn: row.current_period_end, partnerJoined: Boolean(row.partner_user_id) };
}
