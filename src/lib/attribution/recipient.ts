/**
 * The loop: someone opens a gift, and makes the next one. How often that happens is read from
 * counts alone (docs/marketing/LOOP-KPI.md): a tap on the gift, the editor opening for someone who
 * came from a gift, and that gift going out. Nothing here knows who anyone is. The
 * tag a recipient arrives with is the same `?ref=` every other visitor has (./ref.ts): in the
 * address, then in the tab's memory, never stored.
 *
 * This file is the names and the links, safe to import anywhere (a server page, a gift). The
 * counting lives in ./recipient-loop.ts.
 */

/** "or make one for someone else" on a gift's end screen (the gift's id never goes in a link). */
export const MAKE_OWN_REF = "g";
/** The "Made with Ethos" badge on a free gift. Sales are already recorded under it: it stays. */
export const WATERMARK_REF = "watermark";

/**
 * The tags only a recipient arrives with: "Send one back" (lib/editor/reply-seed.ts), the link
 * above, the badge, and the reminder a kept gift sends (lib/keep/keep.ts).
 */
export const RECIPIENT_REFS = ["reply", MAKE_OWN_REF, WATERMARK_REF, "gift-keep"] as const;
export type RecipientVia = (typeof RECIPIENT_REFS)[number];

export function recipientVia(ref: string | null | undefined): RecipientVia | null {
  const tag = ref?.trim().toLowerCase();
  return tag && (RECIPIENT_REFS as readonly string[]).includes(tag) ? (tag as RecipientVia) : null;
}

/**
 * Where the page a recipient is sent to lives, in the gift's own language. `ref` null: the same page
 * for someone who is not a recipient (a demo's badge), whose taps and editors no recipient count reads.
 */
export function madeWithEthosHref(locale: "en" | "es", ref: typeof MAKE_OWN_REF | typeof WATERMARK_REF | null, slug?: string): string {
  const query = [ref ? `ref=${ref}` : "", slug ? `template=${encodeURIComponent(slug)}` : ""].filter(Boolean).join("&");
  return `${locale === "es" ? "/es" : ""}/made-with-ethos${query ? `?${query}` : ""}`;
}
