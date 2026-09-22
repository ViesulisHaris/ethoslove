"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, Copy, Gift, MapPinned, Navigation, Share2, Sunset, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDay, toYmd } from "@/lib/dates/calendar";
import { distanceKm, round, walkingMinutes } from "@/lib/dates/geo";
import { ideaById } from "@/lib/dates/ideas";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import { decodePlan, EMPTY_PLAN, encodePlan, moveStop, removeStop, type Plan } from "@/lib/dates/plan";
import type { Forecast } from "@/lib/dates/weather";
import { Cutout } from "@/components/marketing/home/cutouts";
import { GroupIcon } from "./group-icon";
import { MapView } from "./map-view";
import { usePlan } from "./use-plan";
import { WeatherGlyph } from "./weather-glyph";

const noop = () => () => undefined;
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash;

/**
 * A date, written down. Their own plan is edited here and kept in this browser; a plan that came
 * in a link is read out of the part after the `#`, which browsers keep to themselves, so the
 * evening somebody planned never touches a server, ours included.
 */
export function PlanView() {
  const t = useTranslations("plan");
  const locale = useLocale() === "es" ? "es" : "en";
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [own, updateOwn] = usePlan();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [copied, setCopied] = useState(false);
  const [kept, setKept] = useState(false);

  const shared = useMemo(() => (hash.startsWith("#p=") ? decodePlan(hash.slice(3)) : null), [hash]);
  const broken = hash.startsWith("#p=") && !shared;
  const plan: Plan = shared ?? own;
  const editable = !shared;
  const first = plan.stops[0];
  const at = first ? `${round(first.lat, 2)},${round(first.lng, 2)}` : "";

  useEffect(() => {
    if (!at || !plan.date) return;
    const [lat, lng] = at.split(",");
    const controller = new AbortController();
    fetch(`/api/dates/weather?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Forecast>) : null))
      .then((json) => json?.days && setForecast(json))
      .catch(() => undefined);
    return () => controller.abort();
  }, [at, plan.date]);

  const day = forecast?.days.find((d) => d.date === plan.date);
  const idea = ideaById(plan.idea);
  const past = Boolean(plan.date && plan.date < toYmd(new Date()));
  const route = useMemo(() => plan.stops.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name })), [plan.stops]);
  const mapLabels = useMemo(() => ({ zoomToSee: "", nearMe: "", loading: t("mapLoading"), unavailable: t("mapUnavailable"), map: t("mapLabel"), zoomIn: "", zoomOut: "" }), [t]);

  const link = () => `${window.location.origin}${getPathname({ href: "/plan", locale })}#p=${encodePlan(plan)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(t("copyFallback"), link());
    }
  };
  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: t("shareTitle"), text: plan.to ? t("shareTextTo", { name: plan.to }) : t("shareText"), url: link() });
    } catch {
      // Closed the share sheet: nothing to do.
    }
  };

  if (!isClient) return <div className="container-narrow py-16" aria-hidden="true"><div className="h-[520px] animate-pulse rounded-[32px] bg-white/70" /></div>;

  if (broken || plan.stops.length === 0) {
    return (
      <section className="container-narrow py-16 text-center sm:py-24">
        <Cutout id="envelope-ps" className="mx-auto w-24 -rotate-6 drop-shadow-[0_14px_24px_rgba(120,50,70,0.25)]" />
        <h1 className="mt-6 display-xl text-forest">{broken ? t("broken.title") : t("empty.title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-forest/70">{broken ? t("broken.sub") : t("empty.sub")}</p>
        <Link href="/dates" className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-forest px-7 text-base font-semibold text-cream shadow-[0_16px_36px_-16px_rgba(42,15,31,0.7)] transition-transform hover:-translate-y-0.5">
          {t("empty.cta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="container-x grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12">
      <article className="relative rounded-[32px] bg-card p-6 shadow-lift ring-1 ring-forest/5 sm:p-10">
        <Cutout id="bow-gingham" className="absolute -top-7 right-6 w-20 rotate-12 drop-shadow-[0_10px_16px_rgba(120,50,70,0.25)] sm:w-24" />
        <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{shared ? t("eyebrowShared") : t("eyebrow")}</p>
        <h1 className="mt-3 display-xl text-forest first-letter:uppercase">{plan.date ? formatDay(plan.date, locale) : t("someday")}</h1>
        <p className="mt-2 text-[17px] text-forest/70">{[plan.where, idea?.title[locale]].filter(Boolean).join(" · ")}</p>

        {editable ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12.5px] font-medium text-forest/60">{t("to")}</span>
              <input value={plan.to ?? ""} maxLength={40} onChange={(e) => updateOwn((p) => ({ ...p, to: e.target.value }))} placeholder={t("toPlaceholder")} className="mt-1 h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]" />
            </label>
            <label className="block">
              <span className="text-[12.5px] font-medium text-forest/60">{t("from")}</span>
              <input value={plan.from ?? ""} maxLength={40} onChange={(e) => updateOwn((p) => ({ ...p, from: e.target.value }))} placeholder={t("fromPlaceholder")} className="mt-1 h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]" />
            </label>
          </div>
        ) : plan.to || plan.from ? (
          <p className="mt-5 font-hand text-[1.9rem] leading-tight text-rose-deep">{plan.to && plan.from ? t("forFrom", { to: plan.to, from: plan.from }) : plan.to ? t("forOnly", { to: plan.to }) : t("fromOnly", { from: plan.from ?? "" })}</p>
        ) : null}

        {day ? (
          <p className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-blush-paper px-4 py-3 text-[14.5px] text-forest/80">
            <WeatherGlyph condition={day.condition} className="size-5" />
            <span className="font-semibold text-forest tabular-nums">
              {day.tMax}° / {day.tMin}°
            </span>
            {day.rainChance !== null ? <span>{t("rain", { chance: day.rainChance })}</span> : null}
            {day.sunset ? (
              <span className="inline-flex items-center gap-1.5">
                <Sunset aria-hidden="true" className="size-4 text-star" />
                {t("sunset", { time: day.sunset })}
              </span>
            ) : null}
          </p>
        ) : null}
        {past ? <p className="mt-4 text-[14px] text-forest/55">{t("past")}</p> : null}

        <ol className="mt-8">
          {plan.stops.map((stop, i) => {
            const group = GROUPS[KINDS[stop.kind].group];
            const previous = plan.stops[i - 1];
            return (
              <li key={stop.id} className="relative pb-7 pl-[58px] last:pb-0">
                {i < plan.stops.length - 1 ? <span aria-hidden="true" className="absolute top-11 bottom-0 left-[21px] border-l-2 border-dotted border-rose/40" /> : null}
                <span className="absolute top-0 left-0 grid size-11 place-items-center rounded-full bg-rose text-[15px] font-bold text-white shadow-[0_8px_16px_-8px_rgba(176,36,90,0.8)]">{i + 1}</span>
                {previous ? <p className="-mt-2 mb-2 text-[11.5px] font-medium tracking-wide text-forest/45 uppercase">{t("walk", { minutes: walkingMinutes(distanceKm(previous, stop)) })}</p> : null}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold" style={{ color: group.color }}>
                  {editable ? (
                    <input type="time" aria-label={t("timeFor", { name: stop.name })} value={stop.time ?? ""} onChange={(e) => updateOwn((p) => ({ ...p, stops: p.stops.map((s) => (s.id === stop.id ? { ...s, time: e.target.value || undefined } : s)) }))} className="h-9 rounded-xl border border-forest/15 bg-white px-2 text-[14px] text-forest tabular-nums outline-none focus:border-rose/50" />
                  ) : stop.time ? (
                    <span className="text-[15px] text-forest tabular-nums">{stop.time}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <GroupIcon group={KINDS[stop.kind].group} className="size-4" />
                    {KINDS[stop.kind].label[locale]}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-[23px] leading-tight text-forest">{stop.name}</h2>
                {stop.address ? <p className="text-[14px] text-forest/60">{stop.address}</p> : null}
                {editable ? (
                  <input value={stop.note ?? ""} maxLength={140} aria-label={t("noteFor", { name: stop.name })} placeholder={t("stopNotePlaceholder")} onChange={(e) => updateOwn((p) => ({ ...p, stops: p.stops.map((s) => (s.id === stop.id ? { ...s, note: e.target.value || undefined } : s)) }))} className="mt-2 h-10 w-full rounded-xl border border-dashed border-forest/20 bg-transparent px-3 text-[14.5px] text-forest outline-none placeholder:text-forest/35 focus:border-rose/50" />
                ) : stop.note ? (
                  <p className="mt-1.5 font-hand text-[1.45rem] leading-snug text-forest/80">{stop.note}</p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-forest/15 px-3 text-[12.5px] font-semibold text-forest hover:bg-forest/5">
                    <Navigation aria-hidden="true" className="size-3.5" />
                    {t("directions")}
                  </a>
                  {editable ? (
                    <>
                      <button type="button" disabled={i === 0} aria-label={t("moveUp", { name: stop.name })} onClick={() => updateOwn((p) => moveStop(p, stop.id, -1))} className="grid size-9 place-items-center rounded-full border border-forest/15 text-forest hover:bg-forest/5 disabled:opacity-25">
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" disabled={i === plan.stops.length - 1} aria-label={t("moveDown", { name: stop.name })} onClick={() => updateOwn((p) => moveStop(p, stop.id, 1))} className="grid size-9 place-items-center rounded-full border border-forest/15 text-forest hover:bg-forest/5 disabled:opacity-25">
                        <ArrowDown className="size-4" />
                      </button>
                      <button type="button" aria-label={t("removeStop", { name: stop.name })} onClick={() => updateOwn((p) => removeStop(p, stop.id))} className="grid size-9 place-items-center rounded-full border border-forest/15 text-destructive hover:bg-destructive/5">
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {editable ? (
          <label className="mt-8 block">
            <span className="text-[12.5px] font-medium text-forest/60">{t("note")}</span>
            <textarea value={plan.note ?? ""} maxLength={280} rows={3} onChange={(e) => updateOwn((p) => ({ ...p, note: e.target.value }))} placeholder={t("notePlaceholder")} className="mt-1 w-full resize-none rounded-2xl border border-forest/15 bg-white px-4 py-3 text-[16px] leading-relaxed text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]" />
          </label>
        ) : plan.note ? (
          <p className="mt-8 border-t border-dashed border-forest/15 pt-6 font-hand text-[1.7rem] leading-snug text-forest/85">{plan.note}</p>
        ) : null}
        {idea && !editable ? <p className="mt-6 rounded-2xl bg-rose-soft p-4 text-[14.5px] leading-snug text-rose-ink"><span className="font-semibold">{t("twist")}</span> {idea.twist[locale]}</p> : null}
      </article>

      <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <MapView center={first} zoom={14.5} places={[]} selected={null} hoveredId={null} route={route} origin={null} searching={false} labels={mapLabels} interactive={false} className="h-[300px] w-full rounded-[28px] shadow-soft ring-1 ring-forest/10 sm:h-[340px]" />

        {editable ? (
          <div className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
            <h2 className="font-display text-[22px] text-forest">{t("send.title")}</h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/65">{t("send.sub")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={share} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-rose text-[14.5px] font-semibold text-white shadow-[0_16px_34px_-16px_rgba(176,36,90,0.85)] transition-transform hover:-translate-y-0.5">
                <Share2 aria-hidden="true" className="size-4" />
                {t("send.share")}
              </button>
              <button type="button" onClick={copy} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full border text-[14.5px] font-semibold transition-colors", copied ? "border-moss/30 bg-moss-soft text-moss" : "border-forest/15 text-forest hover:bg-forest/5")}>
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                <span aria-live="polite">{copied ? t("send.copied") : t("send.copy")}</span>
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-snug text-forest/45">{t("send.private")}</p>
          </div>
        ) : (
          <div className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
            <h2 className="font-display text-[22px] text-forest">{t("received.title")}</h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/65">{t("received.sub")}</p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={kept}
                onClick={() => {
                  updateOwn(() => ({ ...EMPTY_PLAN, ...plan }));
                  setKept(true);
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-forest text-[14.5px] font-semibold text-cream disabled:bg-moss-soft disabled:text-moss"
              >
                {kept ? <Check aria-hidden="true" className="size-4" /> : <MapPinned aria-hidden="true" className="size-4" />}
                {kept ? t("received.kept") : t("received.keep")}
              </button>
              <Link href="/dates" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-forest/15 text-[14.5px] font-semibold text-forest hover:bg-forest/5">
                {t("received.own")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        )}

        <Link href="/templates" className="group flex items-center gap-4 rounded-[28px] bg-forest p-5 text-cream shadow-soft transition-transform hover:-translate-y-0.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Gift aria-hidden="true" className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[20px] leading-tight">{t("gift.title")}</span>
            <span className="mt-1 block text-[13.5px] leading-snug text-cream/70">{t("gift.sub")}</span>
          </span>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>

        {editable ? (
          <div className="flex items-center justify-between gap-3 px-1">
            <Link href="/dates" className="-my-2.5 inline-flex min-h-11 items-center py-2.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
              {t("addMore")}
            </Link>
            <button type="button" onClick={() => window.confirm(t("clearConfirm")) && updateOwn(() => EMPTY_PLAN)} className="text-[13.5px] text-forest/50 underline-offset-4 hover:text-destructive hover:underline">
              {t("clear")}
            </button>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
