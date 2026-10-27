import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { chargedCurrency } from "@/lib/pricing/products";
import { MembershipPanel } from "@/components/membership/membership-panel";
import { isPreviewState, previewMembership } from "@/components/membership/preview-fixtures";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the account page's Ethos for Two section in each of its states
 * (?state=monthly|cancelling|past-due|…, ?subscriptions=off), for screenshots and the e2e tests,
 * which may never sign in (the dev server's database is production). Its buttons talk to the real
 * routes, which a test answers itself. NODE_ENV is inlined at build: in production this page is
 * a 404 and the fixtures never ship.
 */
export default async function MembershipPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/for-two/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const state = one(query.state);
  if (!isPreviewState(state)) notFound();
  const membership = previewMembership(state);
  return (
    <ClientMessages scope="(marketing)/for-two/preview/page" locale={locale}>
      <div className="mx-auto w-full max-w-4xl px-4 pt-28 pb-16 sm:px-6">
        <MembershipPanel membership={membership} currency={chargedCurrency(currency)} subscriptions={one(query.subscriptions) !== "off"} />
      </div>
    </ClientMessages>
  );
}
