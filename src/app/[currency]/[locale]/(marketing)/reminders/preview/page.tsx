import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { giftDataBaseSchema, type GiftData } from "@/lib/gift/schema";
import { isTemplateSlug } from "@/templates/manifests";
import { AnniversaryDates } from "@/components/reminders/anniversary-dates";
import { RemindNextYear } from "@/components/reminders/remind-next-year";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the share screen's reminder card for a gift just published
 * (?template=bouquet|birthday-cinema|the-letter…, ?name=Ana, an empty name for a gift without one,
 * ?photos=3 for a gift with that many photos: the card's promise names photos only then,
 * ?countdown=YYYY-MM-DD for a gift counting down to that day: the card fills its day in only then),
 * for screenshots and the e2e tests, which can't publish a gift (that needs an account, and the dev
 * server's database is production). Its buttons talk to the real routes, which a test answers
 * itself. NODE_ENV is inlined at build: in production this page is a 404.
 */
export default async function ReminderCardPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/reminders/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const template = one(query.template) ?? "bouquet";
  if (!isTemplateSlug(template)) notFound();
  const name = one(query.name) ?? "Ana";
  const photos = Math.min(20, Math.max(0, Number(one(query.photos)) || 0));
  // ?countdown=2027-03-12: a gift counting down to that day (noon UTC), the only gift whose day the card fills in.
  const countdown = one(query.countdown);
  const data = {
    ...giftDataBaseSchema.parse({ templateSlug: template, recipientName: "x", senderName: "Leo", locale: locale === "es" ? "es" : "en" }),
    ...(countdown && /^\d{4}-\d{2}-\d{2}$/.test(countdown) ? { countdown: { targetAt: `${countdown}T12:00:00Z`, timezone: "UTC" } } : {}),
    recipientName: name.slice(0, 40),
    photos: Array.from({ length: photos }, (_, i) => ({ id: `p${i}`, url: "/scraps/placeholder.jpg", width: 1200, height: 1600 })),
  } as GiftData;
  return (
    <ClientMessages scope="(marketing)/reminders/preview/page" locale={locale}>
      <div className="mx-auto w-full max-w-lg px-4 pt-24 pb-16 sm:px-6">
        <RemindNextYear data={data} />
        {/* The card above is the signed-in sender's, so the line under it is shown as they see it. */}
        <AnniversaryDates templateSlug={data.templateSlug} authed />
      </div>
    </ClientMessages>
  );
}
