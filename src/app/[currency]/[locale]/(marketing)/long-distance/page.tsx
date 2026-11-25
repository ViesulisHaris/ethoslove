import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { HALFWAY_TOOL_PATH } from "@/content/halfway-tool";
import { HERO_ART, heroSizes, heroSrcSet } from "@/lib/dates/art";
import { VIRTUAL_DATES } from "@/lib/dates/virtual";
import { LDR_GAMES } from "@/lib/ldr/games";
import { waysData } from "@/lib/ldr/ways-data";
import { listManifests } from "@/templates/manifests";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { PlayingCard } from "@/components/games/cards";
import { MeetInTheMiddle } from "@/components/ldr/meet-in-the-middle";
import { PlanVisitLink } from "@/components/ldr/plan-visit-link";
import { EagerImg } from "@/components/shared/eager-img";
import { JsonLd } from "@/components/shared/json-ld";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import { POSTER_ROW, PosterLink } from "@/components/templates/page/sections";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/long-distance">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ldr.meta" });
  return pageMetadata({ locale, path: "/long-distance", title: t("title"), description: t("description") });
}

export default async function LongDistancePage({ params }: PageProps<"/[currency]/[locale]/long-distance">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ldr");
  const lang = locale === "es" ? "es" : "en";
  const tg = await getTranslations("games");
  const gameTitle = { draw: tg("draw.title"), rather: tg("rather.title") };
  // Most central first, as the occasion page orders them: built for distance before merely suited to it.
  const gifts = listManifests()
    .filter((m) => m.occasions.includes("long-distance"))
    .sort((a, b) => a.occasions.indexOf("long-distance") - b.occasions.indexOf("long-distance"))
    .slice(0, 4);

  return (
    <>
      <JsonLd nodes={[breadcrumbNode([{ name: SITE.name, url: localizedUrl(locale) }, { name: t("eyebrow"), url: localizedUrl(locale, "/long-distance") }])]} />
      {/* Not clipped, and above what follows: the town picker's list drops down past the torn edge. The flowers clip themselves. */}
      <section className="relative isolate z-10 -mt-[var(--header-h)] bg-blush-paper pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x pt-14 pb-16 sm:pt-20 lg:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
            <div>
              <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
              {/* In em, not ch, so the fallback font wraps it as Newsreader will (platform-hero.tsx): 8.4em is Newsreader's 14ch. */}
              <h1 className="mt-5 max-w-[8.4em] display-hero text-balance">
                {t("h1a")} <em className="text-rose-deep">{t("h1b")}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>
            </div>
            <div className="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
              {/* Through EagerImg: drawn here it was a preload hint in this page's RSC payload, which the
                  header's prefetch of /long-distance added to every other page it was open on. */}
              <EagerImg src={HERO_ART.ldr} srcSet={heroSrcSet(HERO_ART.ldr)} sizes={heroSizes("(min-width: 1024px) 460px")} alt="" width={1800} height={1350} fetchPriority="high" decoding="async" className="aspect-[4/3] w-full rotate-[2deg] rounded-[32px] object-cover shadow-[0_40px_90px_-40px_rgba(120,20,60,0.6)] ring-8 ring-white" />
              <span className="absolute -bottom-4 -left-3 rotate-[-4deg] rounded-2xl bg-card px-4 py-2.5 font-hand text-[1.5rem] leading-none text-rose-deep shadow-lift">{t("polaroid")}</span>
            </div>
          </div>
          <div className="mt-12">
            <h2 className="display-md text-forest">{t("meet.title")}</h2>
            <div className="mt-6">
              <MeetInTheMiddle ways={waysData(lang)} />
            </div>
            <Link href={HALFWAY_TOOL_PATH} data-testid="ldr-tool" className="group mt-4 inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold text-rose-deep underline-offset-4 hover:underline">
              {t("meet.tool")}
              <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
      <TornEdge from="var(--brand-paper)" to="var(--brand-paper)" />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="text-eyebrow text-ink-soft">{t("virtual.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[16ch]">{t("virtual.title")}</h2>
          {/* An idea is its title until it is opened (DESIGN-LESS-TEXT); on a phone the four are one row, one to a screen, with dots. */}
          <ul id="ldr-virtual-row" className="-mx-5 mt-12 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {VIRTUAL_DATES.map((v, i) => (
              <li key={v.id} data-card className="relative flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-[26px] p-5 shadow-soft sm:w-auto" style={{ background: `linear-gradient(160deg, ${v.art.from} 0%, ${v.art.to} 100%)` }}>
                <span aria-hidden="true" className="absolute -top-2 -right-3 size-[96px]" style={{ rotate: `${((i * 37) % 24) - 12}deg` }}>
                  <Sticker id={v.art.sticker} />
                </span>
                <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
                {/* The idea's heading for whoever moves through the page by headings: one inside <summary> is lost, the summary being read as a button (sections.tsx, the check of 22 Nov 2026). */}
                <h3 className="sr-only">{v.title[lang]}</h3>
                <details className="group relative">
                  <summary className="mt-20 flex min-h-11 cursor-pointer list-none items-end justify-between gap-3 rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[23px] leading-[1.08] text-forest">{v.title[lang]}</span>
                    <Plus aria-hidden="true" className="mb-1 size-4 shrink-0 text-forest/65 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                  </summary>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-forest/75">{v.blurb[lang]}</p>
                  <p className="mt-4 border-t border-forest/10 pt-3 text-[13.5px] leading-snug text-forest/70">
                    <span className="font-semibold text-forest">{t("virtual.twist")}</span> {v.twist[lang]}
                  </p>
                </details>
                {v.id === "plan-the-visit" ? (
                  // The one idea that is a place on the site: its own line opens Dates, on their town once the box above has it (walk-rooms-14). Not laid over the card: it would cover the title that opens it.
                  <PlanVisitLink label={`${v.title[lang]}: ${t("virtual.openMap")}`} className="group relative mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-[14px] font-semibold text-rose-deep underline-offset-4 outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-forest">
                    <span aria-hidden="true" className="inline-flex items-center gap-1.5">
                      {t("virtual.openMap")}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </PlanVisitLink>
                ) : null}
              </li>
            ))}
          </ul>
          <IdeasDots target="ldr-virtual-row" count={VIRTUAL_DATES.length} className="mt-4 sm:hidden" />
          {/* The games that play across a call, as the games' own cards: a picture and a name. Two of
              them, so on a desk the line sits at the left and the pair at the right, as a spread. */}
          <div className="mt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_27.5rem] lg:items-center lg:gap-16">
            <h3 className="font-display text-[26px] leading-tight text-forest lg:max-w-[14ch] lg:text-[34px] lg:leading-[1.08]">{t("play.title")}</h3>
            <ul className="mt-6 grid max-w-[27.5rem] grid-cols-2 gap-3 sm:gap-6 lg:mt-0" data-testid="ldr-games">
              {LDR_GAMES.map((g) => (
                <li key={g.id}>
                  <Link href={g.href} className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-rose/50 focus-visible:ring-offset-4 focus-visible:ring-offset-paper">
                    <PlayingCard rank={g.rank} suit={g.suit} radius={20} className="aspect-[5/7] w-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5 motion-reduce:transition-none" faceClassName="items-center justify-center">
                      <span aria-hidden="true" className="block w-[58%]">
                        <Sticker id={g.sticker} />
                      </span>
                    </PlayingCard>
                    <span className="mt-3 block font-display text-[17px] leading-tight text-forest sm:text-[20px]">{gameTitle[g.id]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {gifts.length > 0 ? (
        <section className="border-t border-line bg-blush-paper py-20 lg:py-28">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-eyebrow text-rose-deep">{t("gifts.eyebrow")}</p>
                <h2 className="display-xl mt-4 max-w-[16ch] text-forest">{t("gifts.title")}</h2>
              </div>
              <Link href="/occasions/long-distance" className="group -my-2.5 inline-flex min-h-11 items-center gap-1.5 py-2.5 text-sm font-semibold text-rose-deep underline-offset-4 hover:underline">
                {t("gifts.all")}
                <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {/* Four posters, as "More like this" on a gift's page: a picture and a name. */}
            <ul className={`mt-10 ${POSTER_ROW}`} data-testid="ldr-gifts">
              {gifts.map((m) => (
                <li key={m.slug}>
                  <PosterLink href={`/templates/${m.slug}`} poster={m.thumbnail.poster} alt={m.tagline[lang]} label={m.name[lang]} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
