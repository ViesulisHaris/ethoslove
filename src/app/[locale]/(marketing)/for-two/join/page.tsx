import type { Metadata } from "next";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JoinForm } from "@/components/pricing/join-form";
import { SealMark } from "@/components/pricing/seal-mark";
import { inviteCodeFrom } from "@/components/pricing/offers";

const FEATURES = ["dates", "templates", "packs", "free"] as const;

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
      <p className="flex items-center gap-2.5 text-eyebrow text-rose-ink">
        <SealMark className="size-6" />
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 display-lg">{t("title")}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>
      <ul className="mt-6 mb-8 grid gap-2.5">
        {FEATURES.map((k) => (
          <li key={k} className="flex items-start gap-3 text-[15px] leading-snug text-ink">
            {/* Ethos for Two's gold on its dusk, as on /pricing. */}
            <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-dusk">
              <Check className="size-3.5 text-starlight" strokeWidth={2.6} />
            </span>
            <span className="pt-0.5">{t(`features.${k}`)}</span>
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
