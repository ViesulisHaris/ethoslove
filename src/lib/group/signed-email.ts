import "server-only";

import type { Db } from "@/lib/commerce/db";
import { optedOut } from "@/lib/email/optouts";
import { sendGroupSigned } from "@/lib/email/notify";
import { pageUrl, siteUrl } from "@/lib/email/urls";
import { SITE } from "@/config/site";
import type { EntryRow, GroupRow } from "./store";

/** The ref the email's one quiet link carries: a plain word, never anything of the card's. */
export const GROUP_SIGNED_REF = "group-signed";

const FORGET = { email: null, email_sha256: null, email_consent: null, email_consent_at: null } as const;

/**
 * "Here's the card you signed": the one email a contributor asked for. For a gift that is live, it
 * goes to every note that was added to the card and is still in it (its key is in the gift's own
 * stored notes: nobody is told they signed a card their note is not in), whose writer left an
 * address and confirmed it, once.
 *
 * Each note is claimed first (emailed_at), so two runs at once send one email; the claim is let go
 * if the send fails, for the next run. An address on the unsubscribe list gets nothing. Either way
 * the address is deleted the moment its email has been sent or refused: after this, the note's row
 * holds no way to reach its writer. Safe to call for a gift with no group, and as often as you like.
 */
export async function sendSignedGiftEmails(admin: Db, giftId: string, now: number): Promise<{ sent: number; skipped: number }> {
  const result = { sent: 0, skipped: 0 };
  const { data: group } = await admin.from("gift_groups").select("*").eq("gift_id", giftId).maybeSingle();
  if (!group) return result;
  const { data: gift } = await admin.from("gifts").select("short_id, status, data, password_hash").eq("id", giftId).maybeSingle();
  if (!gift || gift.status !== "live") return result;
  const stored = gift.data && typeof gift.data === "object" && !Array.isArray(gift.data) ? (gift.data as { contributions?: unknown }).contributions : null;
  const inCard = new Set(Array.isArray(stored) ? stored.map((item) => (item && typeof item === "object" ? String((item as { key?: unknown }).key ?? "") : "")) : []);

  const { data: entries } = await admin.from("gift_contributions").select("*").eq("group_id", (group as GroupRow).id).eq("status", "approved").not("email", "is", null).not("email_confirmed_at", "is", null).is("emailed_at", null);
  for (const entry of (entries ?? []) as EntryRow[]) {
    if (!entry.email || !entry.item_key || !inCard.has(entry.item_key)) continue;
    const claimed = await admin.from("gift_contributions").update({ emailed_at: new Date(now).toISOString() }).eq("id", entry.id).is("emailed_at", null).select("id");
    if (!claimed.data?.length) continue;
    const refused = entry.email_sha256 ? await optedOut(admin, entry.email_sha256) : false;
    const locale = (group as GroupRow).locale === "es" ? "es" : "en";
    const sent = refused
      ? false
      : await sendGroupSigned({
          to: entry.email,
          locale,
          fromName: (group as GroupRow).from_name,
          giftUrl: `${siteUrl()}${SITE.giftPath}/${gift.short_id}`,
          hasPassword: Boolean(gift.password_hash),
          makeUrl: pageUrl(locale, `/templates?ref=${GROUP_SIGNED_REF}`),
          onceKey: `group-signed:${entry.id}`,
        });
    if (sent || refused) {
      await admin.from("gift_contributions").update(FORGET).eq("id", entry.id);
      if (sent) result.sent += 1;
      else result.skipped += 1;
    } else {
      // Not sent this time (the mail service, most likely): the claim goes back for the next run.
      await admin.from("gift_contributions").update({ emailed_at: null }).eq("id", entry.id);
      result.skipped += 1;
    }
  }
  return result;
}
