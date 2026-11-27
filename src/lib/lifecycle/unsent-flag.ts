/**
 * The switch for the email about a gift left unsent (lib/lifecycle/unsent-gift.ts). It ships
 * switched off. NEXT_PUBLIC_UNSENT_GIFT_EMAILS:
 *   unset, or anything else  nothing is read and nothing is sent;
 *   "all"                    every account;
 *   an ISO date              only accounts made on or after it, who saw the line under the
 *                            sign-in form when they made it.
 * Public because that line under the sign-in form reads it in the browser (at build time); the
 * job and the privacy policy read it on the server. While it is on, the policy describes the email
 * (content/legal.ts UNSENT_LEGAL); off, the policy says nothing of an email nobody gets.
 */
export type UnsentMode = { on: false } | { on: true; since: number | null };

export function unsentMode(raw: string | undefined = process.env.NEXT_PUBLIC_UNSENT_GIFT_EMAILS): UnsentMode {
  const value = (raw ?? "").trim();
  if (value === "all") return { on: true, since: null };
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return { on: false };
  const since = Date.parse(value);
  return Number.isFinite(since) ? { on: true, since } : { on: false };
}

export const unsentEmailsOn = (): boolean => unsentMode().on;
