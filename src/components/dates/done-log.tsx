"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Ymd } from "@/lib/dates/calendar";
import { doneCount, doneTargets, GIFT_FROM, logDay, timelineLabels, TIMELINE_SLUG, type DoneDate } from "@/lib/dates/done";
import type { Vote } from "@/lib/dates/votes";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import { cn } from "@/lib/utils";

/** How many rows the card shows before "Show all". */
const SHOWN = 5;

/**
 * Yes / No as two small pills: the chosen one filled. Shared by the plan's question and the log's
 * rows. A group named by its question (`label`, or the element `labelledBy` points at), so a screen
 * reader hears which date the Yes is about (dates2-C18).
 */
export function VotePills({ value, onVote, labels, label, labelledBy, focusKey, className }: { value: Vote | undefined; onVote: (next: Vote) => void; labels: { yes: string; no: string }; label?: string; labelledBy?: string; /** Marks the buttons so focus can be put back on them. */ focusKey?: string; className?: string }) {
  return (
    <span role="group" aria-label={label} aria-labelledby={labelledBy} className={cn("inline-flex gap-1.5", className)}>
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          data-focus={focusKey}
          onClick={() => onVote(v)}
          className={cn(
            "inline-flex h-11 min-w-11 items-center justify-center rounded-full px-4 text-[13.5px] font-semibold transition-colors active:scale-[0.98] motion-reduce:transition-none",
            value === v ? "bg-forest text-cream" : "border border-forest/15 text-forest hover:bg-forest/5",
          )}
        >
          {v === "yes" ? labels.yes : labels.no}
        </button>
      ))}
    </span>
  );
}

type Focus = { id: string; what: "change" | "pill" | "row" } | "heading";

/** Puts focus where a pressed control's work went on; the log's heading when that cannot take it (a row folded under "Show all"). */
function putFocus(root: HTMLElement, focus: Focus) {
  const sel = (v: string) => `"${CSS.escape(v)}"`;
  const el =
    focus === "heading"
      ? null
      : focus.what === "change"
        ? root.querySelector<HTMLElement>(`[data-focus-change=${sel(focus.id)}]`)
        : focus.what === "pill"
          ? (root.querySelector<HTMLElement>(`[data-focus=${sel(focus.id)}][aria-pressed="true"]`) ?? root.querySelector<HTMLElement>(`[data-focus=${sel(focus.id)}]`) ?? root.querySelector<HTMLElement>(`[data-focus-change=${sel(focus.id)}]`))
          : root.querySelector<HTMLElement>(`[data-focus-row=${sel(focus.id)}] button`);
  el?.focus();
  if (!el || document.activeElement !== el) root.querySelector<HTMLElement>("#done-log-title")?.focus();
}

/**
 * The dates you have done, as a short log on /plan: one honest count over them, five rows (the rest
 * folded), each a day, a title, a town and its own answer in words (dates2-D3), and from three done
 * dates one quiet line that hands over to the timeline gift. Text only: no picture, no map, nothing to keep.
 */
