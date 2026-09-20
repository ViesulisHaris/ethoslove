import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OCCASIONS } from "@/config/occasions";
import { Cutout } from "./cutouts";

/** Magazine-index style list, not a card grid. */
export async function OccasionsIndex() {
  const t = await getTranslations();
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-eyebrow text-ink-soft">{t("home.occasions.eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[12ch]">{t("home.occasions.title")}</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">{t("home.occasions.blurb")}</p>
          <Cutout id="envelope-ps" className="mt-10 hidden w-[150px] -rotate-6 drop-shadow-[0_16px_22px_rgba(70,40,20,0.28)] lg:block" />
        </div>
        <ol className="grid border-t border-line lg:col-span-7 sm:grid-cols-2 sm:gap-x-10">
          {OCCASIONS.map((o, i) => (
            <li key={o} className="border-b border-line">
              <Link href={`/occasions/${o}`} className="group flex items-baseline gap-4 py-4 transition-colors hover:text-coral">
                <span className="text-mono-meta w-7 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[1.6rem] leading-none">{t(`occasions.${o}`)}</span>
                <ArrowUpRight className="ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
