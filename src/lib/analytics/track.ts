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
  // The one-tap path under the pay button (components/editor/one-tap-pay.tsx): the box ticked, the
  // wallet's button shown, no wallet to show after all, and the wallet's own sheet closed unpaid.
  // A premium gift's pay panel, per panel shown (lib/editor/pay-sheet-split.ts): the send screen
  // opened with it, pay tapped on it, and a sale that followed a tap on it. Named per panel because
  // Vercel's reports count by event name.
  | "pay_sheet_one"
  | "pay_sheet_classic"
  | "pay_one_clicked"
  | "pay_classic_clicked"
  | "pay_one_paid"
  | "pay_classic_paid"
  | "one_tap_ticked"
  | "one_tap_button_shown"
  | "one_tap_unavailable"
  | "one_tap_cancelled"
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
  // The Letter's send screen in two versions (lib/editor/keep-split.ts), named per version because
  // Vercel's reports count by event name: the send screen opened on a note that holds something
  // paid, the step that takes the photos out shown, the note sent free from there, a pay button
  // tapped, and a sale that followed a tap. Then the "keep" version's own buttons: keep the photos
  // for less, keep them at the full price, keep every word of a long letter.
  | "letter_sheet_keep"
  | "letter_sheet_plain"
  | "letter_confirm_keep"
  | "letter_confirm_plain"
  | "letter_free_keep"
  | "letter_free_plain"
  | "letter_pay_keep"
  | "letter_pay_plain"
  | "letter_paid_keep"
  | "letter_paid_plain"
  | "letter_keep_tap"
  | "letter_keepfull_tap"
  | "letter_keepwords_tap"
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
  | "quiz_gift_click"
  // The gift finder (/gifts/finder): the first answer, each question answered (which one, never what was
  // said), a result shown (the three answers, each one of a fixed list), and a pick watched or made (the template).
  | "finder_started"
  | "finder_step"
  | "finder_result"
  | "finder_pick"
  // A visit that arrived with no referrer, only a tag in its address (lib/attribution/arrival.ts): from
  // ChatGPT, another assistant, a pin or an Instagram link. Named per source because Vercel's reports
  // count by event name; nothing else is sent.
  | "arrived_chatgpt"
  | "arrived_ai"
  | "arrived_pinterest"
  | "arrived_instagram";

type Props = Record<string, string | number | boolean | null>;

/**
 * The free-version test's event for one of its templates (lib/gift/free-tier.ts): "letter_…" for
 * The Letter, "sky_…" for Constellations, then the step and the version.
 */
export function freeTestEvent(slug: string, step: "started" | "sheet" | "pay", arm: "note" | "classic"): FunnelEvent {
  return `${slug === "constellations" ? "sky" : "letter"}_${step}_${arm}`;
}

/**
 * Vercel's component sets up `window.va` (a queue its script empties once loaded) when it mounts, and
 * it mounts after the page in the layout. An event counted in a page's first effect, such as a
 * purchase on the success page, got there first, found nothing to call and was dropped without a
 * word: purchase_completed never arrived at all. Setting the same queue up here, the way Vercel's
 * own snippet does, keeps those events until the script takes them.
 */
function ensureQueue(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { va?: (...args: unknown[]) => void; vaq?: unknown[][] };
  if (w.va) return;
  w.va = (...args: unknown[]) => {
    (w.vaq = w.vaq ?? []).push(args);
  };
}

export function track(event: FunnelEvent, props?: Props): void {
  // Nothing is measured inside the iPhone app, which promises no analytics.
  if (isInApp()) return;
  try {
    ensureQueue();
    vercelTrack(event, props);
  } catch {
    // Analytics never gets to break a page.
  }
}
