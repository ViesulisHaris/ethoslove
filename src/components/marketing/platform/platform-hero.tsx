import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ideaById } from "@/lib/dates/ideas";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { Cutout, FloralFrame } from "@/components/marketing/home/cutouts";
import { HomeSearch } from "./home-search";
import { MapCard } from "./map-card";

/**
 * The front page. One question on the left (where are you two?), and on the right what the answer
 * turns into: a map, an idea made of two real places, and the invitation it becomes. The same
 * blush paper and real flowers as the gifts, so it reads as one house with more rooms.
 */
export async function PlatformHero() {
  const t = await getTranslations("platform.hero");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const idea = ideaById("golden-hour-picnic")!;

  return (
    <section className="relative isolate -mt-[var(--header-h)] overflow-hidden bg-[#FBF1EC] pt-[var(--header-h)] text-forest">
      <FloralFrame frame="hero" ground="light" />
      <div className="relative container-x grid items-center gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-28">
        <div className="lg:col-span-6">
          <p className="text-[12px] font-medium tracking-[0.22em] text-forest/70 uppercase">{t("eyebrow")}</p>
          <h1 className="mt-6 max-w-[12ch] display-hero text-balance text-forest">
            {t("h1a")} <em className="text-[#B23A5E]">{t("h1b")}</em>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>

          <HomeSearch className="mt-9 max-w-lg" />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14.5px]">
            <Link href="/dates" className="group inline-flex items-center gap-1.5 font-semibold text-[#B23A5E] underline-offset-4 hover:underline">
              {t("nearMe")}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/gifts" className="font-medium text-forest/70 underline-offset-4 hover:text-forest hover:underline">
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

        {/* what the answer turns into */}
        <div className="relative mx-auto w-full max-w-[520px] lg:col-span-6 lg:justify-self-end" aria-hidden="true">
          <div className="relative rotate-[-2deg] rounded-[28px] bg-white p-2.5 shadow-[0_40px_80px_-36px_rgba(90,30,50,0.55)]">
            <MapCard className="block h-auto w-full" />
            <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 opacity-90 shadow-sm" style={{ backgroundColor: "#FFFFFF", backgroundImage: "linear-gradient(90deg, rgba(238,120,158,.5) 50%, transparent 50%), linear-gradient(rgba(238,120,158,.5) 50%, transparent 50%)", backgroundSize: "8px 8px" }} />
          </div>

          <div className="absolute -bottom-10 -left-2 w-[172px] rotate-[-7deg] overflow-hidden rounded-[22px] p-3.5 shadow-[0_26px_50px_-22px_rgba(90,30,50,0.55)] sm:-left-8 sm:w-[190px]" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}>
            <span className="absolute -top-2 -right-3 size-[88px] rotate-12">
              <Sticker id={idea.art.sticker} />
            </span>
            <p className="mt-16 font-display text-[19px] leading-[1.08] text-forest">{idea.title[locale]}</p>
            <p className="mt-1.5 text-[11.5px] font-medium text-forest/65">{t("card.meta")}</p>
          </div>

          <div className="absolute -right-1 -bottom-16 w-[210px] rotate-[5deg] rounded-md bg-[#FFFDF8] p-4 text-ink shadow-[0_26px_50px_-22px_rgba(90,30,50,0.55)] sm:-right-6 sm:w-[236px] sm:p-5">
            <p className="text-[10px] font-medium tracking-[0.2em] text-[#B23A5E] uppercase">{t("card.invited")}</p>
            <p className="mt-1.5 font-display text-[20px] leading-tight">{t("card.day")}</p>
            <p className="mt-1 font-hand text-[1.45rem] leading-none text-[#B23A5E]">{t("card.names")}</p>
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
          <div className="h-24 sm:h-20" />
        </div>
      </div>
    </section>
  );
}
