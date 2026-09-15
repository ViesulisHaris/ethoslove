/**
 * "Send one back": the names on the gift a recipient just watched travel to the editor, swapped,
 * so their reply opens with "To" and "From" already filled in. Kept in sessionStorage rather than
 * the URL, and read once.
 */
const KEY = "ethos:reply";
const MAX_AGE_MS = 60 * 60 * 1000;
const NAME_MAX = 40;

export type ReplySeed = { slug: string; recipientName: string; senderName: string };

export function saveReplySeed(seed: ReplySeed): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...seed, savedAt: Date.now() }));
  } catch {}
}

/** The seed for this template when there is a fresh one. It is removed either way. */
export function takeReplySeed(slug: string): ReplySeed | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const seed = JSON.parse(raw) as Partial<ReplySeed & { savedAt: number }>;
    if (seed.slug !== slug || typeof seed.savedAt !== "number" || Date.now() - seed.savedAt > MAX_AGE_MS) return null;
    if (typeof seed.recipientName !== "string" || typeof seed.senderName !== "string") return null;
    return {
      slug,
      recipientName: seed.recipientName.trim().slice(0, NAME_MAX),
      senderName: seed.senderName.trim().slice(0, NAME_MAX),
    };
  } catch {
    return null;
  }
}
