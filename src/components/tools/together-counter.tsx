"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { breakdown, compareDays, daysBetween, formatDay, localDay, parseDay, timeline, type Day, type Milestone } from "@/lib/together/dates";

/** Where this device remembers the date. Nothing leaves the browser. */
const KEY = "ethos.together.v1";

/**
 * The counter on /tools/how-long-have-we-been-together: the day you got together in; out come the
 * time since, to the second, and the milestones ahead and behind. The date comes from the link
 * (?since=YYYY-MM-DD, &count=korean), else from this device, else from the picker. Nothing on the
 * page depends on the date until it has mounted, so the server's HTML and the first render agree.
 */
export function TogetherCounter() {
  const t = useTranslations("together");
  const locale = useLocale();
  const [since, setSince] = useState("");
  const [firstDayIsOne, setFirstDayIsOne] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let saved: { since?: string; firstDayIsOne?: boolean } = {};
    try {
      saved = (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as typeof saved) ?? {};
    } catch {
      // Unreadable or blocked: start empty.
    }
    const linked = parseDay(params.get("since"));
    const start = linked ?? parseDay(saved.since);
    const tick = () => setNow(new Date());
    // One frame later, not during the effect itself: the first paint stays the server's.
    const first = window.requestAnimationFrame(() => {
      if (start) setSince(formatDay(start));
      setFirstDayIsOne(linked ? params.get("count") === "korean" : saved.firstDayIsOne === true);
      tick();
    });
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.cancelAnimationFrame(first);
      window.clearInterval(timer);
    };
  }, []);

  function remember(next: { since: string; firstDayIsOne: boolean }) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private browsing: the counter still works, it just won't be here next time.
    }
  }

  async function copyLink() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("since", since);
    if (firstDayIsOne) url.searchParams.set("count", "korean");
    try {
      await navigator.clipboard.writeText(url.href);
      setManualLink(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard (an in-app browser, a denied permission): show the link to copy by hand.
      setManualLink(url.href);
    }
  }

  const start = parseDay(since);
  const today = now ? localDay(now) : null;
  const number = new Intl.NumberFormat(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const showDay = (day: Day) => dateFormat.format(new Date(Date.UTC(day.y, day.m - 1, day.d)));
  const label = (x: Milestone) => (x.kind === "days" ? t("mDays", { count: x.count }) : x.kind === "months" ? t("mMonths", { count: x.count }) : t("mYears", { count: x.count }));

  let result: React.ReactNode = <p className="text-[15.5px] leading-relaxed text-forest/65">{t("empty")}</p>;
  if (start && today && now) {
    const days = daysBetween(start, today);
    if (days < 0) {
      result = <p className="text-lg leading-relaxed text-forest">{t("future", { count: -days })}</p>;
    } else {
      const { years, months, days: rest } = breakdown(start, today);
      const parts = [years ? t("years", { count: years }) : null, months ? t("months", { count: months }) : null, rest || (!years && !months) ? t("daysPart", { count: rest }) : null].filter((p): p is string => !!p);
      const phrase = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(parts);
      const seconds = Math.max(0, Math.floor((now.getTime() - new Date(start.y, start.m - 1, start.d).getTime()) / 1000));
      const { next, past, nextMonth } = timeline(start, today, firstDayIsOne);
      const ahead = [...next, ...(nextMonth ? [nextMonth] : [])].sort((a, b) => compareDays(a.on, b.on)).slice(0, 5);
      const when = (x: Milestone) => {
        const n = daysBetween(today, x.on);
        return n === 0 ? t("today") : n > 0 ? t("inDays", { count: n }) : t("ago", { count: -n });
      };
      result = (
        <>
          <div aria-live="polite">
            <p className="font-display text-[clamp(2.6rem,9vw,4.25rem)] leading-[0.95] text-forest tabular-nums">{firstDayIsOne ? t("dayN", { count: days + 1 }) : t("days", { count: days })}</p>
            <p className="mt-3 text-lg text-forest/80">{phrase}</p>
          </div>
          {/* Not tabular-nums: in Schibsted Grotesk that gives the thousands commas a whole digit's width ("23 , 995"). */}
          <p className="mt-2 text-[13.5px] text-forest/55">{t("live", { hours: number.format(Math.floor(seconds / 3600)), minutes: number.format(Math.floor(seconds / 60)), seconds: number.format(seconds) })}</p>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <MilestoneList title={t("next")} items={ahead} label={label} when={when} showDay={showDay} highlight />
            {past.length ? <MilestoneList title={t("past")} items={past} label={label} when={when} showDay={showDay} /> : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ahead[0] ? (
              <Link href="/templates/midnight-countdown" className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest/90">
                {t("gift", { date: showDay(ahead[0].on) })}
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
            <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/20 px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/5">
              {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
              {copied ? t("copied") : t("share")}
            </button>
          </div>
          {manualLink ? <input readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} aria-label={t("share")} className="mt-3 h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-forest" /> : null}
        </>
      );
    }
  }

  return (
    <div className="rounded-[28px] bg-white/85 p-5 shadow-soft ring-1 ring-forest/10 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <label className="flex-1">
          <span className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{t("dateLabel")}</span>
          <input
            type="date"
            value={since}
            min="1940-01-01"
            max={today ? formatDay(today) : undefined}
            onChange={(e) => {
              setSince(e.target.value);
              if (parseDay(e.target.value)) remember({ since: e.target.value, firstDayIsOne });
            }}
            className="mt-2 block h-12 w-full rounded-2xl border border-forest/15 bg-paper px-4 text-base text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-[14.5px] leading-snug text-forest/75 sm:max-w-[17rem]">
          <input
            type="checkbox"
            checked={firstDayIsOne}
            onChange={(e) => {
              setFirstDayIsOne(e.target.checked);
              if (parseDay(since)) remember({ since, firstDayIsOne: e.target.checked });
            }}
            className="size-5 shrink-0 accent-rose"
          />
          {t("firstDay")}
        </label>
      </div>
      <div className="mt-8 border-t border-forest/10 pt-8">{result}</div>
      <p className="mt-6 text-[12.5px] text-forest/45">{t("privacy")}</p>
    </div>
  );
}

function MilestoneList({ title, items, label, when, showDay, highlight = false }: { title: string; items: Milestone[]; label: (x: Milestone) => string; when: (x: Milestone) => string; showDay: (d: Day) => string; highlight?: boolean }) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{title}</h3>
      <ul className="mt-3 divide-y divide-forest/10">
        {items.map((x) => (
          <li key={`${x.kind}-${x.count}`} className="flex items-baseline justify-between gap-4 py-3">
            <span>
              <span className={`block font-display text-xl leading-tight ${highlight ? "text-forest" : "text-forest/70"}`}>{label(x)}</span>
              <span className="mt-0.5 block text-[13.5px] text-forest/55">{showDay(x.on)}</span>
            </span>
            <span className={`shrink-0 text-[13.5px] font-medium ${highlight ? "text-rose-deep" : "text-forest/45"}`}>{when(x)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
