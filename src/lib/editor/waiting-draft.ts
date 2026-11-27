/**
 * The gift a visitor started on this device and has not sent, if there is one worth pointing back to
 * (components/templates/waiting-gift.tsx). Pure over a Storage, so a test can hand it one.
 *
 * A draft counts when it is a template's own draft (`ethos:draft:<slug>`, not a reply's `<slug>:reply`),
 * of a template that exists, still a draft (not sent or scheduled), touched within the last seven days
 * (the editor itself restores nothing older: lib/editor/store.ts), and with something typed into it:
 * a name or words. An editor opened and left untouched saves an empty draft, and "your gift is
 * waiting" over nothing would be a false promise. The most recently touched one wins.
 */
export type WaitingDraft = { slug: string; recipient: string; updatedAt: number };

const PREFIX = "ethos:draft:";
const WEEK = 7 * 24 * 60 * 60 * 1000;

type Readable = Pick<Storage, "length" | "key" | "getItem">;

export function findWaitingDraft(storage: Readable, slugs: readonly string[], now: number): WaitingDraft | null {
  let best: WaitingDraft | null = null;
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const slug = key.slice(PREFIX.length);
      if (!slugs.includes(slug)) continue;
      const draft = parse(storage.getItem(key));
      if (!draft || draft.slug !== slug || draft.status !== "draft") continue;
      if (!(draft.updatedAt > now - WEEK) || draft.updatedAt > now + 60_000) continue;
      const recipient = text(draft.data?.recipientName);
      const words = text(draft.data?.message);
      if (!recipient && !words) continue;
      if (!best || draft.updatedAt > best.updatedAt) best = { slug, recipient: recipient.slice(0, 40), updatedAt: draft.updatedAt };
    }
  } catch {
    return null;
  }
  return best;
}

type Stored = { slug?: unknown; status?: unknown; updatedAt?: unknown; data?: { recipientName?: unknown; message?: unknown } };

function parse(raw: string | null): { slug: string; status: string; updatedAt: number; data?: Stored["data"] } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Stored;
    if (typeof v?.slug !== "string" || typeof v.status !== "string" || typeof v.updatedAt !== "number") return null;
    return { slug: v.slug, status: v.status, updatedAt: v.updatedAt, data: v.data };
  } catch {
    return null;
  }
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
