import "server-only";

import type { Db } from "@/lib/commerce/db";
import { sendGroupConfirm, sendGroupNudge } from "@/lib/email/notify";
import { optedOut } from "@/lib/email/optouts";
import { siteUrl } from "@/lib/email/urls";
import { emailKey, linkSecret, signToken } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import type { GroupRow } from "./store";

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Someone left an address with their note, to be sent the finished card. Nothing goes to an address
 * until it has said yes, so this sends one confirmation, which names nobody (anyone holding a
 * card's link can type any address): never to an address on the unsubscribe list, whose address is
 * then not kept at all, and at most three a day to one address across every card. The page's
 * answer is the same whatever happens here, so it tells nobody what an address has done.
 */
export async function askToConfirm(admin: Db, input: { entryId: string; email: string; emailSha256: string; locale: "en" | "es"; secret: string; now: number }): Promise<"sent" | "opted_out" | "limited" | "failed"> {
  if (await optedOut(admin, input.emailSha256)) {
    await admin.from("gift_contributions").update({ email: null, email_sha256: null, email_consent: null, email_consent_at: null }).eq("id", input.entryId);
    return "opted_out";
  }
  if (!(await rateLimit(`group-confirm-mail:${input.emailSha256}`, { limit: 3, windowSeconds: 86_400 }))) return "limited";
  const [confirm, never] = await Promise.all([signToken("group-confirm", input.entryId, input.secret), signToken("keep-never", input.emailSha256, input.secret)]);
  const sent = await sendGroupConfirm({
    to: input.email,
    locale: input.locale,
    confirmUrl: `${siteUrl()}/api/group/confirm?t=${confirm}&l=${input.locale}`,
    // The same "never email me" a kept gift's confirmation carries: one list, whatever asked.
    neverUrl: `${siteUrl()}/api/keep/never?t=${never}&l=${input.locale}`,
  });
  if (!sent) return "failed";
  await admin.from("gift_contributions").update({ confirm_sent_at: iso(input.now) }).eq("id", input.entryId);
  return "sent";
}

/**
 * Tells the sender that notes are waiting: on the first new note, and then at most once a day for
 * a group. The day's turn is claimed on the group's row before anything is sent, so two notes
 * landing together send one email; if the email doesn't go, the turn is given back. An address on
 * the unsubscribe list gets none (the turn stays taken, so the list is asked once a day, not once a
 * note), and every one of these carries the link that puts an address on that list.
 */
export async function nudgeSender(admin: Db, group: GroupRow, now: number): Promise<boolean> {
  const dayAgo = iso(now - DAY);
  // Compared as moments, not as text: the database writes a timestamp its own way ("+00:00"), not as toISOString does ("Z").
  if (group.nudged_at && Date.parse(group.nudged_at) > now - DAY) return false;
  // Claimed against what the row held when it was read: never nudged, or last nudged over a day ago.
  const claim = admin.from("gift_groups").update({ nudged_at: iso(now) }).eq("id", group.id);
  const claimed = await (group.nudged_at ? claim.lt("nudged_at", dayAgo) : claim.is("nudged_at", null)).select("id");
  if (!claimed.data?.length) return false;
  const [{ data: profile }, { count }] = await Promise.all([
    admin.from("profiles").select("email, locale").eq("id", group.user_id).maybeSingle(),
    admin.from("gift_contributions").select("id", { count: "exact", head: true }).eq("group_id", group.id).eq("status", "pending"),
  ]);
  if (!profile?.email) {
    await admin.from("gift_groups").update({ nudged_at: group.nudged_at }).eq("id", group.id);
    return false;
  }
  const key = await emailKey(profile.email);
  if (await optedOut(admin, key)) return false;
  const locale = profile.locale === "es" ? "es" : "en";
  const secret = linkSecret();
  const sent = await sendGroupNudge({
    to: profile.email,
    locale,
    count: Math.max(1, count ?? 1),
    forName: group.for_name,
    // The same "no more of these emails" every reminder carries: one list, whatever asked.
    unsubscribeUrl: secret ? `${siteUrl()}/api/email/unsubscribe?t=${await signToken("email-optout", key, secret)}&l=${locale}` : null,
    onceKey: `group-nudge:${group.id}:${iso(now).slice(0, 10)}`,
  });
  if (!sent) await admin.from("gift_groups").update({ nudged_at: group.nudged_at }).eq("id", group.id);
  return sent;
}
