import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { GameNotes } from "@/components/games/page/game-notes";
import { KnowGame } from "@/components/games/know-game";
import { QuestionList } from "@/components/games/question-list";
import { KNOW_QUESTIONS } from "@/lib/games/content";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/how-well-do-you-know-me">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.know" });
  return pageMetadata({ locale, path: "/games/how-well-do-you-know-me", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/how-well-do-you-know-me">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.know");
  return (
    <GameTable>
      <KnowGame />
      <QuestionList
        id="know-questions"
        title={t("listTitle", { count: KNOW_QUESTIONS.length })}
        intro={t("listIntro")}
        groups={[{ items: KNOW_QUESTIONS.map((q) => `${q.prompt[l]} ${q.options.map((o) => o[l]).join(" · ")}`) }]}
      />
      <GameNotes game="know" locale={locale} />
    </GameTable>
  );
}
