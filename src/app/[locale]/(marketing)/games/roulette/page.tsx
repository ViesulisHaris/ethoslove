import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Roulette } from "@/components/games/roulette";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/roulette">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.roulette" });
  return pageMetadata({ locale, path: "/games/roulette", title: t("title"), description: t("blurb") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/roulette">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="-mt-[var(--header-h)] min-h-dvh bg-blush-paper pt-[var(--header-h)]">
      <Roulette />
    </div>
  );
}
