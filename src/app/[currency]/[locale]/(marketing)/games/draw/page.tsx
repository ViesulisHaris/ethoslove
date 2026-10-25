import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { DrawGame } from "@/components/games/draw-game";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/draw">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.draw" });
  return pageMetadata({ locale, path: "/games/draw", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/draw">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GameTable>
      <DrawGame />
    </GameTable>
  );
}
