import type { Metadata } from "next";
import { ArrowRight, Smartphone, Timer, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { GAMES, type GameKey } from "@/lib/games/catalogue";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { GameTable, PlayingCard } from "@/components/games/cards";
import { GameHand } from "@/components/games/game-hand";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.meta" });
  return pageMetadata({ locale, path: "/games", title: t("title"), description: t("description") });
}

/** Game night: the six games as a hand of cards, then each one laid out to pick. */
export default async function GamesPage({ params }: PageProps<"/[locale]/games">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("games");
  const titles = Object.fromEntries(GAMES.map((g) => [g.key, t(`${g.key}.title`)])) as Record<GameKey, string>;

  return (
    <GameTable>
      <section className="container-x grid items-center gap-6 pt-6 pb-10 sm:gap-12 sm:pt-16 lg:grid-cols-2 lg:pb-20">
        <div>
          <p className="text-[12px] font-medium tracking-[0.22em] text-blush uppercase">{t("hub.eyebrow")}</p>
          <h1 className="mt-5 max-w-[12ch] display-hero text-balance text-cream">
            {t("h1a")} <em className="text-rose-tint">{t("h1b")}</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/70 sm:text-xl">{t("hub.sub")}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13.5px] font-semibold text-cream ring-1 ring-white/15">
              <Users aria-hidden="true" className="size-4 text-rose-tint" />
              {t("hub.one")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[13.5px] font-semibold text-cream ring-1 ring-white/15">
              <Smartphone aria-hidden="true" className="size-4 text-rose-tint" />
              {t("hub.two")}
            </span>
          </div>
          <Link href="#pick" className="btn-rose mt-8 inline-flex h-13 items-center gap-2 rounded-full px-7 text-base font-semibold">
            {t("hub.deal")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <GameHand titles={titles} label={t("hub.pickTitle")} className="order-first lg:order-last" />
      </section>

      <section id="pick" className="container-x scroll-mt-28 pb-24">
        <h2 className="display-lg text-cream">{t("hub.pickTitle")}</h2>
        <p className="mt-2 max-w-xl text-[15.5px] text-cream/60">{t("hub.pickSub")}</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-6 lg:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.key}>
              <Link href={g.href} className="group block h-full rounded-[24px]">
                <PlayingCard rank={g.rank} suit={g.suit} radius={24} className="h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="items-center px-3 pt-9 pb-5 text-center sm:px-7 sm:pt-10 sm:pb-7">
                  <span className="block size-16 transition-transform duration-500 ease-(--ease-spring) group-hover:scale-110 group-hover:rotate-6 sm:size-24">
                    <Sticker id={g.sticker} />
                  </span>
                  <span className="mt-3 block font-display text-[19px] leading-[1.08] sm:mt-4 sm:text-[26px]">{t(`${g.key}.title`)}</span>
                  <span className="mt-2 hidden text-[14.5px] leading-relaxed text-forest/65 sm:block">{t(`${g.key}.blurb`)}</span>
                  <span className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.06] px-2.5 py-1 text-[11.5px] font-semibold text-forest/70 sm:text-[12px]">
                      {g.phones === "two" ? <Smartphone aria-hidden="true" className="size-3.5" /> : <Users aria-hidden="true" className="size-3.5" />}
                      {t(g.phones === "two" ? "play.two" : "play.one")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.06] px-2.5 py-1 text-[11.5px] font-semibold text-forest/70 sm:text-[12px]">
                      <Timer aria-hidden="true" className="size-3.5" />
                      {t("hub.minutes", { n: g.minutes })}
                    </span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-rose-deep sm:pt-6 sm:text-[14.5px]">
                    {t("play.cta")}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </PlayingCard>
              </Link>
            </li>
          ))}
          <li>
            <div className="flex h-full flex-col items-center pt-4 text-center">
              <PlayingCard faceDown back="wine" radius={20} className="aspect-[5/7] w-28 rotate-[-4deg] sm:w-40" backLabel={<span className="rounded-full bg-cream/95 px-3 py-1 text-[12px] font-bold tracking-[0.12em] text-forest uppercase">{t("hub.soon")}</span>} />
              <p className="mt-5 font-display text-[19px] text-cream/85 sm:mt-6 sm:text-[22px]">{t("coming.draw.title")}</p>
              <p className="mt-1.5 hidden max-w-xs text-[14px] leading-relaxed text-cream/55 sm:block">{t("coming.draw.blurb")}</p>
            </div>
          </li>
        </ul>
      </section>
    </GameTable>
  );
}
