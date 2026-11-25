import { track } from "@/lib/analytics/track";
import { isInApp } from "@/lib/app/bridge";
import { recipientVia, type RecipientVia } from "./recipient";
import { currentRef, REF_PATTERN } from "./ref";
import { within7ByDoor } from "./recipient-started";

/**
 * Counting the loop's last two steps, in the editor: it opened for someone who came from a gift,
 * and their gift went out (./recipient.ts has the tags; docs/marketing/LOOP-KPI.md says how to read
 * the counts, and what they cannot say). Browser only.
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

/**
 * A recipient's own gift went out for the first time. `paid`: the gift holds something that costs
 * money (a premium template that is not a free reply, or a paid extra). It does not say a payment
 * was made: someone who already owns the template is counted too, and most people who do pay are
 * not, because paying loads the page afresh and the tag is gone (docs/marketing/LOOP-KPI.md).
 */
export function countRecipientGiftSent(search: Search, template: string, paid: boolean): void {
  const via = editorVia(search);
  if (via) track("recipient_gift_sent", { via, template, paid });
}

/**
 * A recipient began a gift of their own: the first change to a new draft, in an editor opened
 * through one of the doors out of a gift. Sent once, with one answer: was that within seven days of
 * the gift they came from being opened? The server says so when a sealed token names that gift
 * (a paid gift's "Send one back": /api/loop/started reads its first open); otherwise the door does
 * (./recipient-started.ts). Nothing is asked or counted inside the iPhone app.
 */
export async function countRecipientStarted(search: Search, ask: typeof fetch = fetch): Promise<void> {
  if (isInApp() || search.get("resume") === "publish") return;
  const via = editorVia(search);
  if (!via) return;
  let within7 = within7ByDoor(via);
  const token = search.get("reply")?.trim() ?? "";
  if (REPLY_TOKEN_SHAPE.test(token)) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 4000);
    try {
      const res = await ask("/api/loop/started", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reply: token }),
        keepalive: true,
        signal: stop.signal,
      });
      const said = (await res.json()) as { within7?: unknown } | null;
      if (typeof said?.within7 === "boolean") within7 = said.within7;
    } catch {
      // No connection, or the server took too long: the door's answer stands.
    } finally {
      clearTimeout(timer);
    }
  }
  track("recipient_started", { within7 });
}
