"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, Copy, Gift, Lock, LogIn, MapPinned, Navigation, Share2, Sunset, Ticket, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDay, toYmd } from "@/lib/dates/calendar";
import { distanceKm, formatDistance, round, WALK_KM, walkingMinutes } from "@/lib/dates/geo";
import { ideaById } from "@/lib/dates/ideas";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import { decodePlan, EMPTY_PLAN, encodePlan, moveStop, readPlan, removeStop, stopName, type Plan } from "@/lib/dates/plan";
import { planUnwrap } from "@/lib/dates/plan-gift";
import { sellsTickets, ticketQuery } from "@/lib/dates/ticketed";
import type { Forecast } from "@/lib/dates/weather";
import { FREE_SAVED_DATES, type Currency } from "@/lib/pricing/products";
import { rememberSaveAfterSignIn, writeLink } from "@/lib/saved-dates/link";
import type { SyncNotice } from "@/lib/saved-dates/sync";
import type { UpsellReason } from "@/lib/saved-dates/types";
import { tiqetsSearch } from "@/lib/trips/partners";
import { TemplateChooser } from "@/components/gifts/template-chooser";
import { gatherPhotos } from "@/components/gifts/unwrap-photos";
import { Cutout } from "@/components/marketing/home/cutouts";
import { MapsMenu } from "@/components/saved-dates/maps-menu";
import { SavePlanPanel } from "@/components/saved-dates/save-plan-panel";
import { SignInDialog } from "@/components/saved-dates/sign-in-dialog";
import { SavedDatesUpsell } from "@/components/saved-dates/upsell-sheet";
import { useOpenSavedDate } from "@/components/saved-dates/use-open-saved-date";
import { useSavedAccount, useSignedInWhile } from "@/components/saved-dates/use-saved-account";
import { useSavedPlanSync, useSyncNoticeText } from "@/components/saved-dates/use-saved-plan-sync";
import { PartnerLink } from "@/components/trips/partner-link";
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
/** How long a note about the saved date ("Sam changed this date") stays up. */
const NOTICE_MS = 5000;

/**
 * A date, written down. Their own plan is edited here and kept in this browser; a plan that came
 * in a link is read out of the part after the `#`, which browsers keep to themselves, so the
 * evening somebody planned never touches a server, ours included, unless they save it to their
 * account: then the plan is linked to that saved date and every change goes back to it
 * (components/saved-dates). `#s=<id>` opens a saved date here.
 *
 * `monthly` and `currency` are for the Ethos for Two sheet: this page is static, so the server's
 * switch comes in as a prop, read when the page was built.
 */
