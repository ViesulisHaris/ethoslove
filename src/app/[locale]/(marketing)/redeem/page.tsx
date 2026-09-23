import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gift } from "lucide-react";
import { RedeemForm } from "@/components/pricing/redeem-form";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/redeem">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "money.redeem" });
  // A page for people holding a code, not for search.
  return { title: t("eyebrow"), description: t("subtitle"), robots: { index: false } };
}

export default async function RedeemPage({ params, searchParams }: PageProps<"/[locale]/redeem">) {
  const { locale } = await params;
  const { code } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("money.redeem");

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-14 sm:px-8 sm:py-20">
      <span className="grid size-14 place-items-center rounded-2xl bg-blush-paper text-rose ring-1 ring-rose/15">
        <Gift aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-eyebrow text-ink-soft">{t("eyebrow")}</p>
      <h1 className="mt-3 display-lg">{t("title")}</h1>
      <p className="mt-4 mb-8 text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>
      {/* The sign-in inside reads the query string, which needs a boundary of its own. */}
      <Suspense>
        <RedeemForm initialCode={typeof code === "string" ? code.slice(0, 32).toUpperCase() : ""} />
      </Suspense>
    </div>
  );
}
