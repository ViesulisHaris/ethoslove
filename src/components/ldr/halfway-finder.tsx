"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Link2, MoveHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { shareLink } from "@/lib/app/bridge";
import { halfwayBetween, halfwayCityName, isOwnTown } from "@/lib/ldr/halfway";
import { halfwayQuery, readHalfwayLink } from "@/lib/ldr/halfway-link";
import type { WaysData } from "@/lib/ldr/ways";
import { WhereBox, type Where } from "@/components/dates/where-box";
import { WaysOn } from "./ways-on";

/** The town boxes' field and its list on the card's raised paper, as on the long-distance card. */
const TOWN_BOX = "[&>div:first-child]:bg-page-ground [&>ul]:bg-page-raised";
const HEADING = "mt-2 font-display text-[2.5rem] leading-none text-page-ink";
const SUB = "mt-2 text-[0.9375rem] leading-relaxed text-page-body";

/**
 * Halfway between two towns, on a page of its own: two town boxes, the city in the middle (by the
 * great circle, lib/ldr/halfway.ts, the same as the long-distance room's), how far it is for each,
 * a link that carries the two towns and nothing else, and three ways on. It only ever knows a town
 * somebody typed: there is no "near me" here. Nothing is counted but a tap on a way on, and no town
 * is ever in an event.
 */
export function HalfwayFinder({ ways }: { ways: WaysData }) {
  const t = useTranslations("ldr.meet");
  const tt = useTranslations("ldr.tool");
  const tw = useTranslations("dates.where");
  const twy = useTranslations("ldr.ways");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const [a, setA] = useState<Where | null>(null);
  const [b, setB] = useState<Where | null>(null);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const labels = { label: "", placeholder: tw("placeholder"), nearMe: tw("nearMe"), searching: tw("searching"), nothing: tw("nothing"), failed: tw("failed") };

  // A link's towns, read a frame after mount so the server's page and the first paint agree. Nothing
  // is asked of anybody for them: the link has the name and the place.
  useEffect(() => {
    const linked = readHalfwayLink(new URLSearchParams(window.location.search));
    if (!linked) return;
    const frame = window.requestAnimationFrame(() => {
      setA(linked.a);
      setB(linked.b);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const result = useMemo(() => (a && b ? halfwayBetween(a, b) : null), [a, b]);
  const own = result ? isOwnTown(result) : false;
  const near = result?.near && !own ? result.near : null;
  const name = near ? halfwayCityName(near.city, locale) : "";
  const number = (n: number) => Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-GB");

  const pick = (set: (w: Where) => void) => (where: Where) => {
    setCopied(false);
    setManual(null);
    set(where);
  };

  const send = async () => {
    if (!a || !b) return;
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = halfwayQuery(a, b);
    if (await shareLink({ url: url.href, text: name ? tt("shareText", { city: name }) : tt("shareTextBare") })) return;
    try {
      await navigator.clipboard.writeText(url.href);
      setManual(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setManual(url.href);
    }
  };

  const label = <p className="text-page-label text-page-body">{t("halfway")}</p>;
  const answer = !result ? (
    <p className="text-[0.9375rem] text-page-body">{t("hint")}</p>
  ) : result.km < 1 ? (
    <p className="text-[0.9375rem] text-page-body">{tt("same")}</p>
  ) : near ? (
    <>
      {label}
      <p data-halfway-city className={HEADING}>
        {name}
      </p>
      <p className={SUB}>{near.km < 40 ? t("halfwayExact") : t("halfwayNear", { km: number(near.km) })}</p>
      <p data-halfway-each className="mt-1 text-[0.9375rem] font-medium text-page-ink">
        {tt("forYou", { km: number(near.kmFromA) })} · {tt("forThem", { km: number(near.kmFromB) })}
      </p>
    </>
  ) : own && result.near ? (
    <>
      {label}
      <p data-halfway-city className={HEADING}>
        {t("eachWay", { km: number(result.km / 2) })}
      </p>
      <p className={SUB}>{tt("noCity", { city: halfwayCityName(result.near.city, locale) })}</p>
    </>
  ) : result.unnamed ? (
    <>
      {label}
      <p data-halfway-city className={HEADING}>
        {t("eachWay", { km: number(result.km / 2) })}
      </p>
      <p className={SUB}>{t("eachWaySub")}</p>
    </>
  ) : (
    <>
      {label}
      <p data-halfway-city className={HEADING}>
        {t("nowhere")}
      </p>
      <p className={SUB}>
        {t("eachWay", { km: number(result.km / 2) })}. {t("nowhereSub")}
      </p>
    </>
  );

  return (
    <>
      <div data-halfway-tool className="rounded-[1.75rem] border border-page-line bg-page-raised p-5 shadow-page-card sm:p-7">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="mb-1.5 text-[0.875rem] font-medium text-page-body">{t("you")}</p>
            <WhereBox value={a} locale={locale} labels={{ ...labels, label: t("you") }} onPick={pick(setA)} className={TOWN_BOX} />
          </div>
          <MoveHorizontal aria-hidden="true" className="mx-auto mb-3.5 hidden size-5 text-page-accent sm:block" />
          <div>
            <p className="mb-1.5 text-[0.875rem] font-medium text-page-body">{t("them")}</p>
            <WhereBox value={b} locale={locale} labels={{ ...labels, label: t("them") }} onPick={pick(setB)} className={TOWN_BOX} />
          </div>
        </div>
        <div data-halfway-result aria-live="polite" className="mt-6 min-h-[14.5rem] sm:min-h-[11.5rem]">
          {answer}
          {result && result.km >= 1 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-halfway-share
                onClick={() => void send()}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-page-ink/25 px-5 text-[0.9375rem] font-medium text-page-ink transition-[border-color,scale] hover:border-page-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink active:scale-[0.98] motion-reduce:transition-none"
              >
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
                {copied ? tt("copied") : tt("share")}
              </button>
              {manual ? <input readOnly value={manual} aria-label={tt("manual")} onFocus={(e) => e.currentTarget.select()} className="h-11 basis-full rounded-xl border border-page-line bg-page-ground px-3 text-sm text-page-ink" /> : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-8 text-page-label text-page-body">{twy("label")}</p>
      <WaysOn className="mt-3" a={a} b={b} halfway={result} data={ways} ways={["gift", "dates", "trip"]} from="halfway_tool" rowId="halfway-ways-row" />
    </>
  );
}
