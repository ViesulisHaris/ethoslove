import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { RatherGame } from "@/components/games/rather-game";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/rather">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.rather" });
  return pageMetadata({ locale, path: "/games/rather", title: t("title"), description: t("blurb") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/rather">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)]">
      <RatherGame />
    </div>
  );
}
