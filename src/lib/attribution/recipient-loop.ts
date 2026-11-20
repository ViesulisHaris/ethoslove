import { track } from "@/lib/analytics/track";
import { recipientVia, type RecipientVia } from "./recipient";
import { currentRef, REF_PATTERN } from "./ref";

/**
 * Counting the loop's last two steps, in the editor: it opened for someone who came from a gift,
 * and their gift went out (./recipient.ts has the tags; the growth build's reports/loop-kpi.md says how to
 * read the counts). Browser only.
 */

/** A free reply's token as the editor's address carries it (`?reply=`); only its shape is looked at. */
const REPLY_TOKEN_SHAPE = /^[A-Za-z0-9_-]{40,256}$/;

type Search = { get(name: string): string | null };

/**
 * Which recipient's door this editor was opened through, or null for everyone else. The address
 * says so first (the page's own effect may run before the tab has taken the tag down); a visitor
 * who went through a demo on the way has it in the tab's memory; and a free reply to a paid gift
 * still carries its token after the page has been loaded again by a sign-in or a payment.
 */
export function editorVia(search: Search, remembered: string | undefined = currentRef()): RecipientVia | null {
  const inAddress = search.get("ref")?.trim().toLowerCase();
  const tag = inAddress && REF_PATTERN.test(inAddress) ? inAddress : remembered;
  return recipientVia(tag) ?? (REPLY_TOKEN_SHAPE.test(search.get("reply")?.trim() ?? "") ? "reply" : null);
}

/**
 * The editor opened for a recipient. Not counted again when the same gift comes back from signing
 * in or paying (`?resume=publish`): that is the gift already counted, on its way out.
 */
export function countRecipientEditorOpened(search: Search, template: string): void {
  if (search.get("resume") === "publish") return;
  const via = editorVia(search);
  if (via) track("recipient_editor_opened", { via, template });
}

/** A recipient's own gift went out for the first time. `paid`: it holds something that costs money. */
export function countRecipientGiftSent(search: Search, template: string, paid: boolean): void {
  const via = editorVia(search);
  if (via) track("recipient_gift_sent", { via, template, paid });
}
