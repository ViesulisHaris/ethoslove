/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ArrowRight, Smartphone, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { HERO_ART, heroSrcSet } from "@/lib/dates/art";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { QuestionDeck } from "@/components/games/question-deck";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/games">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "games.meta" });
  return pageMetadata({ locale, path: "/games", title: t("title"), description: t("description") });
}

const COMING = [
  { key: "know", mode: "two", ground: "linear-gradient(160deg,#FFE3D3,#F9C6D0)" },
  { key: "draw", mode: "two", ground: "linear-gradient(160deg,#E6E0F8,#D2C8F0)" },
  { key: "rather", mode: "two", ground: "linear-gradient(160deg,#D9EEF3,#BBDDE8)" },
  { key: "memory", mode: "one", ground: "linear-gradient(160deg,#F8E6CF,#EED2B2)" },
  { key: "dare", mode: "one", ground: "linear-gradient(160deg,#FCE0EE,#F5BFD9)" },
  { key: "dishes", mode: "one", ground: "linear-gradient(160deg,#E1EFD9,#CBE3BE)" },
] as const;

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
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
            <div>
              <p className="text-eyebrow text-lilac">{t("coming.eyebrow")}</p>
              <h2 className="display-xl mt-4 max-w-[16ch]">{t("coming.title")}</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">{t("coming.blurb")}</p>
            </div>
            <img src={HERO_ART.games} srcSet={heroSrcSet(HERO_ART.games)} sizes="(min-width: 1024px) 440px, 100vw" alt="" width={1800} height={1350} loading="lazy" decoding="async" className="aspect-[4/3] w-full rotate-[-1.5deg] rounded-[32px] object-cover shadow-[0_40px_90px_-40px_rgba(60,30,120,0.5)] ring-8 ring-white" />
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COMING.map(({ key, mode, ground }) => (
              <li key={key} className="relative overflow-hidden rounded-[26px] p-6 shadow-soft" style={{ background: ground }}>
                <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11.5px] font-semibold text-forest/75">
                  {mode === "one" ? <Users aria-hidden="true" className="size-3.5" /> : <Smartphone aria-hidden="true" className="size-3.5" />}
                  {t(`modes.${mode}.title`)}
                </span>
                <h3 className="relative mt-12 font-display text-[25px] leading-[1.08] text-forest">{t(`coming.${key}.title`)}</h3>
                <p className="relative mt-2 text-[14.5px] leading-relaxed text-forest/70">{t(`coming.${key}.blurb`)}</p>
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
