"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, MoveHorizontal, Plane } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { awakeOverlap, clockOf, hoursAhead, milesOf, nearestCity } from "@/lib/dates/apart";
import { distanceKm, midpoint, round } from "@/lib/dates/geo";
import { CITIES } from "@/templates/_shared/places";
import { WhereBox, type Where } from "@/components/dates/where-box";

/** Further than this from any city we know, the halfway point is somewhere nobody can meet: open sea, or a lot of forest. */
const NOWHERE_KM = 400;

type Zone = { offset: number; name: string };

/**
 * Two towns in, three answers out: how far apart they are, where halfway is (along the curve of
 * the earth, which over a long hop is nowhere near the middle of a flat map), and the hours of the
 * day when both of them are awake. Offsets come from the forecast service, which knows each
 * town's time zone today, daylight saving included.
 */
export function MeetInTheMiddle() {
  const t = useTranslations("ldr.meet");
  const tw = useTranslations("dates.where");
  const locale = useLocale() === "es" ? "es" : "en";
  const [a, setA] = useState<Where | null>(null);
  const [b, setB] = useState<Where | null>(null);
  const [zones, setZones] = useState<Record<string, Zone>>({});
  const labels = { label: "", placeholder: tw("placeholder"), nearMe: tw("nearMe"), searching: tw("searching"), nothing: tw("nothing") };

  useEffect(() => {
    const controller = new AbortController();
    for (const place of [a, b]) {
      if (!place) continue;
      const key = `${round(place.lat, 2)},${round(place.lng, 2)}`;
      if (zones[key]) continue;
      fetch(`/api/dates/weather?lat=${round(place.lat, 2)}&lng=${round(place.lng, 2)}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ utcOffsetSeconds?: number; timezone?: string }>) : null))
        .then((json) => typeof json?.utcOffsetSeconds === "number" && setZones((z) => ({ ...z, [key]: { offset: json.utcOffsetSeconds!, name: json.timezone ?? "" } })))
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [a, b, zones]);

  const result = useMemo(() => {
    if (!a || !b) return null;
    const km = distanceKm(a, b);
    const middle = midpoint(a, b);
    const near = nearestCity(middle, CITIES);
    return { km, middle, near: near && near.km <= NOWHERE_KM ? near : null };
  }, [a, b]);
  const zoneA = a ? zones[`${round(a.lat, 2)},${round(a.lng, 2)}`] : undefined;
  const zoneB = b ? zones[`${round(b.lat, 2)},${round(b.lng, 2)}`] : undefined;
  const ahead = zoneA && zoneB ? hoursAhead(zoneA.offset, zoneB.offset) : null;
  const windows = zoneA && zoneB ? awakeOverlap(zoneA.offset, zoneB.offset) : null;
  const number = (n: number) => Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-GB");
  const hours = (h: number) => String(Math.abs(h)).replace(".5", "½");

  return (
    <div className="rounded-[32px] bg-white p-5 shadow-lift ring-1 ring-forest/5 sm:p-8">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-forest/60">{t("you")}</p>
          <WhereBox value={a} locale={locale} labels={{ ...labels, label: t("you") }} onPick={setA} />
        </div>
        <MoveHorizontal aria-hidden="true" className="mx-auto mb-3.5 hidden size-5 text-[#B0245A] sm:block" />
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-forest/60">{t("them")}</p>
          <WhereBox value={b} locale={locale} labels={{ ...labels, label: t("them") }} onPick={setB} />
        </div>
      </div>

      {result && a && b ? (
        <div className="mt-7 grid gap-4 lg:grid-cols-3" aria-live="polite">
          <div className="rounded-[24px] bg-[#FFF5F2] p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-[#B0245A] uppercase">
              <Plane aria-hidden="true" className="size-4" />
              {t("apart")}
            </p>
            <p className="mt-3 font-display text-[40px] leading-none text-forest tabular-nums">{number(result.km)} km</p>
            <p className="mt-1.5 text-[14px] text-forest/60">{t("miles", { miles: number(milesOf(result.km)) })}</p>
          </div>

          <div className="rounded-[24px] bg-[#FFF5F2] p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-[#B0245A] uppercase">
              <MoveHorizontal aria-hidden="true" className="size-4" />
              {t("halfway")}
            </p>
            {result.near ? (
              <>
                <p className="mt-3 font-display text-[32px] leading-[1.05] text-forest">{result.near.city.name}</p>
                <p className="mt-1.5 text-[14px] text-forest/60">{result.near.km < 40 ? t("halfwayExact") : t("halfwayNear", { km: number(result.near.km) })}</p>
                <Link href={`/dates?lat=${result.near.city.lat}&lng=${result.near.city.lng}&q=${encodeURIComponent(result.near.city.name)}`} className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#B0245A] underline-offset-4 hover:underline">
                  {t("datesThere", { city: result.near.city.name })}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-[26px] leading-[1.1] text-forest">{t("nowhere")}</p>
                <p className="mt-1.5 text-[14px] leading-snug text-forest/60">{t("nowhereSub")}</p>
                <Link href={`/dates?lat=${b.lat}&lng=${b.lng}&q=${encodeURIComponent(b.name)}`} className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#B0245A] underline-offset-4 hover:underline">
                  {t("datesThere", { city: b.name })}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <div className="rounded-[24px] bg-[#FFF5F2] p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-[#B0245A] uppercase">
              <Clock3 aria-hidden="true" className="size-4" />
              {t("clocks")}
            </p>
            {ahead === null || !windows ? (
              <p className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-forest/10" />
            ) : (
              <>
                <p className="mt-3 font-display text-[26px] leading-[1.1] text-forest">{ahead === 0 ? t("sameTime") : ahead > 0 ? t("ahead", { name: b.name, hours: hours(ahead) }) : t("behind", { name: b.name, hours: hours(ahead) })}</p>
                <p className="mt-2 text-[14px] leading-snug text-forest/65">
                  {windows.length === 0 ? t("neverAwake") : t("bothAwake", { windows: windows.map(([from, to]) => `${clockOf(from)}–${clockOf(to)}`).join(` ${t("and")} `) })}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[14.5px] text-forest/55">{t("hint")}</p>
      )}
    </div>
  );
}
