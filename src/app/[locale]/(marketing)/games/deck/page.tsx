import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { QuestionDeck } from "@/components/games/question-deck";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games/deck">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.deck" });
  return pageMetadata({ locale, path: "/games/deck", title: t("title"), description: t("blurb") });
}

export default async function Page({ params }: PageProps<"/[locale]/games/deck">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("games.deck");
  const tg = await getTranslations("games");
  return (
    <GameTable>
      <section className="container-x grid items-start gap-10 pt-8 pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
        <div className="lg:pt-10">
          <h1 className="display-xl text-cream">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-cream/70">{t("blurb")}</p>
          <p className="mt-6 max-w-md rounded-2xl bg-white/5 px-5 py-4 text-[15px] leading-relaxed text-cream/75 ring-1 ring-white/10">{t("how")}</p>
          <Link href="/games" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {tg("hub.pickTitle")}
          </Link>
        </div>
        <QuestionDeck />
      </section>
    </GameTable>
  );
}
