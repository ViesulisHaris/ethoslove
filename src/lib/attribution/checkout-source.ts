import { z } from "zod";
import type { Db } from "@/lib/commerce/db";
import { CLICK_PLATFORMS, channelOf, cleanLanding, isHost, sourceOf, utmValue, type Channel, type ClickPlatform } from "./source";

/**
 * The checkout's record of where its buyer came from (migration 0019, `checkout_sources`), keyed by
 * the purchase id: purchases.id once paid. Written by POST /api/stripe/checkout after it has
 * answered, so a slow or missing table can never hold up or fail a checkout; it costs the record
 * only, and says so in the logs. Never sent to Stripe (the account is shared).
 */

/**
 * What the browser sends (lib/attribution/first-visit.ts, `CheckoutSource`). Every field is checked
 * again in `checkoutSourceRow`: anything malformed is dropped, never an error.
 */
const text = z.string().max(300).optional().catch(undefined);
export const checkoutSourceInput = z
  .object({
    landing: text,
    referrer: text,
    utmSource: text,
    utmMedium: text,
    utmCampaign: text,
    click: z.enum(CLICK_PLATFORMS).optional().catch(undefined),
    at: z.number().finite().optional().catch(undefined),
    remembered: z.boolean().optional().catch(undefined),
  })
  .optional()
  .catch(undefined);
export type CheckoutSourceInput = z.infer<typeof checkoutSourceInput>;

export type CheckoutSourceRow = {
  purchase_id: string;
  landing: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  click: ClickPlatform | null;
  ref: string | null;
  channel: Channel;
  source: string;
  remembered: boolean;
  first_seen_at: string | null;
};

const DAY_MS = 86_400_000;
/** The browser keeps a first visit for 30 days; a day either side for clocks that are off. */
const FIRST_SEEN_PAST_MS = 31 * DAY_MS;
const FIRST_SEEN_FUTURE_MS = DAY_MS;

/**
 * The row to store, made only from what passes the same checks the browser made (a landing is cut
 * back to plain slugs or its section, a referrer must be a bare host name, utm tags lose anything
 * id-like). `ref` is the checkout's own, already cleaned for Stripe's metadata (metadataRef).
 * Nothing at all when the browser sent nothing: an older page from before this existed.
 */
export function checkoutSourceRow(purchaseId: string, input: CheckoutSourceInput, ref: string | undefined, now: number): CheckoutSourceRow | null {
  if (!input) return null;
  const landing = input.landing ? cleanLanding(input.landing) : undefined;
  const referrer = input.referrer && isHost(input.referrer) ? input.referrer : undefined;
  const utmSource = utmValue(input.utmSource);
  const utmMedium = utmValue(input.utmMedium);
  const utmCampaign = utmValue(input.utmCampaign);
  const click = input.click;
  const at = input.at !== undefined && input.at <= now + FIRST_SEEN_FUTURE_MS && input.at >= now - FIRST_SEEN_PAST_MS ? input.at : undefined;
  const classified = { landing: landing ?? "", referrer, utmSource, utmMedium, utmCampaign, click, ref };
  return {
    purchase_id: purchaseId,
    landing: landing ?? null,
    referrer: referrer ?? null,
    utm_source: utmSource ?? null,
    utm_medium: utmMedium ?? null,
    utm_campaign: utmCampaign ?? null,
    click: click ?? null,
    ref: ref ?? null,
    channel: channelOf(classified),
    source: sourceOf(classified),
    remembered: input.remembered === true,
    first_seen_at: at !== undefined ? new Date(at).toISOString() : null,
  };
}

let warned = false;

/** Stores the row. Never throws; a database without migration 0019 is said once per instance. */
export async function saveCheckoutSource(admin: Db, row: CheckoutSourceRow): Promise<boolean> {
  try {
    const { error } = await admin.from("checkout_sources").insert(row);
    if (!error) return true;
    const missing = error.code === "42P01" || error.code === "PGRST205";
    if (!missing || !warned) console.error(`[attribution] checkout source not saved${missing ? ": is migration 0019 applied?" : ""}`, error.code ?? "", error.message);
    if (missing) warned = true;
  } catch (e) {
    console.error("[attribution] checkout source not saved", e instanceof Error ? e.message : "unknown");
  }
  return false;
}

/**
 * Forgets the record of checkouts never paid once they are 30 days old (the daily job,
 * api/cron/unlock): a paid one stays with its purchase. Null when it couldn't run.
 */
export async function forgetUnpaidCheckoutSources(admin: Db): Promise<number | null> {
  try {
    const { data, error } = await admin.rpc("forget_unpaid_checkout_sources", { p_days: 30 });
    if (error) {
      console.error("[attribution] unpaid checkout sources not forgotten", error.code ?? "", error.message);
      return null;
    }
    return typeof data === "number" ? data : 0;
  } catch (e) {
    console.error("[attribution] unpaid checkout sources not forgotten", e instanceof Error ? e.message : "unknown");
    return null;
  }
}
