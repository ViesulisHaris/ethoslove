import { ArrowRight, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HomeHero } from "@/lib/attribution/landing";
import { HERO_ART, heroSizes, heroSrcSet } from "@/lib/dates/art";
import { Cutout, FloralFrame } from "@/components/marketing/home/cutouts";
import { EagerImg } from "@/components/shared/eager-img";
import { HomeSearch } from "./home-search";
import { MapCard } from "./map-card";

/**
 * The front page. One question on the left (where are you two?), and on the right what the answer
 * turns into: a map, an idea made of two real places, and the invitation it becomes. The same
 * blush paper and real flowers as the gifts, so it reads as one house with more rooms.
 *
 * Someone who arrived from a gift they saw (see homeHeroFor) gets the same room with the gift in
 * front instead: they came to make one, and the map made them hunt for it.
 */
export async function PlatformHero({ variant = "dates" }: { variant?: HomeHero }) {
  return (
    <section className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-blush-paper pt-[var(--header-h)] text-forest">
      <FloralFrame frame="hero" ground="light" />
      <div className="relative container-x grid items-center gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-28">
        {variant === "gift" ? <GiftFirst /> : <DatesFirst />}
      </div>
    </section>
  );
}

async function DatesFirst() {
  const t = await getTranslations("platform.hero");
  return (
    <>
      <div className="lg:col-span-6">
        <p className="text-[12px] font-medium tracking-[0.22em] text-forest/70 uppercase">{t("eyebrow")}</p>
        {/*
         * The width is in em, not ch: `ch` is the "0" of whichever font has loaded, and the fallback's
         * is narrower than Newsreader's, so on a slow phone the headline wrapped to three lines and
         * jumped to two when the font arrived, moving the search below it. 7.2em is Newsreader's 12ch.
         */}
        <h1 className="mt-6 max-w-[7.2em] display-hero text-balance text-forest">
          {t("h1a")} <em className="text-rose-deep">{t("h1b")}</em>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>

        <HomeSearch className="mt-9 max-w-lg" />
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px]">
          <Link href="/dates" className="group -my-2.5 inline-flex min-h-11 items-center gap-1.5 py-2.5 font-semibold text-rose-deep underline-offset-4 hover:underline">
            {t("nearMe")}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/gifts" className="-my-2.5 inline-flex min-h-11 items-center py-2.5 font-medium text-forest/70 underline-offset-4 hover:text-forest hover:underline">
            {t("orGift")}
          </Link>
        </div>

        <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-forest/15 pt-7">
          {(["free", "noApp", "private"] as const).map((k) => (
            <div key={k}>
              <dt className="font-display text-[1.7rem] leading-none tracking-tight text-forest">{t(`facts.${k}.a`)}</dt>
              <dd className="mt-2 text-[12px] leading-snug text-forest/70">{t(`facts.${k}.b`)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* what the answer turns into: the two of them, the map that got them there, the invitation that started it */}
      <div className="relative mx-auto w-full max-w-[540px] lg:col-span-6 lg:justify-self-end" aria-hidden="true">
        <div className="relative ml-auto w-[80%]">
          {/* Through EagerImg: as a plain <img> here, every page that links home preloaded it (see eager-img.tsx). */}
          <EagerImg src={HERO_ART.home} srcSet={heroSrcSet(HERO_ART.home)} sizes="(min-width: 1024px) 432px, 80vw" alt="" width={1350} height={1800} fetchPriority="high" decoding="async" className="aspect-[3/4] w-full rounded-t-[999px] rounded-b-[40px] object-cover shadow-[0_50px_100px_-44px_rgba(120,20,60,0.65)] ring-[10px] ring-white" />
          <Cutout id="bow-gingham" className="absolute -top-2 left-1/2 w-24 -translate-x-1/2 rotate-[-6deg] drop-shadow-[0_10px_16px_rgba(120,50,70,0.3)] sm:w-28" />
        </div>

        <div className="absolute top-[34%] left-0 w-[50%] rotate-[-5deg] rounded-[24px] bg-white p-2 shadow-[0_30px_60px_-26px_rgba(120,20,60,0.55)] sm:-left-4">
          <MapCard className="block h-auto w-full" />
          <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-2 opacity-90 shadow-sm" style={{ backgroundColor: "#FFFFFF", backgroundImage: "linear-gradient(90deg, rgba(238,120,158,.5) 50%, transparent 50%), linear-gradient(rgba(238,120,158,.5) 50%, transparent 50%)", backgroundSize: "8px 8px" }} />
        </div>

        <div className="absolute -bottom-8 left-2 w-[214px] rotate-[4deg] rounded-md bg-card p-4 text-ink shadow-[0_26px_50px_-22px_rgba(120,20,60,0.55)] sm:left-6 sm:w-[240px] sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.18em] text-rose-deep uppercase">{t("card.invited")}</p>
          <p className="mt-1.5 font-display text-[20px] leading-tight">{t("card.day")}</p>
          <p className="mt-1 font-hand text-[1.45rem] leading-none text-rose-deep">{t("card.names")}</p>
          <ol className="mt-3 space-y-1.5 text-[12.5px] text-ink-soft">
            <li className="flex gap-2">
              <span className="font-semibold text-ink tabular-nums">17:45</span> {t("card.stop1")}
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-ink tabular-nums">18:45</span> {t("card.stop2")}
            </li>
          </ol>
          <Cutout id="kiss-1" className="absolute -top-6 -right-4 w-[60px] rotate-[14deg] drop-shadow-[0_6px_10px_rgba(120,20,40,0.25)]" />
        </div>
        <div className="h-12" />
      </div>
    </>
  );
}

/**
 * The gift in front: one button to the gallery, a way to watch one open first, and on the right the
 * moment it is for — a gift being opened on a phone — with the card it came with.
 */
async function GiftFirst() {
  const t = await getTranslations("growth.hero");
  return (
    <>
      <div className="lg:col-span-6">
        <p className="text-[12px] font-medium tracking-[0.22em] text-forest/70 uppercase">{t("eyebrow")}</p>
        <h1 className="mt-6 max-w-[7.8em] display-hero text-balance text-forest">
          {t("h1a")} <em className="text-rose-deep">{t("h1b")}</em>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/templates" className="btn-rose inline-flex h-13 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:-translate-y-0.5">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/demo/bouquet" className="group -my-2.5 inline-flex min-h-11 items-center gap-2 py-2.5 text-[14.5px] font-semibold text-forest underline-offset-4 hover:underline">
            <span className="grid size-8 place-items-center rounded-full bg-forest text-cream">
              <Play aria-hidden="true" className="ml-0.5 size-3.5 fill-current" />
            </span>
            {t("demo")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-forest/70">{t("note")}</p>

        <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-forest/15 pt-7">
          {(["free", "time", "noApp"] as const).map((k) => (
            <div key={k}>
              <dt className="font-display text-[1.7rem] leading-none tracking-tight text-forest">{t(`facts.${k}.a`)}</dt>
              <dd className="mt-2 text-[12px] leading-snug text-forest/70">{t(`facts.${k}.b`)}</dd>
            </div>
          ))}
        </dl>
        <Link href="/dates" className="-my-2.5 mt-6 inline-flex min-h-11 items-center py-2.5 text-[14.5px] font-medium text-forest/70 underline-offset-4 hover:text-forest hover:underline">
          {t("orDate")}
        </Link>
      </div>

      <div className="relative mx-auto w-full max-w-[540px] lg:col-span-6 lg:justify-self-end" aria-hidden="true">
        <div className="relative ml-auto w-[88%]">
          {/* 476px from `sm` (88% of the 540px box); a phone past 2.2x takes the 900px file (heroSizes), not the 1800. */}
          <EagerImg src={HERO_ART.gifts} srcSet={heroSrcSet(HERO_ART.gifts)} sizes={heroSizes("(min-width: 640px) 476px")} alt="" width={1800} height={1350} fetchPriority="high" decoding="async" className="aspect-[4/3] w-full rotate-[2deg] rounded-[36px] object-cover shadow-[0_50px_100px_-44px_rgba(120,20,60,0.65)] ring-[10px] ring-white" />
          <Cutout id="bow-gingham" className="absolute -top-8 -right-3 w-24 rotate-[14deg] drop-shadow-[0_10px_16px_rgba(120,50,70,0.3)] sm:w-28" />
        </div>

        <div className="relative -mt-10 ml-2 w-[214px] rotate-[-4deg] rounded-md bg-card p-4 text-ink shadow-[0_26px_50px_-22px_rgba(120,20,60,0.55)] sm:ml-6 sm:w-[240px] sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.18em] text-rose-deep uppercase">{t("card.eyebrow")}</p>
          <p className="mt-1.5 font-hand text-[1.6rem] leading-none text-rose-deep">{t("card.names")}</p>
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-soft">
            <span className="size-1.5 shrink-0 rounded-full bg-sage" />
            {t("card.opened")}
          </p>
          <Cutout id="kiss-1" className="absolute -top-6 -right-4 w-[60px] rotate-[14deg] drop-shadow-[0_6px_10px_rgba(120,20,40,0.25)]" />
        </div>
      </div>
    </>
  );
}
