import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { localeAlternates } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { LEGAL_UPDATED, WITHDRAW_DOCS } from "@/content/legal";
import { LegalDocument } from "@/components/marketing/legal-document";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/legal/withdraw">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const doc = WITHDRAW_DOCS[locale as GiftLocale];
  return { title: doc.title, description: doc.intro, alternates: localeAlternates(locale, "/legal/withdraw") };
}

/**
 * "Withdraw from a purchase". The button is an email with the subject and a short form already in
 * it: it works signed out, from any device, and the message itself is the dated notice the law asks
 * for, landing in the support inbox where every other request is answered.
 */
export default async function WithdrawPage({ params }: PageProps<"/[currency]/[locale]/legal/withdraw">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const doc = WITHDRAW_DOCS[locale as GiftLocale];
  const mailto = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(doc.action.subject)}&body=${encodeURIComponent(doc.action.body)}`;
  return (
    <LegalDocument doc={doc} updatedLabel={t("lastUpdated", { date: LEGAL_UPDATED })} locale={locale === "es" ? "es" : "en"}>
      <a href={mailto} className="btn-rose mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-base font-semibold transition-transform hover:-translate-y-0.5">
        <Mail aria-hidden="true" className="size-4" />
        {doc.action.label}
      </a>
      <p className="mt-3 text-sm text-muted-foreground">
        {BRAND.supportEmail} ·{" "}
        {/* Section 9 of the terms is the right of withdrawal, which this page puts into practice. */}
        <Link href="/legal/terms#s9" className="underline underline-offset-2 hover:text-ink">
          {t("terms")}
        </Link>
      </p>
    </LegalDocument>
  );
}
