/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ArrowRight, Smartphone, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { QuestionDeck } from "@/components/games/question-deck";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.meta" });
  return pageMetadata({ locale, path: "/games", title: t("title"), description: t("description") });
}

const GAMES = [
  { key: "know", href: "/games/know", image: "/dates/hero/games-sm.webp", mode: "two" },
  { key: "rather", href: "/games/rather", image: "/dates/ideas/arcade-night.webp", mode: "two" },
  { key: "roulette", href: "/games/roulette", image: "/dates/ideas/pasta-and-a-slow-walk.webp", mode: "one" },
  { key: "dare", href: "/games/dare", image: "/dates/ideas/karaoke-duet.webp", mode: "one" },
] as const;

const COMING = ["memory", "draw"] as const;

export default async function GamesPage({ params }: PageProps<"/[locale]/games">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("games");
  return (
    <>
      <section className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-blush-paper pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x grid items-center gap-14 pt-14 pb-20 sm:pt-20 lg:grid-cols-2 lg:pb-24">
          <div>
            <p className="text-[12px] font-medium tracking-[0.22em] text-lilac uppercase">{t("eyebrow")}</p>
            <h1 className="mt-5 max-w-[12ch] display-hero text-balance">
              {t("h1a")} <em className="text-rose-deep">{t("h1b")}</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>
            <ul className="mt-9 grid max-w-lg gap-3 sm:grid-cols-2">
              {(["one", "two"] as const).map((mode) => {
                const Icon = mode === "one" ? Users : Smartphone;
                return (
                  <li key={mode} className="flex items-start gap-3 rounded-[22px] bg-white/70 p-4 ring-1 ring-forest/5 backdrop-blur">
                    <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-lilac" />
                    <span>
                      <span className="block text-[15px] font-semibold text-forest">{t(`modes.${mode}.title`)}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-forest/65">{t(`modes.${mode}.blurb`)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-4 text-center text-[12px] font-semibold tracking-[0.2em] text-rose-deep uppercase">{t("deck.playable")}</p>
            <QuestionDeck />
          </div>
        </div>
      </section>
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="text-eyebrow text-lilac">{t("play.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[16ch]">{t("play.title")}</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GAMES.map(({ key, href, image, mode }) => (
              <li key={key}>
                <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift">
                  <span className="relative block overflow-hidden">
                    <img src={image} alt="" width={960} height={720} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.06]" />
                    <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[11.5px] font-semibold text-forest/75 backdrop-blur">
                      {mode === "one" ? <Users aria-hidden="true" className="size-3.5" /> : <Smartphone aria-hidden="true" className="size-3.5" />}
                      {t(mode === "one" ? "play.one" : "play.two")}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="block font-display text-[24px] leading-[1.05] text-forest">{t(`${key}.title`)}</span>
                    <span className="mt-2 block text-[14px] leading-relaxed text-forest/70">{t(`${key}.blurb`)}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-lilac">
                      {t("play.cta")}
                      <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-20 text-eyebrow text-ink-soft">{t("coming.eyebrow")}</p>
          <h2 className="display-md mt-3">{t("coming.title")}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {COMING.map((key) => (
              <li key={key} className="rounded-[24px] bg-white/70 p-5 ring-1 ring-forest/5">
                <p className="font-display text-[21px] leading-tight text-forest/80">{t(`coming.${key}.title`)}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-forest/60">{t(`coming.${key}.blurb`)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3">
            <p className="text-lg text-ink-soft">{t("coming.meanwhile")}</p>
            <Link href="/dates" className="group -my-2.5 inline-flex min-h-11 items-center gap-1.5 py-2.5 text-[15px] font-semibold text-rose-deep underline-offset-4 hover:underline">
              {t("coming.dates")}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/gifts" className="group -my-2.5 inline-flex min-h-11 items-center gap-1.5 py-2.5 text-[15px] font-semibold text-rose-deep underline-offset-4 hover:underline">
              {t("coming.gifts")}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
