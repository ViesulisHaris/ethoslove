import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { EtsyFind } from "@/components/marketing/etsy-find";

/*
 * tryethos.io/etsy, the one address every Etsy touchpoint gives (the listing, the message to buyers,
 * the PDF): type the order number from any Etsy email, land in the gift you bought. A guest buyer
 * can't download the PDF without signing in to Etsy, so nothing here needs it. For Etsy buyers
 * only: out of search and the sitemap, no prices.
 */

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/etsy">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "etsyFind" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function EtsyFindPage({ params }: PageProps<"/[currency]/[locale]/etsy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("etsyFind");

  return (
    <div className="container-x pt-8 pb-16 lg:pt-14">
      <div className="mx-auto max-w-md">
        <h1 className="text-center font-display text-[1.75rem] leading-[1.15] text-balance sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 mb-6 text-center text-base text-ink-soft">{t("lead")}</p>
        <EtsyFind locale={locale as GiftLocale} />
        <div className="mt-8 grid gap-3 rounded-xl bg-card p-4 text-sm leading-relaxed text-ink-soft">
          <p className="font-medium text-ink">{t("whereTitle")}</p>
          <p>{t("whereEmail")}</p>
          <p>{t("whereEtsy")}</p>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.rich("help", {
            shop: (chunks) => (
              <a href="https://www.etsy.com/shop/TryEthos" className="font-medium text-coral underline-offset-4 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
