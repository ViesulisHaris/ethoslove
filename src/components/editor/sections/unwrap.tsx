/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { CalendarHeart, Check, Gift, Loader2, Plane, Sparkles, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { encodePlan } from "@/lib/dates/plan";
import { useEditor } from "@/lib/editor/store";
import type { GiftLocale, GiftUnwrap } from "@/lib/gift/schema";
import { isUnwrapDay } from "@/lib/gift/unwrap-rules";
import type { Trip } from "@/lib/trips/presets";
import { usePlan } from "@/components/dates/use-plan";
import { Input } from "@/components/ui/input";
import { CHIP_PHOTO_WIDTH, gatherPhotos, stopPlaces, withStopPhotos } from "@/components/gifts/unwrap-photos";
import { stopArt, tripNights, unwrapDay } from "@/templates/_shared/unwrap";
import type { TemplateManifest } from "@/templates/types";
import { Field, SectionHeader } from "../field";

/**
 * "A surprise inside" (GiftData.unwrap): a planned date or a trip, wrapped as a present at the end
 * of the gift. Usually it arrives already attached ("Wrap it in a gift" on /plan or a trip's page);
 * here it can be seen, dated, taken off, or added from the plan this browser keeps or one of the
 * preset trips. Included with a premium template; "Make it special" on the two free ones.
 */
export function UnwrapSection({ manifest }: { manifest: TemplateManifest }) {
  const t = useTranslations("editor.unwrap");
  const tS = useTranslations("editor.sections.unwrap");
  const ui = useLocale() === "es" ? "es" : "en";
  const unwrap = useEditor((s) => s.data.unwrap);
  const giftLocale = useEditor((s) => s.data.locale);
  const patch = useEditor((s) => s.patch);
  const [plan] = usePlan();
  const [busy, setBusy] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const included = manifest.tier === "premium";

  // Both builders (and the trips, 90 KB of them) load only when asked for: most gifts never carry one.
  const addPlan = async () => {
    if (busy || plan.stops.length === 0) return;
    setBusy("plan");
    try {
      const [{ planUnwrap }, { ideaById }] = await Promise.all([import("@/lib/dates/plan-gift"), import("@/lib/dates/ideas")]);
      const photos = await gatherPhotos(plan.stops.filter((s) => s.named !== false).map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })));
      const link = `${giftLocale === "es" ? "/es" : ""}/plan#p=${encodePlan(plan)}`;
      patch({ unwrap: planUnwrap(plan, giftLocale, { photos, link, title: ideaById(plan.idea)?.title[giftLocale] }) });
    } finally {
      setBusy(null);
    }
  };

  const showTrips = async () => {
    if (busy) return;
    setBusy("trips");
    try {
      const { TRIPS } = await import("@/lib/trips/presets");
      setTrips(TRIPS);
    } finally {
      setBusy(null);
    }
  };

  const addTrip = async (trip: Trip) => {
    if (busy) return;
    setBusy(trip.id);
    try {
      const [{ tripUnwrap }, { readLastFrom }] = await Promise.all([import("@/lib/trips/trip-gift"), import("@/lib/trips/last-from")]);
      const base = tripUnwrap(trip, giftLocale, { from: trip.kind === "road" ? null : readLastFrom() });
      patch({ unwrap: withStopPhotos(base, await gatherPhotos(stopPlaces(base), CHIP_PHOTO_WIDTH)) });
      setTrips(null);
    } finally {
      setBusy(null);
    }
  };

  const badge = included ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-2 py-0.5 text-[11px] font-semibold text-ink">
      <Check className="size-3" />
      {t("included")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-ink">
      <Sparkles className="size-3" />
      {t("special")}
    </span>
  );

  return (
    <section data-testid="unwrap-section">
      <SectionHeader n={tS("n")} title={tS("title")} blurb={tS("blurb")} badge={badge} />

      {unwrap ? (
        <Attached unwrap={unwrap} locale={ui} onChange={(next) => patch({ unwrap: next })} onRemove={() => patch({ unwrap: undefined })} />
      ) : trips ? (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="text-sm font-semibold">{t("pickTrip")}</p>
            <button type="button" onClick={() => setTrips(null)} className="flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] text-ink-soft hover:bg-ink/5">
              <X className="size-3.5" />
              {t("cancel")}
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button type="button" onClick={() => void addTrip(trip)} disabled={busy !== null} className="group block w-full text-left disabled:opacity-50" data-testid={`unwrap-trip-${trip.id}`}>
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${trip.art.from}, ${trip.art.to})` }}>
                    {trip.image ? <img src={trip.image.replace(/\.webp$/, "-sm.webp")} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" /> : null}
                    {busy === trip.id ? (
                      <span className="absolute inset-0 grid place-items-center bg-ink/45 text-paper">
                        <Loader2 className="size-5 animate-spin" />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1.5 block px-0.5 text-[13px] leading-snug font-medium">{trip.title[ui]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-dashed border-border bg-card">
            <button type="button" onClick={() => void addPlan()} disabled={busy !== null || plan.stops.length === 0} className="flex flex-1 flex-col items-start rounded-2xl p-4 text-left enabled:hover:bg-ink/[0.03] disabled:cursor-not-allowed" data-testid="unwrap-add-plan">
              <span className="grid size-10 place-items-center rounded-full bg-coral/15 text-coral">{busy === "plan" ? <Loader2 className="size-4 animate-spin" /> : <CalendarHeart className="size-4" />}</span>
              <span className={`mt-3 text-sm font-semibold ${plan.stops.length === 0 ? "text-muted-foreground" : ""}`}>{busy === "plan" ? t("wrapping") : t("addPlan")}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{plan.stops.length === 0 ? t("noPlan") : t("addPlanHelp")}</span>
            </button>
            {plan.stops.length === 0 ? (
              <Link href="/dates" target="_blank" className="mx-4 mb-3 -mt-1 inline-flex min-h-10 items-center self-start text-[13px] font-semibold text-coral underline-offset-4 hover:underline">
                {t("planLink")}
              </Link>
            ) : null}
          </div>
          <button type="button" onClick={() => void showTrips()} disabled={busy !== null} className="flex flex-col items-start rounded-2xl border border-dashed border-border bg-card p-4 text-left hover:border-ink/40" data-testid="unwrap-add-trip">
            <span className="grid size-10 place-items-center rounded-full bg-coral/15 text-coral">{busy === "trips" ? <Loader2 className="size-4 animate-spin" /> : <Plane className="size-4" />}</span>
            <span className="mt-3 text-sm font-semibold">{t("addTrip")}</span>
            <span className="mt-0.5 text-xs text-muted-foreground">{t("addTripHelp")}</span>
          </button>
        </div>
      )}

      {!included ? <p className="mt-3 text-xs text-muted-foreground">{t("specialNote")}</p> : null}
    </section>
  );
}

/** The day a surprise is for, set or cleared from a date input ("" clears it). */
function withDay<K extends "date" | "depart" | "back">(unwrap: GiftUnwrap, key: K, value: string): GiftUnwrap {
  const day = isUnwrapDay(value) ? value : undefined;
  if (key === "date") {
    const next = { ...unwrap };
    if (day) next.date = day;
    else delete next.date;
    return next;
  }
  if (!unwrap.trip) return unwrap;
  const trip = { ...unwrap.trip };
  if (day) trip[key as "depart" | "back"] = day;
  else delete trip[key as "depart" | "back"];
  return { ...unwrap, trip };
}

function Attached({ unwrap, locale, onChange, onRemove }: { unwrap: GiftUnwrap; locale: GiftLocale; onChange: (next: GiftUnwrap) => void; onRemove: () => void }) {
  const t = useTranslations("editor.unwrap");
  const first = unwrap.stops[0];
  const art = first ? stopArt(first) : null;
  const picture = unwrap.image ?? unwrap.stops.find((s) => s.image)?.image ?? art?.src ?? null;
  const trip = unwrap.kind === "trip" ? unwrap.trip : undefined;
  const nights = trip ? tripNights(trip) : null;
  const facts = [unwrap.kind === "trip" ? t("trip") : t("date"), unwrap.stops.length > 0 ? t("stops", { count: unwrap.stops.length }) : null, nights ? t("nights", { count: nights }) : null].filter(Boolean).join(" · ");
  const day = unwrap.kind === "date" ? (unwrapDay(unwrap, locale) ?? t("noDay")) : trip ? `${trip.from ? `${trip.from} → ` : ""}${trip.to}` : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid="unwrap-attached">
      <div className="flex items-center gap-3.5 p-3">
        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-coral/10 text-coral">
          {picture ? <img src={picture} alt="" className="absolute inset-0 size-full object-cover" /> : <Gift className="size-6" />}
          <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-paper/90 text-coral shadow-sm">
            <Gift className="size-3" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-coral uppercase">{facts}</p>
          <p className="mt-0.5 truncate font-display text-[1.15rem] leading-tight">{unwrap.title}</p>
          {day ? <p className="mt-0.5 truncate text-xs text-muted-foreground first-letter:uppercase">{day}</p> : null}
        </div>
        <button type="button" onClick={onRemove} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-soft hover:bg-ink/5" data-testid="unwrap-remove">
          <Trash2 className="size-3.5" />
          {t("remove")}
        </button>
      </div>
      <div className="grid gap-3 border-t border-border bg-paper/50 px-3 py-3 sm:grid-cols-2">
        {unwrap.kind === "date" ? (
          <Field id="unwrap-day" label={t("day")}>
            <Input id="unwrap-day" type="date" value={unwrap.date ?? ""} onChange={(e) => onChange(withDay(unwrap, "date", e.target.value))} className="h-11" />
          </Field>
        ) : trip ? (
          <>
            <Field id="unwrap-depart" label={t("depart")}>
              <Input id="unwrap-depart" type="date" value={trip.depart ?? ""} onChange={(e) => onChange(withDay(unwrap, "depart", e.target.value))} className="h-11" />
            </Field>
            <Field id="unwrap-back" label={t("back")}>
              <Input id="unwrap-back" type="date" value={trip.back ?? ""} min={trip.depart} onChange={(e) => onChange(withDay(unwrap, "back", e.target.value))} className="h-11" />
            </Field>
          </>
        ) : null}
      </div>
    </div>
  );
}
