import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { GameTable } from "@/components/games/cards";
import { QuestionDeck } from "@/components/games/question-deck";
import { QuestionList } from "@/components/games/question-list";
import { DECKS, DECK_IDS } from "@/lib/games/questions";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/games/deck">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.deck" });
  return pageMetadata({ locale, path: "/games/deck", title: t("seoTitle"), description: t("seoDescription") });
}

export default async function Page({ params }: PageProps<"/[currency]/[locale]/games/deck">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("games.deck");
  const tg = await getTranslations("games");
  const l = locale === "es" ? "es" : "en";
  return (
    <GameTable>
      {/* The deck is the game, so on a phone it comes straight after the title: the "how" note and
          the way back wait under it. Side by side on a wide screen, the note stays under the title
          and the deck spans both rows (the second row takes what's left, so the first stays the
          title's own height). */}
      <section className="container-x grid items-start gap-8 pt-8 pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-0">
        <div className="lg:pt-10">
          <h1 className="display-xl text-cream">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-cream/70">{t("blurb")}</p>
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <QuestionDeck />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <p className="max-w-md rounded-2xl bg-white/5 px-5 py-4 text-[15px] leading-relaxed text-cream/75 ring-1 ring-white/10 lg:mt-6">{t("how")}</p>
          <Link href="/games" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {tg("hub.pickTitle")}
          </Link>
        </div>
      </section>
      <QuestionList
        id="deck-questions"
        title={t("listTitle", { count: DECK_IDS.reduce((n, id) => n + DECKS[id].cards.length, 0) })}
        intro={t("listIntro")}
        groups={DECK_IDS.map((id) => ({ name: DECKS[id].name[l], items: DECKS[id].cards.map((c) => c[l]) }))}
      />
    </GameTable>
  );
}
