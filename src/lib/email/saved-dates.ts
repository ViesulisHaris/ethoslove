import "server-only";

import { isConfigured } from "@/lib/env";
import { DateReminderEmail, dateReminderSubject, type ReminderStop } from "@/emails/saved-dates";
import { sendEmail } from "./send";

type L = "en" | "es";

export type DateReminder = {
  to: string;
  locale: L;
  kind: "date" | "trip";
  title: string | null;
  stops: ReminderStop[];
  note: string | null;
  days: number | null;
  openUrl: string;
  /** The signed "turn off reminders for this date" link; also what a mail app's unsubscribe button POSTs to. */
  offUrl: string;
};

/**
 * The day-before email of a saved date. True only when it went: without Resend it is skipped and
 * false, so the cron gives its claim back and the next run tries again.
 */
export async function sendDateReminder(reminder: DateReminder): Promise<boolean> {
  if (!isConfigured.resend) return false;
  try {
    const result = await sendEmail({
      to: reminder.to,
      subject: dateReminderSubject(reminder.locale, reminder.kind, reminder.title),
      react: DateReminderEmail(reminder),
      // RFC 8058 one-click: the mail app POSTs to the link itself, which turns the reminder off.
      headers: { "List-Unsubscribe": `<${reminder.offUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (!result.ok) console.error(`[email] date reminder not sent: ${result.error}`);
    return result.ok && !result.skipped;
  } catch (e) {
    console.error(`[email] date reminder failed: ${(e as Error).message}`);
    return false;
  }
}
