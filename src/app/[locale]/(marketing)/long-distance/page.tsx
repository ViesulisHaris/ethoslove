/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { HERO_ART } from "@/lib/dates/art";
import { VIRTUAL_DATES } from "@/lib/dates/virtual";
import { listManifests } from "@/templates/manifests";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { MeetInTheMiddle } from "@/components/ldr/meet-in-the-middle";
import { TemplateCard } from "@/components/templates/template-card";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/long-distance">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ldr.meta" });
  return pageMetadata({ locale, path: "/long-distance", title: t("title"), description: t("description") });
}

export default async function LongDistancePage({ params }: PageProps<"/[locale]/long-distance">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ldr");
  const lang = locale === "es" ? "es" : "en";
  // Most central first, as the occasion page orders them: built for distance before merely suited to it.
  const gifts = listManifests()
    .filter((m) => m.occasions.includes("long-distance"))
    .sort((a, b) => a.occasions.indexOf("long-distance") - b.occasions.indexOf("long-distance"))
    .slice(0, 4);

  return (
    <>
      {/* Not clipped, and above what follows: the town picker's list drops down past the torn edge. The flowers clip themselves. */}
      <section className="relative isolate z-10 -mt-[var(--header-h)] bg-[#FFF5F2] pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x pt-14 pb-16 sm:pt-20 lg:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
            <div>
              <p className="text-[12px] font-medium tracking-[0.22em] text-[#B0245A] uppercase">{t("eyebrow")}</p>
              <h1 className="mt-5 max-w-[14ch] display-hero text-balance">
                {t("h1a")} <em className="text-[#D6336C]">{t("h1b")}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>
            </div>
            <div className="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
              <img src={HERO_ART.ldr} alt="" width={1280} height={960} fetchPriority="high" decoding="async" className="aspect-[4/3] w-full rotate-[2deg] rounded-[32px] object-cover shadow-[0_40px_90px_-40px_rgba(120,20,60,0.6)] ring-8 ring-white" />
              <span className="absolute -bottom-4 -left-3 rotate-[-4deg] rounded-2xl bg-white px-4 py-2.5 font-hand text-[1.5rem] leading-none text-[#B0245A] shadow-lift">{t("polaroid")}</span>
            </div>
          </div>
          <div className="mt-12">
            <h2 className="display-md text-forest">{t("meet.title")}</h2>
            <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-forest/65">{t("meet.sub")}</p>
            <div className="mt-6">
              <MeetInTheMiddle />
            </div>
          </div>
        </div>
      </section>
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="text-eyebrow text-ink-soft">{t("virtual.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[16ch]">{t("virtual.title")}</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VIRTUAL_DATES.map((v, i) => (
              <li key={v.id} className="relative flex flex-col overflow-hidden rounded-[26px] p-5 shadow-soft" style={{ background: `linear-gradient(160deg, ${v.art.from} 0%, ${v.art.to} 100%)` }}>
                <span aria-hidden="true" className="absolute -top-2 -right-3 size-[96px]" style={{ rotate: `${((i * 37) % 24) - 12}deg` }}>
                  <Sticker id={v.art.sticker} />
                </span>
                <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
                <h3 className="relative mt-20 font-display text-[23px] leading-[1.08] text-forest">{v.title[lang]}</h3>
                <p className="relative mt-2.5 text-[14.5px] leading-relaxed text-forest/75">{v.blurb[lang]}</p>
                <p className="relative mt-4 border-t border-forest/10 pt-3 text-[13.5px] leading-snug text-forest/70">
                  <span className="font-semibold text-forest">{t("virtual.twist")}</span> {v.twist[lang]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {gifts.length > 0 ? (
        <section className="border-t border-line bg-[#FFF5F2] py-20 lg:py-28">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-eyebrow text-[#B0245A]">{t("gifts.eyebrow")}</p>
                <h2 className="display-xl mt-4 max-w-[16ch] text-forest">{t("gifts.title")}</h2>
              </div>
              <Link href="/occasions/long-distance" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#B0245A] underline-offset-4 hover:underline">
                {t("gifts.all")}
                <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {gifts.map((m, i) => (
                <TemplateCard key={m.slug} manifest={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