export function DoneLog({
  entries,
  today,
  available,
  onAnswer,
  onRemove,
  notSaved,
  askedAbove,
  className,
}: {
  entries: DoneDate[];
  today: Ymd;
  /** Whether the site takes votes: true, false, or null while unknown. */
  available: boolean | null;
  onAnswer: (entry: DoneDate, next: Vote) => void;
  onRemove: (id: string) => void;
  /** A tap that was not kept, by the date it was made on (dates2-D5). */
  notSaved?: { id: string; offline: boolean } | null;
  /** The entry of the plan open above, whose question is asked there: its row only says the answer. */
  askedAbove?: string;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale() === "es" ? "es" : "en";
  const count = doneCount(entries, today);
  // The rows whose answer is being changed: an answered row says it in words, and shows the pills again on "Change".
  const [changing, setChanging] = useState<ReadonlySet<string>>(new Set());
  // Where focus goes once the control pressed has gone (dates2-D4): a row's Change, its pressed pill, a row's first control, or the heading.
  const pending = useRef<Focus | null>(null);
  const section = useRef<HTMLElement>(null);
  const setFocus = (f: Focus) => {
    pending.current = f;
  };
  useEffect(() => {
    const f = pending.current;
    pending.current = null;
    if (f && section.current) putFocus(section.current, f);
  }, [entries, changing]);
  // A tap not kept puts the pills back: focus goes to them, where the line saying so is.
  useEffect(() => {
    // The plan's own question keeps its pills on screen, and focus with them.
    if (notSaved && notSaved.id !== askedAbove && section.current) putFocus(section.current, { id: notSaved.id, what: "pill" });
  }, [notSaved, askedAbove]);
  const row = (entry: DoneDate, i: number) => {
    const targets = doneTargets(entry);
    const vote = entry.vote;
    const votable = targets.length > 0 && available === true && entry.id !== askedAbove;
    const pills = votable && (!vote || changing.has(entry.id));
    const failed = notSaved && notSaved.id === entry.id && entry.id !== askedAbove;
    return (
      <li key={entry.id} data-focus-row={entry.id} className="flex items-start gap-3 border-t border-forest/10 py-3 first:border-t-0">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-forest/65">
            {logDay(entry.day, locale)}
            {entry.where ? ` · ${entry.where}` : ""}
          </p>
          <p className="mt-0.5 text-[15px] leading-snug font-semibold text-forest">{entry.title}</p>
          {vote && !pills ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13.5px] text-forest/70">
              {vote === "yes" ? t("log.good") : t("log.notGood")}
              {votable ? (
                <button
                  type="button"
                  data-focus-change={entry.id}
                  aria-label={t("log.changeFor", { title: entry.title })}
                  onClick={() => {
                    setChanging((s) => new Set(s).add(entry.id));
                    setFocus({ id: entry.id, what: "pill" });
                  }}
                  className="-my-3 inline-flex min-h-11 items-center px-1 font-semibold text-rose-deep underline-offset-4 hover:underline"
                >
                  {t("log.change")}
                </button>
              ) : null}
            </p>
          ) : null}
          {pills ? (
            <VotePills
              className="mt-2"
              label={`${t("done.ask")} ${entry.title}`}
              focusKey={entry.id}
              value={vote}
              onVote={(next) => {
                onAnswer(entry, next);
                setChanging((s) => {
                  const rest = new Set(s);
                  rest.delete(entry.id);
                  return rest;
                });
                setFocus({ id: entry.id, what: "change" });
              }}
              labels={{ yes: t("done.yes"), no: t("done.no") }}
            />
          ) : null}
          {/* Said where the tap was made, in a region a screen reader is already listening to. */}
          {votable ? (
            <p aria-live="polite" className={cn("text-[13px] text-forest/80", failed && "mt-1")}>
              {failed ? t(notSaved.offline ? "done.offline" : "done.notSaved") : null}
            </p>
          ) : null}
        </div>
        {/* Only this browser's own entries can be taken off: an account's come back from its saved dates. */}
        {entry.id.startsWith("saved:") ? null : (
          <button
            type="button"
            aria-label={t("log.remove", { title: entry.title })}
            onClick={() => {
              // The next row takes focus, else the one before, else the heading.
              const next = entries[i + 1] ?? entries[i - 1];
              setFocus(next ? { id: next.id, what: "row" } : "heading");
              onRemove(entry.id);
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full text-forest/65 transition-colors hover:bg-forest/5 hover:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <section ref={section} aria-labelledby="done-log-title" data-testid="done-log" className={cn("rounded-[28px] bg-card p-5 shadow-soft ring-1 ring-forest/5", className)}>
      <h2 id="done-log-title" tabIndex={-1} className="font-display text-[22px] text-forest outline-none">
        {t("log.title")}
      </h2>
      {count ? <p className="mt-1 text-[14.5px] text-forest/70">{count.kind === "weeks" ? t("log.weeks", { n: count.n }) : t("log.year", { n: count.n })}</p> : null}
      <ol className="mt-3">{entries.slice(0, SHOWN).map((e, i) => row(e, i))}</ol>
      {entries.length > SHOWN ? (
        <details className="group">
          <summary className="-my-1 inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">{t("log.all", { count: entries.length })}</summary>
          <ol>{entries.slice(SHOWN).map((e, i) => row(e, i + SHOWN))}</ol>
        </details>
      ) : null}
      {entries.length >= GIFT_FROM ? (
        <p className="mt-3 border-t border-forest/10 pt-3 text-[14px] leading-snug text-forest/70">
          {t("log.gift", { n: entries.length })}{" "}
          <Link
            href={`/create/${TIMELINE_SLUG}`}
            onClick={() => {
              saveGiftSeed({ slug: TIMELINE_SLUG, fields: { dates: timelineLabels(entries, locale) } });
              track("done_dates_gift");
            }}
            className="-my-2.5 inline-flex min-h-11 items-center py-2.5 font-semibold text-rose-deep underline-offset-4 hover:underline"
          >
            {t("log.giftCta")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
