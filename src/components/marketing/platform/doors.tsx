/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Gamepad2, Gift, MapPinned, Plane } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { HERO_ART, heroSrcSet } from "@/lib/dates/art";

const DOORS = [
  { key: "dates", href: "/dates", Icon: MapPinned, image: HERO_ART.dates, ink: "var(--color-rose-deep)", soon: false },
  { key: "gifts", href: "/gifts", Icon: Gift, image: HERO_ART.gifts, ink: "#9A5A12", soon: false },
  { key: "ldr", href: "/long-distance", Icon: Plane, image: HERO_ART.ldr, ink: "#22607F", soon: false },
  { key: "games", href: "/games", Icon: Gamepad2, image: HERO_ART.games, ink: "var(--color-lilac)", soon: false },
] as const;

/** The four rooms of the house, each a photograph with a way in. */
export async function Doors() {
  const t = await getTranslations("platform.doors");
  const soon = (await getTranslations("common"))("comingSoon");
  return (
    <section className="bg-paper py-20 lg:py-28">
      <div className="container-x">
        <p data-reveal className="text-eyebrow text-rose-deep">{t("eyebrow")}</p>
        <h2 data-reveal className="display-xl mt-4 max-w-[18ch]" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
          {t("title")}
        </h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map(({ key, href, Icon, image, ink, soon: isSoon }, i) => (
            <li key={key} data-reveal style={{ "--reveal-delay": `${140 + i * 90}ms` } as React.CSSProperties}>
              <Link href={href} className={cn("group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift", i % 2 === 1 ? "lg:translate-y-6 lg:hover:translate-y-[18px]" : "")}>
                <span className="relative block overflow-hidden">
                  <img src={image} srcSet={heroSrcSet(image)} sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw" alt="" width={1800} height={1350} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.06]" />
                  <span className="absolute top-3.5 left-3.5 grid size-11 place-items-center rounded-2xl bg-white/92 shadow-soft backdrop-blur" style={{ color: ink }}>
                    <Icon aria-hidden="true" className="size-[22px]" strokeWidth={1.8} />
                  </span>
                  {isSoon ? <span className="absolute top-4 right-3.5 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase backdrop-blur" style={{ color: ink }}>{soon}</span> : null}
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="block font-display text-[26px] leading-[1.05] text-forest">{t(`${key}.title`)}</span>
                  <span className="mt-2 block text-[14.5px] leading-relaxed text-forest/70">{t(`${key}.blurb`)}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold" style={{ color: ink }}>
                    {t(`${key}.cta`)}
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
