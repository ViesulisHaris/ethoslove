import { track as vercelTrack } from "@vercel/analytics";

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
  | "affiliate_click"
  | "reminder_saved"
  | "reply_started"
  | "pack_offer_shown"
  | "tour_step"
  | "tour_skipped"
  | "city_page_cta"
  | "unwrap_picked";

type Props = Record<string, string | number | boolean | null>;

export function track(event: FunnelEvent, props?: Props): void {
  try {
    vercelTrack(event, props);
  } catch {
    // Analytics never gets to break a page.
  }
}
