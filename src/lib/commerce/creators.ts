import { normaliseCreatorCode } from "./codes";
import type { Db } from "./db";

/**
 * The creator programme: a creator shares their personal link, `?ref=c-<code>`, and earns their
 * commission on the sales that arrive through it (scripts/creator-payouts.mjs). There is no buyer
 * discount and no code to type anywhere: a code shown to every viewer is a public price cut, and a
 * typed code leaks (LOVE did). The ref is held in memory only (lib/attribution/ref.ts), so nothing is
 * stored on the visitor's device and no consent is needed.
 */

/** The standard deal: what creators.commission_pct defaults to (migration 0009). */
export const CREATOR_COMMISSION_PCT = 30;
/** Earnings are paid monthly once they pass this; less carries over to the next month. */
export const CREATOR_PAYOUT_MIN_EUR = 20;

/** The ref a creator's personal link carries: "c-" and their code, in lower case (REF_PATTERN). */
export const CREATOR_REF_PREFIX = "c-";

export const creatorRef = (code: string) => `${CREATOR_REF_PREFIX}${code.toLowerCase()}`;

/** The creator code a ref names ("c-maya" → "MAYA"), or null when the ref isn't a creator's link. */
export function creatorCodeFromRef(ref: string | null | undefined): string | null {
  if (!ref?.startsWith(CREATOR_REF_PREFIX)) return null;
  return normaliseCreatorCode(ref.slice(CREATOR_REF_PREFIX.length));
}

/**
 * The creator to credit with a sale that arrived through `ref`: an active creator, and not the buyer
 * themselves. A creator's own purchases earn nothing (the /creators page says so); a signed-in buyer
 * whose email is the creator's contact is caught here, and the payout report checks every sale again
 * by the buyer's account email, guests included.
 */
export async function creditedCreator(db: Db, ref: string | null | undefined, buyerEmail: string | null | undefined): Promise<string | null> {
  const code = creatorCodeFromRef(ref);
  if (!code) return null;
  const { data } = await db.from("creators").select("code, contact, active").eq("code", code).maybeSingle();
  if (!data?.active) return null;
  const buyer = buyerEmail?.trim().toLowerCase();
  if (buyer && data.contact?.trim().toLowerCase() === buyer) return null;
  return data.code;
}
