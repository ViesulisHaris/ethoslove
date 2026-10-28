import { track as vercelTrack } from "@vercel/analytics";
import { isInApp } from "@/lib/app/bridge";

/**
 * The funnel, as named events in Vercel Web Analytics (cookieless, so no consent is needed, the
 * same as its page views). Pages alone can't say where the 96% of free makers stop, or which
 * partner button earns; these can.
 *
 * Properties carry no personal data and no gift ids: a template slug, a product, a partner and
 * where the button sat is the most any of them holds.
 */
export type FunnelEvent =
  | "editor_opened"
  | "publish_sheet_shown"
  | "pay_clicked"
  | "purchase_completed"
  | "extras_offer_shown"
  | "bump_toggled"
  | "second_toggled"
  | "etsy_claim_sent"
  | "etsy_claimed"
  | "etsy_found"
  | "affiliate_click"
  | "reminder_saved"
  | "reply_started"
  | "pack_offer_shown"
  | "tour_step"
  | "tour_skipped"
  | "city_page_cta"
  | "unwrap_picked"
  // A free template's gift moved into a premium one from the editor ("Same words, a bigger moment").
  | "gift_moved"
  // Saved dates: which kind was saved and whether by a member, which reason opened the upsell, which maps app a whole date went to. No ids, no places.
  | "saved_date_saved"
  | "saved_date_upsell"
  | "maps_opened"
  // "Keep this gift": the end screen's tap (the template), and the keep page sent (how many reminders were asked for). No ids, no addresses.
  | "keep_tapped"
  | "keep_requested";

type Props = Record<string, string | number | boolean | null>;

export function track(event: FunnelEvent, props?: Props): void {
  // Nothing is measured inside the iPhone app, which promises no analytics.
  if (isInApp()) return;
  try {
    vercelTrack(event, props);
  } catch {
    // Analytics never gets to break a page.
  }
}
