import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { RatherGame } from "@/components/games/rather-game";
import { QuestionList, eitherOr } from "@/components/games/question-list";
import { RATHER_PAIRS } from "@/lib/games/content";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/rather">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.rather" });
  return pageMetadata({ locale, path: "/games/rather", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/rather">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.rather");
  return (
    <GameTable>
      <RatherGame />
      <QuestionList
        id="rather-questions"
        title={t("listTitle", { count: RATHER_PAIRS.length })}
        intro={t("listIntro")}
        groups={[{ items: RATHER_PAIRS.map((p) => eitherOr(p.a[l], p.b[l], l)) }]}
      />
    </GameTable>
  );
}
