import { ArrowRight, Smartphone, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FloralFrame } from "@/components/marketing/home/cutouts";

/** Long distance, on the dark ground: two dots and the arc between them. */
export async function LongDistanceBand() {
  const t = await getTranslations("platform.ldr");
  return (
    <section className="relative isolate overflow-hidden bg-forest py-24 text-cream lg:py-32">
      <FloralFrame frame="band" ground="bare" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-eyebrow text-cream/60">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[15ch]">
            {t("titleA")} <em className="text-blush">{t("titleB")}</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/75">{t("blurb")}</p>
          <Link href="/long-distance" className="mt-9 inline-flex h-13 items-center gap-2 rounded-full bg-cream px-7 text-base font-semibold text-forest shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] transition-transform hover:-translate-y-0.5">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <svg viewBox="0 0 520 300" className="mx-auto h-auto w-full max-w-[520px]" aria-hidden="true">
          <path d="M60 236 Q260 -20 460 236" fill="none" stroke="#F0C8C2" strokeWidth="2.5" strokeDasharray="1 11" strokeLinecap="round" />
          <circle cx="260" cy="108" r="30" fill="#F0C8C2" opacity="0.16" />
          <circle cx="260" cy="108" r="9" fill="#F0C8C2" />
          <text x="260" y="70" textAnchor="middle" fontSize="13" fill="#F4EDE0" opacity="0.8" fontFamily="var(--font-sans)">
            {t("halfway")}
          </text>
          {[
            { x: 60, name: t("cityA") },
            { x: 460, name: t("cityB") },
          ].map((c) => (
            <g key={c.x}>
              <circle cx={c.x} cy="236" r="22" fill="#F4EDE0" opacity="0.12" />
              <circle cx={c.x} cy="236" r="8" fill="#F4EDE0" />
              <text x={c.x} y="278" textAnchor="middle" fontSize="15" fill="#F4EDE0" fontFamily="var(--font-display)">
                {c.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

/** Games, before there are games: what is coming, and the two ways to play. */
export async function GamesBand() {
  const t = await getTranslations("platform.games");
  return (
    <section className="bg-paper py-20 lg:py-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 grid grid-cols-2 gap-4 lg:order-1">
          {(["one", "two"] as const).map((mode, i) => {
            const Icon = i === 0 ? Users : Smartphone;
            return (
              <div key={mode} className="rounded-[26px] p-6 shadow-soft" style={{ background: i === 0 ? "linear-gradient(160deg,#E6E0F8,#D2C8F0)" : "linear-gradient(160deg,#FCE0EE,#F5BFD9)", rotate: i === 0 ? "-2deg" : "2deg" }}>
                <Icon aria-hidden="true" className="size-8 text-forest/80" strokeWidth={1.6} />
                <p className="mt-10 font-display text-[22px] leading-tight text-forest">{t(`${mode}.title`)}</p>
                <p className="mt-2 text-[14px] leading-snug text-forest/70">{t(`${mode}.blurb`)}</p>
              </div>
            );
          })}
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[14ch]">{t("title")}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">{t("blurb")}</p>
          <Link href="/games" className="group mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#4B3F9A] underline-offset-4 hover:underline">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function PlatformClosing() {
  const t = await getTranslations("platform.closing");
  return (
    <section className="relative isolate overflow-hidden bg-forest py-28 text-cream lg:py-36">
      <FloralFrame frame="closing" ground="dark" />
      <div className="container-x relative flex flex-col items-center text-center">
        <h2 className="display-hero max-w-[14ch] italic">{t("title")}</h2>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/75">{t("blurb")}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/dates" className="inline-flex h-14 items-center gap-2 rounded-full bg-cream px-8 text-base font-semibold text-forest shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] transition-transform hover:-translate-y-0.5">
            {t("dates")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/gifts" className="inline-flex h-14 items-center rounded-full border border-cream/25 px-8 text-base font-semibold text-cream transition-colors hover:bg-white/10">
            {t("gifts")}
          </Link>
        </div>
      </div>
    </section>
  );
}
