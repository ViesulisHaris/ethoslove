import { ArrowRight, Smartphone, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FloralFrame } from "@/components/marketing/home/cutouts";
import { TableFelt } from "@/components/games/cards";
import { GameHand } from "@/components/games/game-hand";
import { GAMES, type GameKey } from "@/lib/games/catalogue";

/** Long distance, on the dark ground: two dots and the arc between them. */
export async function LongDistanceBand() {
  const t = await getTranslations("platform.ldr");
  return (
    <section className="relative isolate overflow-hidden bg-forest py-24 text-cream lg:py-32">
      <FloralFrame frame="band" ground="bare" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-2">
        <div data-reveal>
          <p className="text-eyebrow text-cream/60">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[15ch]">
            {t("titleA")} <em className="text-blush">{t("titleB")}</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/75">{t("blurb")}</p>
          {/* Less padding, and under 360px a point less type, keep both labels on one line at 320px ("Abrir la habitación a distancia" is 228px at 16px); if one ever wraps, it wraps balanced and centred. */}
          <Link href="/long-distance" className="mt-9 inline-flex h-13 items-center gap-2 rounded-full bg-cream px-4 text-center text-base leading-tight font-semibold text-balance text-forest shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] transition-transform hover:-translate-y-0.5 max-[359px]:text-[15px] sm:px-7">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <svg data-reveal viewBox="0 0 520 300" className="mx-auto h-auto w-full max-w-[520px]" aria-hidden="true" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
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

/** Games: the whole hand of them on a little card table, and the two ways to play. */
export async function GamesBand() {
  const t = await getTranslations("platform.games");
  const tg = await getTranslations("games");
  const titles = Object.fromEntries(GAMES.map((g) => [g.key, tg(`${g.key}.title`)])) as Record<GameKey, string>;
  return (
    <section className="bg-paper py-20 lg:py-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div data-reveal className="relative isolate order-2 overflow-hidden rounded-[32px] bg-[#200b18] px-4 pt-6 pb-2 shadow-lift sm:px-10 sm:pt-10 lg:order-1" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
          <TableFelt />
          <GameHand titles={titles} label={tg("hub.pickTitle")} />
        </div>
        <div data-reveal className="order-1 lg:order-2">
          <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[14ch]">{t("title")}</h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">{t("blurb")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest/[0.06] px-4 py-2 text-[13.5px] font-semibold text-forest/80">
              <Users aria-hidden="true" className="size-4 text-rose-deep" />
              {tg("hub.one")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-forest/[0.06] px-4 py-2 text-[13.5px] font-semibold text-forest/80">
              <Smartphone aria-hidden="true" className="size-4 text-rose-deep" />
              {tg("hub.two")}
            </span>
          </div>
          <Link href="/games" className="btn-rose mt-8 inline-flex h-13 items-center gap-2 rounded-full px-7 text-base font-semibold">
            {t("cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
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
      <div data-reveal className="container-x relative flex flex-col items-center text-center">
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
