import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SharePreview } from "@/components/editor/share-preview";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the share screen ("It's live.") a gift ends on, for a made-up live gift, with
 * the "two more gifts" card under the link (components/editor/two-more-gifts.tsx). For screenshots
 * and the e2e tests, which have no account to publish from (the dev server has no database): its
 * requests (/api/entitlements, /api/reminders, /api/stripe/checkout, /api/money/pair/confirm) are
 * the test's to answer. ?occasion=christmas|birthday|anniversary picks the gift's template,
 * ?used=1 says it went out on a gift ready, ?state=paying|declined|bought opens the card in that
 * state, and ?paid=<n> draws the publish sheet's "It's already paid for." with n gifts ready. Spanish under /es. NODE_ENV is inlined at build: in
 * production this page is a 404.
 */
export default async function SharePreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/share-preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const state = one(query.state);
  return (
    <SharePreview
      locale={locale === "es" ? "es" : "en"}
      occasion={one(query.occasion) ?? ""}
      used={one(query.used) === "1"}
      state={state === "paying" || state === "declined" || state === "bought" ? state : undefined}
      paid={Number(one(query.paid)) > 0 ? Number(one(query.paid)) : undefined}
    />
  );
}
