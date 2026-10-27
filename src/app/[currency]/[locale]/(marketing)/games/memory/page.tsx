import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { MemoryGame } from "@/components/games/memory";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/memory">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.memory" });
  return pageMetadata({ locale, path: "/games/memory", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/memory">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GameTable>
      <MemoryGame />
    </GameTable>
  );
}
