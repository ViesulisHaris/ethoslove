import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { localeAlternates } from "@/lib/seo";
import { LEGAL_DOCS, PRIVACY_UPDATED, legalDocs } from "@/content/legal";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { LegalDocument } from "@/components/marketing/legal-document";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/legal/privacy">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  return { title: LEGAL_DOCS.privacy[locale as GiftLocale].title, alternates: localeAlternates(locale, "/legal/privacy") };
}

export default async function PrivacyPage({ params }: PageProps<"/[currency]/[locale]/legal/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  // What it says about group cards is there only while they are on sale (content/legal.ts).
  return <LegalDocument doc={legalDocs(groupGiftsEnabled()).privacy[locale as GiftLocale]} updatedLabel={t("lastUpdated", { date: PRIVACY_UPDATED })} locale={locale === "es" ? "es" : "en"} />;
}
