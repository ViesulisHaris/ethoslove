import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { PlanView } from "@/components/dates/plan-view";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/plan">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plan.meta" });
  // One address for everybody's plan, and whatever is in it lives after the `#`: nothing here to index.
  return { ...pageMetadata({ locale, path: "/plan", title: t("title"), description: t("description") }), robots: { index: false, follow: true } };
}

export default async function PlanPage({ params }: PageProps<"/[locale]/plan">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="-mt-[var(--header-h)] min-h-dvh bg-[#FFF5F2] pt-[var(--header-h)]">
      <PlanView />
    </div>
  );
}
