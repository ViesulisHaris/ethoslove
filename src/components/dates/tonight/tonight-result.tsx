/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ideaImage } from "@/lib/dates/art";
import { formatDay, type Ymd } from "@/lib/dates/calendar";
import { ideaHours } from "@/lib/dates/format";
import { canBeFree } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import type { Relaxed, TonightPick } from "@/lib/dates/tonight";
import { TONIGHT_BUTTON, type TonightWhen } from "./tonight-form";

type Props = {
  pick: TonightPick;
  stops: readonly { place: Place | null }[];
  times: readonly string[];
  /** What the day is like, for the relaxed line: true when the forecast for it is wet. */
  wet: boolean;
  /** The budget the plan was made with, when one was chosen (not the form's choice now). */
  asked?: 0 | 1 | 2 | 3;
  /** The day it was planned for, as it was asked ("tonight"), and its date: the gave-way lines name it. */
  when: TonightWhen;
  date: Ymd;
  /** Shown again after Back or a reload: it takes no focus and does not scroll the page. */
  restored?: boolean;
  /** The card is asking whether to replace the plan being made on this device. */
  confirming?: boolean;
  onReplace?: () => void;
  onKeep?: () => void;
  locale: "en" | "es";
  onOpen: () => void;
  onAnother: () => void;
  /** False when this is the only idea that can be done: "Another" is not drawn. */
  more: boolean;
};

const QUIET_BUTTON = "inline-flex min-h-11 min-w-11 items-center text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink active:text-page-accent";

/** The heaviest wish first: the mood, the budget, the length. */
const HEAVIEST: Relaxed[] = ["vibe", "budget", "length"];

/** One finished plan: the idea's picture and title, its stops with their times, its twist, and the two ways on. */
export function TonightResult({ pick, stops, times, wet, asked, when, date, restored, confirming, onReplace, onKeep, locale, onOpen, onAnother, more }: Props) {
  const t = useTranslations("dates");
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const askRef = useRef<HTMLParagraphElement>(null);
  const { idea } = pick;
  // Asked for free and given an idea that is free only if you bring your own: say so, and mark the stops that sell it.
  const bringOwn = asked === 0 && idea.budget > 0 && canBeFree(idea) && !pick.relaxed.includes("budget");

  // The question takes the place of the buttons: it is where a keyboard and a screen reader go next.
  useEffect(() => {
    if (confirming) askRef.current?.focus({ preventScroll: true });
  }, [confirming]);

  // A new plan, or "Another": the heading is where a screen reader and a keyboard pick up again, and
  // the card is brought on screen (on a phone it lands below the fold, under the button pressed). A
  // plan shown again after Back or a reload does neither: the page opens where it was.
  useEffect(() => {
    if (restored) return;
    headingRef.current?.focus({ preventScroll: true });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
    // Only a new idea moves the page; `restored` turning false comes with one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id]);

  // "tonight", "tomorrow", "this weekend" or "on Sat 28 Nov": the day the visitor asked about.
  const whenLabel = when === "day" ? t("tonight.when.day", { day: formatDay(date, locale, "short") }) : t(`tonight.when.${when}`);

  const said = HEAVIEST.filter((wish) => pick.relaxed.includes(wish))
    .slice(0, 2)
    .map((wish) => {
      if (wish === "budget") return t(wet ? "tonight.relaxed.budgetWet" : "tonight.relaxed.budget", { wanted: t(`tonight.wanted.${(asked ?? 0) as 0 | 1 | 2}`), cost: t(`tonight.costs.${idea.budget as 1 | 2 | 3}`), when: whenLabel });
      if (wish === "length") return t("tonight.relaxed.length", { hours: ideaHours(idea.minutes, locale) });
      return t("tonight.relaxed.vibe", { when: whenLabel });
    });

  return (
    <article ref={cardRef} data-pick data-tonight-result aria-labelledby={headingId} className="mt-5 overflow-hidden rounded-[1.25rem] border border-page-line bg-page-raised shadow-page-card sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]">
      <span className="relative block aspect-[16/9] sm:aspect-auto sm:h-full" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}>
        <img src={ideaImage(idea.id)} alt="" width={960} height={720} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      </span>
      <div className="p-5">
        {said.map((line) => (
          <p key={line} className="mb-2 text-[0.875rem] leading-snug text-page-body">
            {line}
          </p>
        ))}
        {bringOwn ? <p className="mb-2 text-[0.875rem] leading-snug text-page-body">{t("tonight.freeIf")}</p> : null}
        <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-display text-[1.375rem] leading-tight text-page-ink outline-none">
          {idea.title[locale]}
        </h3>
        <ol className="mt-3 grid gap-1.5">
          {stops.map(({ place }, i) =>
            place ? (
              <li key={place.id} className="flex gap-3 text-[0.9375rem] leading-snug text-page-ink">
                <span className="w-12 shrink-0 text-page-body tabular-nums">{times[i]}</span>
                <span className="min-w-0">
                  <span className="font-medium">{place.named ? place.name : KINDS[place.kind].label[locale]}</span>
                  {place.named ? <span className="text-page-body"> · {KINDS[place.kind].label[locale]}</span> : null}
                  {bringOwn && !KINDS[place.kind].free ? <span className="text-page-body"> · {t("tonight.optional")}</span> : null}
                </span>
              </li>
            ) : null,
          )}
        </ol>
        <p data-line className="mt-3 font-hand text-[1.3rem] leading-[1.15] text-page-ink">
          {idea.twist[locale]}
        </p>
        {confirming ? (
          <div className="mt-4">
            <p ref={askRef} tabIndex={-1} className="text-[0.9375rem] leading-snug text-page-ink outline-none">
              {t("tonight.replace")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button type="button" onClick={onReplace} className={TONIGHT_BUTTON}>
                {t("tonight.replaceYes")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
              <button type="button" onClick={onKeep} className={QUIET_BUTTON}>
                {t("tonight.replaceNo")}
              </button>
            </div>
          </div>
        ) : (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" onClick={onOpen} className={TONIGHT_BUTTON}>
            {t("tonight.open")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
          {more ? (
            <button type="button" onClick={onAnother} className={QUIET_BUTTON}>
              {t("tonight.another")}
            </button>
          ) : null}
        </div>
        )}
      </div>
    </article>
  );
}
