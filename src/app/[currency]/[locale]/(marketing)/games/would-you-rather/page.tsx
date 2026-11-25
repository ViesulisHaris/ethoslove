import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { GameNotes } from "@/components/games/page/game-notes";
import { RatherGame } from "@/components/games/rather-game";
import { QuestionList, eitherOr } from "@/components/games/question-list";
import { LIST_SHOWN } from "@/content/game-pages";
import { RATHER_PAIRS } from "@/lib/games/content";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/would-you-rather">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.rather" });
  return pageMetadata({ locale, path: "/games/would-you-rather", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/would-you-rather">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.rather");
  const tl = await getTranslations("games.list");
  return (
    <GameTable>
      <RatherGame />
      <QuestionList
        id="rather-questions"
        title={t("listTitle", { count: RATHER_PAIRS.length })}
        intro={t("listIntro")}
        label={tl("label")}
        show={LIST_SHOWN.rather}
        more={(count) => tl("more", { count })}
        groups={[{ items: RATHER_PAIRS.map((p) => eitherOr(p.a[l], p.b[l], l)) }]}
      />
      <GameNotes game="rather" locale={locale} />
    </GameTable>
  );
}
