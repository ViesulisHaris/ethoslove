import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Db } from "@/lib/commerce/db";
import { cleanEntry, cleanText } from "@/lib/group/clean";
import { answer, failed, later, notThere, switchedOff, unavailable } from "@/lib/group/http";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { askToConfirm, nudgeSender } from "@/lib/group/mail";
import { groupAgreed, groupEmailConsent } from "@/lib/group/notice";
import { encodePhoto } from "@/lib/group/photo";
import { addEntry, groupByToken, linkState } from "@/lib/group/store";
import { isGroupToken, sha256Hex, withdrawSecret } from "@/lib/group/token";
import { emailKey, linkSecret } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 20;

const emailAddress = z.email().max(254);

/**
 * Someone with a group card's link adds their note: multipart { token, name, note, agree=1, photo?,
 * email? } → { ok, withdraw }. No account, and nothing here shows or takes money. What they wrote is
 * made one line of plain text with no addresses in it; a photo is decoded and written out again as
 * WebP, so nothing of the file that arrived is kept; and none of it reaches the gift until its
 * sender says yes. `withdraw` is the secret the page keeps to take the note back. An address left
 * with the note is sent one confirmation that names nobody; the answer here is the same whether
 * or not that email went.
 *
 * Forty an hour from one connection (a family at one table shares one) and thirty an hour to one
 * link from it; the database holds each group to its own number waiting and sixty in all. No IP
 * address is stored anywhere. 404 while the switch is off or for a link that finds nothing; 410
 * once the link is closed, past its last day ("expired") or the gift sent; 409 when it has all the
 * notes it can hold.
 */
export async function POST(request: NextRequest) {
  if (switchedOff()) return notThere();
  const admin = getSupabaseAdminClient() as Db | null;
  const secret = linkSecret();
  if (!admin || !secret) return unavailable();
  // A body over the limit is refused before any of it is read.
  if (Number(request.headers.get("content-length") ?? 0) > GROUP_LIMITS.bodyBytes) return answer({ error: "too_large" }, 413);
  const ip = clientIp(request.headers);
  if (!(await rateLimit(`group-add:${ip}`, { limit: 40, windowSeconds: 3600 }))) return answer({ error: "rate_limited" }, 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return answer({ error: "invalid" }, 400);
  }
  const token = form.get("token");
  if (!isGroupToken(token)) return notThere();
  const file = form.get("photo");
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (upload && upload.size > GROUP_LIMITS.photoBytes) return answer({ error: "too_large" }, 413);

  try {
    const group = await groupByToken(admin, token);
    if (!group) return notThere();
    if (!(await rateLimit(`group-add:${ip}:${group.token_sha256.slice(0, 16)}`, { limit: 30, windowSeconds: 3600 }))) return answer({ error: "rate_limited" }, 429);
    const now = Date.now();
    const state = await linkState(admin, group, now);
    if (state === "sent" || state === "closed" || state === "expired") return answer({ error: state }, 410);
    if (state === "full") return answer({ error: "full" }, 409);

    if (form.get("agree") !== "1") return answer({ error: "invalid" }, 400);
    const words = cleanEntry({ name: form.get("name"), note: form.get("note") }, group.note_max);
    if (!words.ok) return answer({ error: words.error }, 400);

    const typed = cleanText(form.get("email")).toLowerCase();
    const parsed = typed ? emailAddress.safeParse(typed) : null;
    if (parsed && !parsed.success) return answer({ error: "invalid_email" }, 400);

    let photo: { webp: Buffer; width: number; height: number } | null = null;
    if (upload) {
      // A template that takes no photos offers none, so a file here was not sent by the page.
      if (!group.takes_photos) return answer({ error: "bad_photo" }, 400);
      const encoded = await encodePhoto({ type: upload.type, bytes: Buffer.from(await upload.arrayBuffer()) });
      if (!encoded.ok) return answer({ error: encoded.error }, encoded.error === "too_large" ? 413 : 400);
      photo = encoded;
    }

    const withdraw = withdrawSecret();
    const address = parsed?.success ? { address: parsed.data, sha256: await emailKey(parsed.data), consent: groupEmailConsent(group.locale) } : null;
    const added = await addEntry(
      admin,
      group,
      {
        name: words.name,
        note: words.note,
        agreed: groupAgreed(group.locale, group.from_name, group.takes_photos),
        photo,
        email: address,
        withdrawSha256: sha256Hex(withdraw),
      },
      now,
    );
    if (!added.ok) return added.error === "full" ? answer({ error: "full" }, 409) : unavailable();
    // The note is in, and its writer is told so now. Neither email is allowed to undo that or to
    // keep them waiting: one confirmation to the address left with it (nothing else goes there
    // until it says yes), and a word to the sender, once a day, both sent once the answer has gone.
    // Held up by a slow mail service, the page would say "that didn't go through" over a note that
    // did, and the second try would put it in the sender's list twice.
    later(async () => {
      if (address) await askToConfirm(admin, { entryId: added.id, email: address.address, emailSha256: address.sha256, locale: group.locale, secret, now }).catch((e) => console.error(`[group] confirmation not sent: ${(e as Error).message}`));
      await nudgeSender(admin, group, now).catch((e) => console.error(`[group] sender not told: ${(e as Error).message}`));
    });
    return answer({ ok: true, withdraw });
  } catch (error) {
    return failed(error);
  }
}
