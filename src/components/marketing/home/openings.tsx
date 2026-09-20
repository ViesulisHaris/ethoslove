import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COVER_IDS, type GiftLocale } from "@/lib/gift/schema";
import { COVER_LOOKS } from "@/templates/_shared/covers/looks";
import { Cover } from "@/templates/_shared/covers/Cover";
import { FloralFrame } from "./cutouts";

/** Every cover a gift can open with, drawn for real, each one a link to a live demo. */
export async function Openings({ locale }: { locale: GiftLocale }) {
  const t = await getTranslations();
  const ids = COVER_IDS.filter((c) => c !== "classic");
  return (
    <section className="relative overflow-hidden bg-forest py-20 text-cream lg:py-28">
      <FloralFrame frame="band" ground="bare" />
      <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
      <div aria-hidden="true" className="absolute top-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-blush/10 blur-3xl" />
      <div className="container-x relative grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="text-[12px] font-medium tracking-[0.22em] text-cream/55 uppercase">{t("home.openings.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[14ch]">{t("home.openings.title")}</h2>
        </div>
        <p className="max-w-md text-lg leading-relaxed text-cream/70 lg:col-span-5 lg:pb-1">{t("home.openings.blurb")}</p>
      </div>
      <div className="scrollbar-none relative mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {ids.map((id) => (
          <Link key={id} href={`/demo/bouquet?cover=${id}`} className="group w-[200px] shrink-0 snap-start sm:w-[228px]">
            {/* isolate: a cover stacks itself high for the gift page; here it must stay under the header. */}
            <div className="relative isolate aspect-[390/640] overflow-hidden rounded-[28px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-transform duration-500 ease-[var(--ease-out-quint)] [container-type:size] group-hover:-translate-y-1.5">
              <Cover look={COVER_LOOKS[id]} recipientName="Ana" locale={locale} still />
            </div>
            <div className="mt-4 flex items-center justify-between px-1">
              <span className="font-display text-xl">{t(`editor.covers.names.${id}`)}</span>
              <span className="inline-flex items-center gap-1 text-sm text-cream/60 transition-colors group-hover:text-cream">
                {t("home.openings.preview")}
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
