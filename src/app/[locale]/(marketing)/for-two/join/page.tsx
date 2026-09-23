import type { Metadata } from "next";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JoinForm } from "@/components/pricing/join-form";
import { inviteCodeFrom } from "@/components/pricing/offers";

const FEATURES = ["templates", "packs", "free"] as const;

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/for-two/join">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "money.join" });
  // Invite links are private: nothing here for search to find.
  return { title: t("eyebrow"), description: t("subtitle"), robots: { index: false } };
}

export default async function JoinPassPage({ params, searchParams }: PageProps<"/[locale]/for-two/join">) {
  const { locale } = await params;
  const { code } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("money.join");

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-14 sm:px-8 sm:py-20">
      <p className="text-eyebrow text-rose-ink">{t("eyebrow")}</p>
      <h1 className="mt-3 display-lg">{t("title")}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>
      <ul className="mt-6 mb-8 grid gap-2.5">
        {FEATURES.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-[15px] text-ink">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose" />
            {t(`features.${k}`)}
          </li>
        ))}
      </ul>
      {/* The sign-in inside reads the query string, which needs a boundary of its own. */}
      <Suspense>
        <JoinForm initialCode={typeof code === "string" ? inviteCodeFrom(code) : null} />
      </Suspense>
    </div>
  );
}
