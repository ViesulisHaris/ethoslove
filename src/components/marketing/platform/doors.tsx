import { ArrowRight, Gamepad2, Gift, MapPinned, Plane } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DOORS = [
  { key: "dates", href: "/dates", Icon: MapPinned, ground: "linear-gradient(160deg,#FFE3D3 0%,#F9C6D0 100%)", ink: "#8E2F4C", soon: false },
  { key: "gifts", href: "/gifts", Icon: Gift, ground: "linear-gradient(160deg,#F8E6CF 0%,#EED2B2 100%)", ink: "#7A4B16", soon: false },
  { key: "ldr", href: "/long-distance", Icon: Plane, ground: "linear-gradient(160deg,#D9EEF3 0%,#BBDDE8 100%)", ink: "#22607F", soon: false },
  { key: "games", href: "/games", Icon: Gamepad2, ground: "linear-gradient(160deg,#E6E0F8 0%,#D2C8F0 100%)", ink: "#4B3F9A", soon: true },
] as const;

/** The four rooms of the house, as four paper cards. */
export async function Doors() {
  const t = await getTranslations("platform.doors");
  const soon = (await getTranslations("common"))("comingSoon");
  return (
    <section className="bg-paper py-20 lg:py-28">
      <div className="container-x">
        <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
        <h2 className="display-xl mt-4 max-w-[18ch]">{t("title")}</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DOORS.map(({ key, href, Icon, ground, ink, soon: isSoon }, i) => (
            <li key={key}>
              <Link href={href} className={cn("group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[28px] p-6 shadow-soft transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift", i % 2 === 1 ? "lg:translate-y-6 lg:hover:translate-y-[18px]" : "")} style={{ background: ground }}>
                <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
                <span className="relative grid size-14 place-items-center rounded-2xl bg-white/75 shadow-soft" style={{ color: ink }}>
                  <Icon aria-hidden="true" className="size-7" strokeWidth={1.7} />
                </span>
                {isSoon ? <span className="absolute top-6 right-6 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: ink }}>{soon}</span> : null}
                <span className="relative mt-auto block pt-10">
                  <span className="block font-display text-[28px] leading-[1.05] text-forest">{t(`${key}.title`)}</span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-forest/70">{t(`${key}.blurb`)}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: ink }}>
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
