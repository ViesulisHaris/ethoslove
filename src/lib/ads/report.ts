import type Stripe from "stripe";
import type { ReportOutcome } from "./purchase";
import { reportToMeta } from "./meta";
import { reportToTikTok } from "./tiktok";

/**
 * A paid checkout, reported to every ad platform that is configured, side by side (see ./purchase.ts).
 * Never throws: the answers are only for the log and the tests.
 */
export async function reportPurchase(session: Stripe.Checkout.Session): Promise<{ meta: ReportOutcome; tiktok: ReportOutcome }> {
  const [meta, tiktok] = await Promise.all([reportToMeta(session), reportToTikTok(session)]);
  return { meta, tiktok };
}
