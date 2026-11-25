import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { chargedCurrency, subscriptionsEnabled } from "@/lib/pricing/products";
import { PlanView } from "@/components/dates/plan-view";

/**
 * One address for everybody's plan, and whatever is in it lives after the `#`: nothing here to index.
 * The tags read nothing but the locale, so they are in the <head> for every reader (reports/
 * seoaudit-audit.md, M2); a shared plan's link, whose query carries its preview, is served by
 * ./shared/page.tsx instead (src/proxy.ts).
 */
export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/plan">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plan.meta" });
  return { ...pageMetadata({ locale, path: "/plan", title: t("title"), description: t("description") }), robots: { index: false, follow: true } };
}

export default async function PlanPage({ params }: Pick<PageProps<"/[currency]/[locale]/plan">, "params">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  // Read at build time (the page is static): the Ethos for Two sheet shows the monthly price only while it is sold.
  return (
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)]">
      <PlanView monthly={subscriptionsEnabled()} currency={chargedCurrency(currency)} />
    </div>
  );
}
