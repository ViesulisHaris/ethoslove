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
  // Two more gifts on the share screen (components/editor/two-more-gifts.tsx) and a gift ready used at publish.
  | "pair_offer_shown"
  | "pair_wallet_shown"
  | "pair_clicked"
  | "pair_paid"
  | "pair_declined"
  | "gift_ready_used"
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
  // "Print The Tree Tag" (lib/lifecycle/holiday-extras.ts): where it was tapped, "share" or "dashboard".
  | "tree_tag_print_opened"
  | "affiliate_click"
  | "reminder_saved"
  // "Send one back to {sender}": the template, and where it was tapped ("end": the end screen,
  // "reaction": under "Sent to {sender}." after a reaction).
  | "reply_started"
  // The recipient loop (lib/attribution/recipient.ts): taps on a real gift page (the "Made with
  // Ethos" badge; "or make one for someone else" on the end screen), the editor opened by someone
  // who came from a gift (which door: reply, g, watermark, gift-keep), and that gift sent for the
  // first time (and whether it holds anything paid). Counts only: no ids, no names.
  | "watermark_clicked"
  | "make_own_clicked"
  | "recipient_editor_opened"
  | "recipient_gift_sent"
  | "pack_offer_shown"
  // The games. A game begun and a game finished (which game, on one phone or two), a room made and a
  // room joined (which game), and what was picked at the end of a game (the game, and "gift", "today",
  // "host" or the next game's key). Then today's question (/games/today): the page seen, an answer
  // tapped, the link sent (by the share sheet or as a copied link), a sent link opened, and both
  // answers shown (whether they matched). Never a name, an answer, a room's code or a pair's id.
  | "game_started"
  | "game_finished"
  | "room_made"
  | "room_joined"
  | "game_end_pick"
  | "daily_seen"
  | "daily_answered"
  | "daily_shared"
  | "daily_opened_shared"
  | "daily_revealed"
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
  // Dates in one step (components/dates/tonight): a plan asked for (the mood, the budget ceiling and whether
  // it was for tonight, tomorrow or another day: never where), and the next one asked for. Then the plan
  // page: a plan sent (by the share sheet or as a copied link), a plan opened from somebody's link, and
  // that plan kept. And a page of one kind of date seen (which kind). No ids, no places, no coordinates.
  | "tonight_planned"
  | "tonight_another"
  | "plan_shared"
  | "shared_plan_opened"
  | "shared_plan_kept"
  | "date_kind_view"
  // "Keep this gift": the end screen's tap (the template), and the keep page sent (how many reminders were asked for). No ids, no addresses.
  | "keep_tapped"
  | "keep_requested"
  // A group card. At its link: a note added (whether it has a photo, whether an address was left) and
  // one taken back. In the editor: the invite step opened, the link made and copied, a note added to
  // the gift (with its photo or not) or removed, and the pay panel shown and tapped (the template,
  // and whether it was the step up). No ids, no names, no words anyone wrote.
  | "group_note_added"
  | "group_note_withdrawn"
  | "group_invite_tap"
  | "group_link_created"
  | "group_link_shared"
  | "group_page_edited"
  | "group_note_approved"
  | "group_note_removed"
  | "group_pay_shown"
  | "group_pay_tap"
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
  // A card in the gallery (/templates, /occasions/…): which of its two ways out was taken, the gift's
  // own page or straight to the editor (the template and "page" or "make", nothing else). The card
  // lost its "Try the live demo" on 22 Nov 2026; this is what says where its visitors go instead.
  | "gallery_pick"
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
