import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { localeAlternates } from "@/lib/seo";
import { LEGAL_DOCS, LEGAL_UPDATED } from "@/content/legal";
import { LegalDocument } from "@/components/marketing/legal-document";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/legal/privacy">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  return { title: LEGAL_DOCS.privacy[locale as GiftLocale].title, alternates: localeAlternates(locale, "/legal/privacy") };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/legal/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <LegalDocument doc={LEGAL_DOCS.privacy[locale as GiftLocale]} updatedLabel={t("lastUpdated", { date: LEGAL_UPDATED })} locale={locale === "es" ? "es" : "en"} />;
}
