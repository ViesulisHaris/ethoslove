import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { Dare } from "@/components/games/dare";
import { QuestionList } from "@/components/games/question-list";
import { DARES, TRUTHS } from "@/lib/games/content";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/dare">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.dare" });
  return pageMetadata({ locale, path: "/games/dare", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/dare">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("games.dare");
  return (
    <GameTable>
      <Dare />
      <QuestionList
        id="dare-questions"
        title={t("listTitle", { count: TRUTHS.length + DARES.length })}
        intro={t("listIntro")}
        groups={[
          { name: t("listTruths"), items: TRUTHS.map((q) => q[l]) },
          { name: t("listDares"), items: DARES.map((q) => q[l]) },
        ]}
      />
    </GameTable>
  );
}
