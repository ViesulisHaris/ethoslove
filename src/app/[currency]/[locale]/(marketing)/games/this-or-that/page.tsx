import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { GameNotes } from "@/components/games/page/game-notes";
import { ThisOrThatGame } from "@/components/games/picks-game";
import { QuestionList, eitherOr } from "@/components/games/question-list";
import { LIST_SHOWN } from "@/content/game-pages";
import { THIS_PAIRS } from "@/lib/games/this-or-that";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/this-or-that">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.thisthat" });
  return pageMetadata({ locale, path: "/games/this-or-that", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/this-or-that">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.thisthat");
  const tl = await getTranslations("games.list");
  return (
    <GameTable>
      <ThisOrThatGame />
      <QuestionList
        id="thisthat-questions"
        title={t("listTitle", { count: THIS_PAIRS.length })}
        intro={t("listIntro")}
        label={tl("label")}
        show={LIST_SHOWN.thisthat}
        more={(count) => tl("more", { count })}
        groups={[{ items: THIS_PAIRS.map((p) => eitherOr(p.a[l], p.b[l], l)) }]}
      />
      <GameNotes game="thisthat" locale={locale} />
    </GameTable>
  );
}
