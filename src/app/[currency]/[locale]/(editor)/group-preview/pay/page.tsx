import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GroupPayPreview } from "@/components/group/panel-preview";
import { GroupMessages } from "@/i18n/client-messages";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: a group card's pay panel, as the send screen shows it to the sender, at both
 * prices: the full one with the template in it, and with ?owned=1 the step up for someone who
 * already has the template. ?inapp=1 is what the iPhone app shows instead of a button. It sits with
 * the editor's pages for the words round it, and sends the panel's own itself. The button calls the
 * real checkout route, which a test answers. NODE_ENV is inlined at build: in production this page
 * is a 404.
 */
export default async function GroupPayPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/group-preview/pay">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return (
    <Suspense>
      <GroupMessages locale={locale}>
        <GroupPayPreview locale={locale === "es" ? "es" : "en"} owned={one(query.owned) === "1"} inApp={one(query.inapp) === "1"} />
      </GroupMessages>
    </Suspense>
  );
}
