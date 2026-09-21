import { ArrowRight, Clock3 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IDEAS } from "@/lib/dates/ideas";
import { Sticker } from "@/templates/_shared/covers/stickers";

const SHOWN = ["golden-hour-picnic", "bookshop-and-coffee", "mini-golf-and-milkshakes", "museum-then-wine", "sunrise-and-breakfast", "stars-and-planets", "cinema-and-late-dessert", "garden-afternoon"];

/** Eight of the ideas as a shelf of cards. Each opens the map with that idea already chosen. */
export async function IdeasTeaser() {
  const t = await getTranslations("platform.ideas");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const ideas = SHOWN.flatMap((id) => IDEAS.filter((i) => i.id === id));
  return (
    <section className="relative overflow-hidden border-y border-line bg-[#FBF1EC] py-20 lg:py-28">
      <div className="container-x mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="text-eyebrow text-[#B23A5E]">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[17ch] text-forest">{t("title")}</h2>
        </div>
        <div className="lg:col-span-5 lg:pb-1">
          <p className="max-w-md text-lg leading-relaxed text-forest/70">{t("blurb")}</p>
          <Link href="/dates" className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#B23A5E] underline-offset-4 hover:underline">
            {t("all", { count: IDEAS.length })}
            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <ul className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {ideas.map((idea, i) => (
          <li key={idea.id} className="w-[236px] shrink-0 snap-start">
            <Link href={`/dates?idea=${idea.id}`} className="group relative flex h-[300px] flex-col justify-end overflow-hidden rounded-[26px] p-5 shadow-soft transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)`, rotate: `${((i * 5) % 3) - 1}deg` }}>
              <span aria-hidden="true" className="absolute -top-2 -right-3 size-[132px] transition-transform duration-500 ease-(--ease-spring) group-hover:scale-110" style={{ rotate: `${((i * 37) % 24) - 12}deg` }}>
                <Sticker id={idea.art.sticker} />
              </span>
              <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
              <span className="relative font-display text-[25px] leading-[1.05] text-forest">{idea.title[locale]}</span>
              <span className="relative mt-2 line-clamp-2 text-[13.5px] leading-snug text-forest/70">{idea.blurb[locale]}</span>
              <span className="relative mt-3 flex items-center gap-1.5 text-[12px] font-medium text-forest/60">
                <Clock3 aria-hidden="true" className="size-3.5" />
                {t("hours", { hours: String(idea.minutes / 60).replace(/\.0$/, "") })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
