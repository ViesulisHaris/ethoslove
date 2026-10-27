import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { dueDates, formatMonthDay, needsSending } from "@/lib/lifecycle/reminders";
import { KEEP_REF } from "./keep";
import { purgeUnconfirmedKeeps } from "./store";

type Admin = SupabaseClient<Database>;

/** Per date per run, like the buyers' reminders; the rest waits for tomorrow's catch-up. */
const BATCH = 200;

export type KeptReminderEmail = {
  to: string;
  locale: "en" | "es";
  recipientName: string;
  occasion: "birthday" | "anniversary" | "valentines" | "other";
  date: string;
  removeUrl: string;
  ref: string;
};

/**
 * The morning job for kept gifts (lib/keep): first, keeps nobody confirmed within a week are deleted
 * with their address; then each confirmed keeper's day nine days away (and the two before, for runs
 * that were missed) gets its email, the same reminder a buyer gets, with one suggested template and
 * nothing from any gift. Each is claimed before it goes (last_sent_year), so two runs can't both
 * send it, and given back if the email fails. A keep that was never confirmed sends nothing, ever.
 */
export async function sendKeptReminders(run: {
  admin: Admin;
  now: Date;
  send: (email: KeptReminderEmail) => Promise<boolean>;
  removeUrl: (reminderId: string, locale: "en" | "es") => Promise<string>;
  inTime: () => boolean;
  pause: () => Promise<void>;
}): Promise<{ sent: number; failed: number; deferred: number; purged: number }> {
  const { admin } = run;
  const purged = await purgeUnconfirmedKeeps(admin, run.now.getTime());
  let sent = 0;
  let failed = 0;
  let deferred = 0;

  for (const due of dueDates(run.now)) {
    const { data: rows, error } = await admin
      .from("keep_reminders")
      .select("id, keep_id, name, occasion, last_sent_year")
      .eq("month", due.month)
      .in("day", due.days)
      .or(`last_sent_year.is.null,last_sent_year.lt.${due.year}`)
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(`kept reminders: ${error.message}`);
    if (!rows?.length) continue;

    const { data: keeps } = await admin
      .from("gift_keeps")
      .select("id, email, locale")
      .in("id", [...new Set(rows.map((r) => r.keep_id))])
      .not("confirmed_at", "is", null);
    const keepers = new Map((keeps ?? []).map((k) => [k.id, k]));

    for (const r of rows) {
      if (!run.inTime()) {
        deferred += 1;
        continue;
      }
      const keep = keepers.get(r.keep_id);
      if (!keep || !needsSending(r.last_sent_year, due.year)) continue;
      const claim = await admin.from("keep_reminders").update({ last_sent_year: due.year }).eq("id", r.id).or(`last_sent_year.is.null,last_sent_year.lt.${due.year}`).select("id").maybeSingle();
      if (claim.error || !claim.data) continue;

      const locale = keep.locale === "es" ? "es" : "en";
      const ok = await run.send({
        to: keep.email,
        locale,
        recipientName: r.name,
        occasion: r.occasion,
        date: formatMonthDay({ month: due.date.getUTCMonth() + 1, day: due.date.getUTCDate() }, locale),
        removeUrl: await run.removeUrl(r.id, locale),
        ref: KEEP_REF,
      });
      if (ok) sent += 1;
      else {
        failed += 1;
        await admin.from("keep_reminders").update({ last_sent_year: r.last_sent_year }).eq("id", r.id);
      }
      await run.pause();
    }
  }
  return { sent, failed, deferred, purged };
}
