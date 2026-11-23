/**
 * "Send one back": the names on the gift a recipient just watched travel to the editor, swapped,
 * so their reply opens with "To" and "From" already filled in. The gift's own template fields ride
 * along for templates that keep something in a reply (Halfway swaps its two places). Kept in
 * sessionStorage rather than the URL. The gift's id never goes in the link: a paid premium gift's
 * reply is free, and what proves it is a sealed token (replyEditorHref).
 *
 * The seed stays until the editor has something of its own to keep (clearReplySeed, on the reply's
 * first change, when its draft is saved with the names in it). Read once and thrown away, a reload
 * of the editor, or Back to the gift and Forward again, opened the reply with both names empty.
 * It is this tab's only, and an hour old at most.
 */
import { draftKey, replyDraftScope } from "./persistence";

const KEY = "ethos:reply";
const MAX_AGE_MS = 60 * 60 * 1000;
const NAME_MAX = 40;
const FIELDS_MAX_CHARS = 20_000;

export type ReplySeed = {
  slug: string;
  recipientName: string;
  senderName: string;
  /** The answered gift's template fields; the template decides what, if anything, a reply keeps. */
  fields?: Record<string, unknown>;
};

export function saveReplySeed(seed: ReplySeed): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...seed, savedAt: Date.now() }));
  } catch {}
  dropOtherReplyDraft(seed);
}

/**
 * A reply keeps a draft of its own (store.ts pageScope), and a draft this device kept wins over the
 * seed when the editor opens. One started for another gift of this template, addressed to someone
 * else, is let go, so this reply opens with this gift's names. The same pair answered again (Back to
 * the gift and Send one back once more) keeps what was typed. A signed-in sender's row stays on
 * their dashboard either way.
 */
function dropOtherReplyDraft(seed: ReplySeed): void {
  try {
    const key = draftKey(replyDraftScope(seed.slug));
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const data = (JSON.parse(raw) as { data?: { recipientName?: unknown; senderName?: unknown } }).data;
    const name = (n: string) => n.trim().slice(0, NAME_MAX);
    const same = data?.recipientName === name(seed.recipientName) && data?.senderName === name(seed.senderName);
    if (!same) window.localStorage.removeItem(key);
  } catch {}
}

/** The reply has a draft of its own now, or was never one: the seed has done its work. */
export function clearReplySeed(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}

/**
 * The seed for this template when there is a fresh one. A fresh one for this template is left where
 * it is, for a reload (see above); one for another template, a stale one or a broken one is removed.
 */
export function readReplySeed(slug: string): ReplySeed | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const seed = JSON.parse(raw) as Partial<ReplySeed & { savedAt: number }>;
    const fresh = seed.slug === slug && typeof seed.savedAt === "number" && Date.now() - seed.savedAt <= MAX_AGE_MS;
    if (!fresh || typeof seed.recipientName !== "string" || typeof seed.senderName !== "string") {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    const fields =
      seed.fields && typeof seed.fields === "object" && !Array.isArray(seed.fields) && JSON.stringify(seed.fields).length <= FIELDS_MAX_CHARS
        ? seed.fields
        : undefined;
    return {
      slug,
      recipientName: seed.recipientName.trim().slice(0, NAME_MAX),
      senderName: seed.senderName.trim().slice(0, NAME_MAX),
      ...(fields ? { fields } : {}),
    };
  } catch {
    clearReplySeed();
    return null;
  }
}

/** Sales that start from a reply are counted under this ref (scripts/revenue-by-ref.mjs). */
export const REPLY_REF = "reply";

/** The editor was opened as a reply: "Send one back" (`?ref=reply`, and `&reply=` when it is free). */
export function opensAsReply(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("ref")?.trim().toLowerCase() === REPLY_REF || params.has("reply");
}

/**
 * The seed for an editor that has just opened, given its address. Only a reply gets the swapped
 * names. Kept in the tab for a reload, a seed was put on the next gift of the same template made
 * there for someone else ("or make one for someone else", a plain /create/<slug>), addressed back to
 * the person who sent the first one. That editor throws its template's seed away instead.
 */
export function replySeedForEditor(slug: string, search: string): ReplySeed | null {
  if (opensAsReply(search)) return readReplySeed(slug);
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw && (JSON.parse(raw) as { slug?: unknown }).slug === slug) clearReplySeed();
  } catch {
    clearReplySeed();
  }
  return null;
}

/**
 * The editor link for "send one back". When the gift answered is a paid premium one, the gift page
 * hands over the token that makes the reply free (lib/commerce/free-reply.ts), and it rides on the
 * end; without one the reply still opens, at the normal price. The gift's id never goes in the link.
 */
export function replyEditorHref(templateSlug: string, locale: "en" | "es", replyToken?: string | null): string {
  const href = `${locale === "es" ? "/es" : ""}/create/${templateSlug}?ref=${REPLY_REF}`;
  return replyToken ? `${href}&reply=${encodeURIComponent(replyToken)}` : href;
}
