import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { GameNotes } from "@/components/games/page/game-notes";
import { DrawGame } from "@/components/games/draw-game";
import { QuestionList } from "@/components/games/question-list";
import { DRAW_WORDS } from "@/lib/games/draw";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/draw">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.draw" });
  return pageMetadata({ locale, path: "/games/draw", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/draw">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("games.draw");
  const l = locale === "es" ? "es" : "en";
  return (
    <GameTable>
      <DrawGame />
      <QuestionList id="draw-words" title={t("listTitle", { count: DRAW_WORDS.length })} intro={t("listIntro")} groups={[{ items: DRAW_WORDS.map((w) => w.word[l]) }]} />
      <GameNotes game="draw" locale={locale} />
    </GameTable>
  );
}
