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
  // The free Letter test (lib/gift/free-tier.ts). Vercel's reports count by event name, not by a
  // property, so each version has its own: a Letter started, its send screen opened, its pay tapped.
  | "letter_started_note"
  | "letter_started_classic"
  | "letter_sheet_note"
  | "letter_sheet_classic"
  | "letter_pay_note"
  | "letter_pay_classic"
  // The same six for Constellations, which is in the test too (paid in the note version).
  | "sky_started_note"
  | "sky_started_classic"
  | "sky_sheet_note"
  | "sky_sheet_classic"
  | "sky_pay_note"
  | "sky_pay_classic"
  | "free_note_chosen"
  | "free_note_too_long"
  | "bump_toggled"
  | "second_toggled"
  | "etsy_claim_sent"
  | "etsy_claimed"
  | "etsy_found"
  // The share screen's "Review it on Etsy" (the template).
  | "etsy_review_click"
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
  | "keep_requested"
  // The love language quiz: begun, finished (which language came first, nothing else), its link sent, and a gift opened from a result.
  | "quiz_started"
  | "quiz_finished"
  | "quiz_shared"
  | "quiz_gift_click";

type Props = Record<string, string | number | boolean | null>;

/**
 * The free-version test's event for one of its templates (lib/gift/free-tier.ts): "letter_…" for
 * The Letter, "sky_…" for Constellations, then the step and the version.
 */
export function freeTestEvent(slug: string, step: "started" | "sheet" | "pay", arm: "note" | "classic"): FunnelEvent {
  return `${slug === "constellations" ? "sky" : "letter"}_${step}_${arm}`;
}

export function track(event: FunnelEvent, props?: Props): void {
  // Nothing is measured inside the iPhone app, which promises no analytics.
  if (isInApp()) return;
  try {
    vercelTrack(event, props);
  } catch {
    // Analytics never gets to break a page.
  }
}
