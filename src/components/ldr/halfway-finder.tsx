"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Link2, MoveHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { shareLink } from "@/lib/app/bridge";
import { mapLink } from "@/lib/ldr/halfway";
import { halfwayQuery, type Town } from "@/lib/ldr/halfway-link";
import type { WaysData } from "@/lib/ldr/ways";
import { WhereBox, type Where } from "@/components/dates/where-box";
import { useHalfway } from "./use-halfway";
import { WaysOn } from "./ways-on";

/** The town boxes' field and its list on the card's raised paper, as on the long-distance card. */
const TOWN_BOX = "[&>div:first-child]:bg-page-ground [&>ul]:bg-page-raised";
const HEADING = "mt-2 font-display text-[2.5rem] leading-none text-page-ink";
const SUB = "mt-2 text-[0.9375rem] leading-relaxed text-page-body";
const QUIET =
  "inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink";

/**
 * Halfway between two towns, on a page of its own: two town boxes, the place in the middle (the
 * table's city when one is near enough, else the town nearest the middle from the map, both through
 * useHalfway, the same as the long-distance room's), how far it is for each, a link that carries
 * the two towns and nothing else, and three ways on. A link's towns come from the server, so a
 * shared link opens on its answer; the towns are written into the address once there is an answer,
 * so a reload keeps it. Distances are in miles where people read miles (`miles`, from the visitor's
 * country). Nothing is counted but a tap on a way on, and no town is ever in an event.
 */
export function HalfwayFinder({ ways, initial, broken, miles }: { ways: WaysData; initial: { a: Town; b: Town } | null; broken: boolean; miles: boolean }) {
  const t = useTranslations("ldr.meet");
  const tt = useTranslations("ldr.tool");
  const tw = useTranslations("dates.where");
  const twy = useTranslations("ldr.ways");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const [a, setA] = useState<Where | null>(initial?.a ?? null);
  const [b, setB] = useState<Where | null>(initial?.b ?? null);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const labels = { label: "", placeholder: tw("placeholder"), nearMe: tw("nearMe"), searching: tw("searching"), nothing: tw("nothing"), failed: tw("failed") };
  const { answer } = useHalfway(a, b, locale);

  // The two towns in the address once there is an answer: a reload, or Back from a way on, opens on it again.
  useEffect(() => {
    if (!a || !b) return;
    const url = new URL(window.location.href);
    const search = `?${halfwayQuery(a, b)}`;
    if (url.search === search) return;
    window.history.replaceState(window.history.state, "", `${url.pathname}${search}${url.hash}`);
  }, [a, b]);

  const distance = (km: number) => (miles ? t("mi", { n: Math.max(1, Math.round(km * 0.621371)) }) : t("km", { n: Math.max(1, Math.round(km)) }));
  const name = answer?.kind === "city" ? answer.name : "";

  const pick = (set: (w: Where) => void) => (where: Where) => {
    setCopied(false);
    setManual(null);
    setTouched(true);
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
  const each = answer && answer.kind !== "same" && answer.kind !== "city" ? t("eachWay", { distance: distance(answer.eachKm) }) : "";

  const answerView = !answer ? (
    <p className="text-[0.9375rem] text-page-body">{broken && !touched ? tt("broken") : t("hint")}</p>
  ) : answer.kind === "same" ? (
    <p className="text-[0.9375rem] text-page-body">{tt("same")}</p>
  ) : answer.kind === "city" ? (
    <>
      {label}
      <p data-halfway-city className={HEADING}>
        {name}
      </p>
      <p className={SUB}>
        {answer.offKm < 40
          ? answer.region
            ? tt("exactIn", { region: answer.region })
            : t("halfwayExact")
          : answer.region
            ? tt("offIn", { region: answer.region, distance: distance(answer.offKm) })
            : tt("off", { distance: distance(answer.offKm) })}
      </p>
      <p data-halfway-each className="mt-1 text-[0.9375rem] font-medium text-page-ink">
        {tt("forYou", { distance: distance(answer.kmFromA) })} · {tt("forThem", { distance: distance(answer.kmFromB) })}
      </p>
      {/* A name from OpenStreetMap carries its credit (the map data's licence asks for it). */}
      {answer.fromMap ? (
        <p className="text-[0.8125rem] text-page-body">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline decoration-page-line underline-offset-2 hover:decoration-page-ink">
            {tt("osm")}
          </a>
        </p>
      ) : null}
    </>
  ) : (
    <>
      {label}
      {/* Never "open water" unless the map found nothing there: land with no town near is said as such. */}
      <p data-halfway-city className={HEADING}>
        {answer.kind === "sea" ? t("sea") : answer.kind === "none" ? t("noTown") : each}
      </p>
      <p className={SUB} aria-busy={answer.kind === "pending" || undefined}>
        {answer.kind === "sea"
          ? `${each}. ${t("seaSub")}`
          : answer.kind === "none"
            ? `${each}. ${t("noTownSub")}`
            : answer.kind === "between"
              ? tt("close")
              : answer.kind === "unnamed"
                ? t("eachWaySub")
                : answer.kind === "pending"
                  ? t("finding")
                  : t("failed")}
      </p>
      {answer.kind === "none" || answer.kind === "sea" || answer.kind === "failed" ? (
        <a href={mapLink(answer.middle)} target="_blank" rel="noopener noreferrer" data-halfway-map className={QUIET}>
          {t("onMap")}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      ) : null}
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
        <div data-halfway-result data-answer={answer?.kind} aria-live="polite" className="mt-6 min-h-[14.5rem] sm:min-h-[11.5rem]">
          {answerView}
          {answer && answer.kind !== "same" ? (
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
              {manual ? (
                <label className="flex basis-full flex-col gap-1.5 text-[0.875rem] font-medium text-page-body">
                  {tt("manual")}
                  <input readOnly value={manual} onFocus={(e) => e.currentTarget.select()} className="h-11 rounded-xl border border-page-line bg-page-ground px-3 text-sm font-normal text-page-ink" />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-8 text-page-label text-page-body">{twy("label")}</p>
      <WaysOn className="mt-3" a={a} b={b} answer={answer} data={ways} ways={["gift", "dates", "trip"]} from="halfway_tool" rowId="halfway-ways-row" />
    </>
  );
}
