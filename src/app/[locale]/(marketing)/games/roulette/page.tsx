import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { Roulette } from "@/components/games/roulette";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/roulette">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.roulette" });
  return pageMetadata({ locale, path: "/games/roulette", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/roulette">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GameTable>
      <Roulette />
    </GameTable>
  );
}
