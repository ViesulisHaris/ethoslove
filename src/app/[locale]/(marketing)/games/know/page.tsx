import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { KnowGame } from "@/components/games/know-game";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/know">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.know" });
  return pageMetadata({ locale, path: "/games/know", title: t("title"), description: t("blurb") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/know">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GameTable>
      <KnowGame />
    </GameTable>
  );
}
