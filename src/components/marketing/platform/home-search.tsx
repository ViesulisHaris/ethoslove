"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { WhereBox } from "@/components/dates/where-box";

/** The front page's one question. Answering it goes straight to the map of that town. */
export function HomeSearch({ className }: { className?: string }) {
  const t = useTranslations("dates.where");
  const locale = useLocale() === "es" ? "es" : "en";
  const router = useRouter();
  return (
    <WhereBox
      value={null}
      locale={locale}
      size="lg"
      className={className}
      labels={{ label: t("label"), placeholder: t("placeholder"), nearMe: t("nearMe"), searching: t("searching"), nothing: t("nothing") }}
      onPick={(where) => router.push(`/dates?lat=${where.lat}&lng=${where.lng}&q=${encodeURIComponent(where.name)}`)}
    />
  );
}
