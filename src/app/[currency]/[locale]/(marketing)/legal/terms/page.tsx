import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { localeAlternates } from "@/lib/seo";
import { LEGAL_DOCS, LEGAL_UPDATED } from "@/content/legal";
import { LegalDocument } from "@/components/marketing/legal-document";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/legal/terms">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  return { title: LEGAL_DOCS.terms[locale as GiftLocale].title, alternates: localeAlternates(locale, "/legal/terms") };
}

export default async function TermsPage({ params }: PageProps<"/[currency]/[locale]/legal/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <LegalDocument doc={LEGAL_DOCS.terms[locale as GiftLocale]} updatedLabel={t("lastUpdated", { date: LEGAL_UPDATED })} locale={locale === "es" ? "es" : "en"} />;
}