export function PlanView({ monthly = false, currency = "eur" }: { monthly?: boolean; currency?: Currency }) {
  const t = useTranslations("plan");
  const ts = useTranslations("savedDates");
  const tc = useTranslations("common");
  const ta = useTranslations("affiliate");
  const locale = useLocale() === "es" ? "es" : "en";
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [own, updateOwn] = usePlan();
  // Kept with the place it is for: when the first stop moves to another town, the last town's
  // weather is not shown while (or if never) the new one comes.
  const [forecastFor, setForecastFor] = useState<{ at: string; forecast: Forecast } | null>(null);
  const [copied, setCopied] = useState(false);
  const [chooser, setChooser] = useState(false);
  // Which link was kept, not just "kept": another link opened in this tab later is a new plan to keep.
  const [keptHash, setKeptHash] = useState<string | null>(null);
  // The sheets keep what they said while they close, so the words don't change on the way out.
  const [upsell, setUpsell] = useState<{ open: boolean; reason: UpsellReason }>({ open: false, reason: "limit" });
  const [signIn, setSignIn] = useState<{ open: boolean; next: string; title: string; sub: string }>({ open: false, next: "/plan", title: "", sub: "" });
  const [notice, setNotice] = useState<{ text: string; at: number } | null>(null);

  const noticeText = useSyncNoticeText();
  const onNotice = useCallback((n: SyncNotice) => setNotice({ text: noticeText(n), at: Date.now() }), [noticeText]);
  const account = useSavedAccount();
  const { link: savedLink, status } = useSavedPlanSync(onNotice);
  const opened = useOpenSavedDate(hash, { confirmReplace: () => window.confirm(ts("open.replaceConfirm")), replacePlan: (next) => updateOwn(() => next) });

  const shared = useMemo(() => (hash.startsWith("#p=") ? decodePlan(hash.slice(3)) : null), [hash]);
  const readOnly = opened.state === "readOnly" ? opened.saved : null;
  const readOnlyPlan = useMemo(() => (readOnly ? readPlan(readOnly.data) : null), [readOnly]);
  const kept = keptHash === hash;
  const broken = hash.startsWith("#p=") && !shared;
  const plan: Plan = readOnlyPlan ?? shared ?? own;
  const editable = !shared && !readOnlyPlan;
  const first = plan.stops[0];
  const at = first ? `${round(first.lat, 2)},${round(first.lng, 2)}` : "";
  const member = Boolean(account.list?.member);

  useEffect(() => {
    if (!at || !plan.date) return;
    const [lat, lng] = at.split(",");
    const controller = new AbortController();
    fetch(`/api/dates/weather?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Forecast>) : null))
      .then((json) => json?.days && setForecastFor({ at, forecast: json }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [at, plan.date]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useSignedInWhile(signIn.open, () => setSignIn((s) => ({ ...s, open: false })));

  const forecast = forecastFor?.at === at ? forecastFor.forecast : null;
  const day = forecast?.days.find((d) => d.date === plan.date);
  const idea = ideaById(plan.idea);
  const past = Boolean(plan.date && plan.date < toYmd(new Date()));
  const route = useMemo(() => plan.stops.map((s) => ({ lat: s.lat, lng: s.lng, name: stopName(s, locale) })), [plan.stops, locale]);
  const ticketed = plan.stops.some((s) => sellsTickets(s));
  // The canvas and the credits' (i) are named by MapLibre in English unless told otherwise.
  const mapLabels = useMemo(() => ({ zoomToSee: "", nearMe: "", loading: t("mapLoading"), unavailable: t("mapUnavailable"), map: t("mapLabel"), zoomIn: "", zoomOut: "", credits: t("mapCredits"), retry: t("mapRetry") }), [t]);

  const sitePath = () => `${getPathname({ href: "/plan", locale })}#p=${encodePlan(plan)}`;
  const link = () => `${window.location.origin}${sitePath()}`;

  // The stops' photographs are asked for as the chooser opens, so they are usually in by the time a gift is picked.
  const photos = useRef<Promise<Record<string, string | null>> | null>(null);
  const openChooser = () => {
    photos.current = gatherPhotos(plan.stops.filter((s) => s.named !== false).map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })));
    setChooser(true);
  };
  const wrapPlan = async () => planUnwrap(plan, locale, { photos: (await photos.current) ?? {}, link: sitePath(), title: idea?.title[locale] });
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
  const openUpsell = (reason: UpsellReason) => setUpsell({ open: true, reason });
  const askToSignIn = (next: string, title: string, sub: string) => setSignIn({ open: true, next, title, sub });
  const signInToSave = () => {
    rememberSaveAfterSignIn("plan");
    askToSignIn("/plan", ts("save.signIn.title"), ts("save.signIn.sub"));
  };

  const sheets = (
    <>
      <SavedDatesUpsell open={upsell.open} onOpenChange={(open) => setUpsell((u) => ({ ...u, open }))} reason={upsell.reason} monthly={monthly} currency={currency} />
      <SignInDialog open={signIn.open} onOpenChange={(open) => setSignIn((s) => ({ ...s, open }))} next={signIn.next} title={signIn.title} sub={signIn.sub} />
    </>
  );

  if (!isClient || opened.state === "opening")
    return (
      <div className="container-narrow py-16" aria-busy="true">
        {opened.state === "opening" ? <p className="mb-4 text-center text-[15px] text-forest/65">{ts("open.loading")}</p> : null}
        <div aria-hidden="true" className="h-[520px] animate-pulse rounded-[32px] bg-white/70" />
      </div>
    );

  if (opened.state === "notFound" || opened.state === "failed" || opened.state === "signIn") {
    const savedId = opened.state === "signIn" ? opened.id : null;
    return (
      <section className="container-narrow py-16 text-center sm:py-24">
        <Cutout id="envelope-ps" className="mx-auto w-24 -rotate-6 drop-shadow-[0_14px_24px_rgba(120,50,70,0.25)]" />
        <h1 className="mt-6 display-lg text-balance text-forest">{opened.state === "signIn" ? ts("open.signIn") : opened.state === "notFound" ? ts("open.notFound") : ts("open.failed")}</h1>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {savedId ? (
            <button type="button" onClick={() => askToSignIn(`/plan#s=${savedId}`, ts("open.signIn"), ts("open.signInSub"))} className="inline-flex h-13 items-center gap-2 rounded-full bg-forest px-7 text-base font-semibold text-cream shadow-[0_16px_36px_-16px_rgba(42,15,31,0.7)] transition-transform hover:-translate-y-0.5">
              <LogIn aria-hidden="true" className="size-4" />
              {tc("login")}
            </button>
          ) : (
            <Link href="/my-dates" className="inline-flex h-13 items-center gap-2 rounded-full bg-forest px-7 text-base font-semibold text-cream shadow-[0_16px_36px_-16px_rgba(42,15,31,0.7)] transition-transform hover:-translate-y-0.5">
              {ts("save.open")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
        {sheets}
      </section>
    );
  }

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
        {readOnly ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-forest/[0.04] px-4 py-3 ring-1 ring-forest/10" data-testid="saved-read-only">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-forest/60" />
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-forest/75">
              <span className="font-semibold text-forest">{ts("readOnly.title")}</span> · {ts("readOnly.body", { limit: FREE_SAVED_DATES })}{" "}
              <button type="button" onClick={() => openUpsell("read_only")} className="-my-2 inline-flex min-h-11 items-center font-semibold text-rose-deep underline underline-offset-4">
                {ts("readOnly.why")}
              </button>
            </p>
          </div>
        ) : null}
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
        {past ? <p className="mt-4 text-[14px] text-forest/65">{t("past")}</p> : null}

        <ol className="mt-8">
          {plan.stops.map((stop, i) => {
            const group = GROUPS[KINDS[stop.kind].group];
            const name = stopName(stop, locale);
            const previous = plan.stops[i - 1];
            const apart = previous ? distanceKm(previous, stop) : null;
            return (
              <li key={stop.id} className="relative pb-7 pl-[58px] last:pb-0">
                {i < plan.stops.length - 1 ? <span aria-hidden="true" className="absolute top-11 bottom-0 left-[21px] border-l-2 border-dotted border-rose/40" /> : null}
                <span className="absolute top-0 left-0 grid size-11 place-items-center rounded-full bg-rose text-[15px] font-bold text-white shadow-[0_8px_16px_-8px_rgba(176,36,90,0.8)]">{i + 1}</span>
                {/* Past a walk, the distance: an old plan with a stop in another city once read "24756 min walk". */}
                {apart !== null ? <p className="-mt-2 mb-2 text-[11.5px] font-medium tracking-wide text-forest/65 uppercase">{apart <= WALK_KM ? t("walk", { minutes: walkingMinutes(apart) }) : formatDistance(apart, locale)}</p> : null}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold" style={{ color: group.ink }}>
                  {editable ? (
                    // 16px: iPhone Safari zooms the whole page into any smaller field it focuses.
                    <input type="time" aria-label={t("timeFor", { name })} value={stop.time ?? ""} onChange={(e) => updateOwn((p) => ({ ...p, stops: p.stops.map((s) => (s.id === stop.id ? { ...s, time: e.target.value || undefined } : s)) }))} className="h-11 rounded-xl border border-forest/15 bg-white px-2 text-[16px] text-forest tabular-nums outline-none focus:border-rose/50" />
                  ) : stop.time ? (
                    <span className="text-[15px] text-forest tabular-nums">{stop.time}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <GroupIcon group={KINDS[stop.kind].group} className="size-4" />
                    {/* A place with no name is called by its kind in the heading below: not twice. */}
                    {stop.named === false ? null : KINDS[stop.kind].label[locale]}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-[23px] leading-tight text-forest">{name}</h2>
                {stop.address ? <p className="text-[14px] text-forest/60">{stop.address}</p> : null}
                {editable ? (
                  <input value={stop.note ?? ""} maxLength={140} aria-label={t("noteFor", { name })} placeholder={t("stopNotePlaceholder")} onChange={(e) => updateOwn((p) => ({ ...p, stops: p.stops.map((s) => (s.id === stop.id ? { ...s, note: e.target.value || undefined } : s)) }))} className="mt-2 h-11 w-full rounded-xl border border-dashed border-forest/20 bg-transparent px-3 text-[16px] text-ellipsis text-forest outline-none placeholder:text-forest/45 focus:border-rose/50" />
                ) : stop.note ? (
                  <p className="mt-1.5 font-hand text-[1.45rem] leading-snug text-forest/80">{stop.note}</p>
                ) : null}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full border border-forest/15 px-3.5 text-[12.5px] font-semibold text-forest hover:bg-forest/5">
                    <Navigation aria-hidden="true" className="size-3.5" />
                    {t("directions")}
                  </a>
                  {sellsTickets(stop) ? (
                    <PartnerLink partner="tiqets" placement="plan" href={tiqetsSearch(ticketQuery(name, plan.where), locale)} aria-label={ta("tickets.label", { name })} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-forest/15 px-3.5 text-[12.5px] font-semibold text-forest hover:bg-forest/5">
                      <Ticket aria-hidden="true" className="size-3.5" />
                      {ta("tickets.button")}
                    </PartnerLink>
                  ) : null}
                  {editable ? (
                    // One group, so on a narrow phone the three wrap together instead of leaving the bin alone on a line.
                    <div className="flex gap-1.5">
                      <button type="button" disabled={i === 0} aria-label={t("moveUp", { name })} onClick={() => updateOwn((p) => moveStop(p, stop.id, -1))} className="grid size-11 place-items-center rounded-full border border-forest/15 text-forest hover:bg-forest/5 disabled:opacity-25">
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" disabled={i === plan.stops.length - 1} aria-label={t("moveDown", { name })} onClick={() => updateOwn((p) => moveStop(p, stop.id, 1))} className="grid size-11 place-items-center rounded-full border border-forest/15 text-forest hover:bg-forest/5 disabled:opacity-25">
                        <ArrowDown className="size-4" />
                      </button>
                      <button type="button" aria-label={t("removeStop", { name })} onClick={() => updateOwn((p) => removeStop(p, stop.id))} className="grid size-11 place-items-center rounded-full border border-forest/15 text-destructive hover:bg-destructive/5">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {ticketed ? (
          <p className="mt-4 text-[12px] leading-snug text-forest/60">
            {ta("tickets.via")} {ta("disclosure")}
          </p>
        ) : null}

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
        <MapsMenu stops={plan.stops} member={member} onLocked={() => openUpsell("maps")} />

        {editable ? <SavePlanPanel plan={own} defaultTitle={(idea?.title[locale] || own.where || ts("save.defaultTitle")).slice(0, 80)} link={savedLink} status={status} account={account} onUpsell={openUpsell} onSignIn={signInToSave} /> : null}

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
            <p className="mt-3 text-[12px] leading-snug text-forest/65">{t("send.private")}</p>
          </div>
        ) : readOnly ? (
          <div className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
            <p className="flex items-center gap-2 font-display text-[22px] text-forest">
              <Lock aria-hidden="true" className="size-5 text-forest/55" />
              {ts("readOnly.title")}
            </p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/65">{ts("readOnly.body", { limit: FREE_SAVED_DATES })}</p>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => openUpsell("read_only")} className="btn-star inline-flex h-12 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold">
                {ts("upsell.cta")}
              </button>
              <Link href="/my-dates" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-forest/15 text-[14.5px] font-semibold text-forest hover:bg-forest/5">
                {ts("upsell.manage")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
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
                  // Their own plan in progress is the one thing on this page that cannot be got
                  // back: ask before a link from somebody else writes over it, as "Clear" does.
                  const other = own.stops.length > 0 && encodePlan(own) !== encodePlan(plan);
                  if (other && !window.confirm(t("received.replaceConfirm"))) return;
                  // Kept, it is a new plan of theirs, not the saved date they had open: that one stays as it was, in My dates.
                  writeLink(null);
                  updateOwn(() => ({ ...EMPTY_PLAN, ...plan }));
                  setKeptHash(hash);
                  // Kept, it is theirs: drop the link's copy from the address, so the page shows
                  // it as their own to edit, and a reload does not offer to keep it again.
                  // replaceState fires no hashchange, so the page is told by hand.
                  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
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

        {/* Any gift they like, with the plan wrapped inside it at the end (components/gifts/template-chooser). */}
        <button
          type="button"
          onClick={openChooser}
          data-testid="plan-gift"
          aria-haspopup="dialog"
          className="group flex w-full items-center gap-4 rounded-[28px] bg-forest p-5 text-left text-cream shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Gift aria-hidden="true" className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[20px] leading-tight">{t("gift.title")}</span>
            <span className="mt-1 block text-[13.5px] leading-snug text-cream/70">{t("gift.sub")}</span>
          </span>
          <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
        <TemplateChooser open={chooser} onOpenChange={setChooser} kind="date" build={wrapPlan} />

        {editable ? (
          <div className="flex items-center justify-between gap-3 px-1">
            <Link href="/dates" className="-my-2.5 inline-flex min-h-11 items-center py-2.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
              {t("addMore")}
            </Link>
            {/* Linked, the plan is a saved date: closing it leaves it in My dates and starts afresh here. */}
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(savedLink ? ts("save.closeConfirm") : t("clearConfirm"))) return;
                writeLink(null);
                updateOwn(() => EMPTY_PLAN);
              }}
              className="-my-2.5 inline-flex min-h-11 items-center py-2.5 text-[13.5px] text-forest/65 underline-offset-4 hover:text-destructive hover:underline"
            >
              {savedLink ? ts("save.close") : t("clear")}
            </button>
          </div>
        ) : null}
      </aside>

      {/* What the saved date had to say ("Sam changed this date"), over the page, where a thumb isn't. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex justify-center px-4">
        {notice ? (
          <p key={notice.at} className="max-w-md animate-in rounded-2xl bg-forest px-4 py-2.5 text-center text-[13.5px] leading-snug font-semibold text-cream shadow-lift duration-300 fade-in-0 slide-in-from-bottom-2">
            {notice.text}
          </p>
        ) : null}
      </div>
      {sheets}
    </section>
  );
}
