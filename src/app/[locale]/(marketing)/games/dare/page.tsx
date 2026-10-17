import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { Dare } from "@/components/games/dare";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/dare">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.dare" });
  return pageMetadata({ locale, path: "/games/dare", title: t("title"), description: t("blurb") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/dare">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <GameTable>
      <Dare />
    </GameTable>
  );
}
