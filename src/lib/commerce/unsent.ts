/**
 * Templates a buyer has paid for and not sent yet, for My gifts. A guest's gift lives only on the
 * device it was made on until it is published, so right after paying My gifts used to say "You
 * haven't made a gift yet": on 12 Nov 2026 a buyer opened it some forty times in 26 minutes before
 * the "One step left" email brought him back to his gift. The rule is that email's
 * (lib/commerce/publish-reminders.ts): a single, bought on the web, with no gift of its template
 * live or scheduled and saved since the purchase began, and an hour before that, for a signed-in
 * buyer's checkout opened early. One card per template, newest purchase first, for a month.
 */

export const UNSENT_DAYS = 30;
const CHECKOUT_SLACK_MS = 3_600_000;

export type PaidSingle = { template_slugs: string[]; created_at: string; store: string | null };
export type SentGift = { template_slug: string; updated_at: string };

export function unsentTemplates(purchases: PaidSingle[], sent: SentGift[], now = Date.now()): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const purchase of [...purchases].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const slug = purchase.template_slugs[0];
    const began = Date.parse(purchase.created_at);
    // The App Store's buyers publish in the app, which has no web editor to send them to.
    if (!slug || seen.has(slug) || purchase.store === "app_store" || Number.isNaN(began)) continue;
    seen.add(slug);
    if (now - began > UNSENT_DAYS * 86_400_000) continue;
    if (sent.some((g) => g.template_slug === slug && Date.parse(g.updated_at) >= began - CHECKOUT_SLACK_MS)) continue;
    out.push(slug);
  }
  return out;
}
