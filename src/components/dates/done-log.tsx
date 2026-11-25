"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { formatDay, type Ymd } from "@/lib/dates/calendar";
import { doneCount, GIFT_FROM, timelineLabels, TIMELINE_SLUG, type DoneDate } from "@/lib/dates/done";
import { voteTargets, type Vote } from "@/lib/dates/votes";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import { cn } from "@/lib/utils";
import type { Votes } from "./use-done";

/** How many rows the card shows before "Show all". */
const SHOWN = 5;

/** Yes / No as two small pills: the chosen one filled. Shared by the plan's question and the log's rows. */
export function VotePills({ value, onVote, labels, className }: { value: Vote | undefined; onVote: (next: Vote) => void; labels: { yes: string; no: string }; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1.5", className)}>
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
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

/**
 * The dates you have done, as a short log on /plan: one honest count over them, five rows (the rest
 * folded), each a day, a title, a town and the vote in words, and from three done dates one quiet
 * line that hands over to the timeline gift. Text only: no picture, no map, nothing to keep.
 */
export function DoneLog({ entries, today, votes, onRemove, className }: { entries: DoneDate[]; today: Ymd; votes: Votes; onRemove: (id: string) => void; className?: string }) {
  const t = useTranslations("plan");
  const locale = useLocale() === "es" ? "es" : "en";
  const count = doneCount(entries, today);
  const row = (entry: DoneDate) => {
    const targets = voteTargets({ places: entry.places, idea: entry.idea });
    const vote = targets[0] ? votes.kept[targets[0]] : undefined;
    return (
      <li key={entry.id} className="flex items-start gap-3 border-t border-forest/10 py-3 first:border-t-0">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-forest/65 tabular-nums">
            {formatDay(entry.day, locale, "short")}
            {entry.where ? ` · ${entry.where}` : ""}
          </p>
          <p className="mt-0.5 text-[15px] leading-snug font-semibold text-forest">{entry.title}</p>
          {vote ? <p className="mt-0.5 text-[13.5px] text-forest/70">{vote === "yes" ? t("log.good") : t("log.notGood")}</p> : null}
          {targets.length > 0 && votes.available === true ? <VotePills className="mt-2" value={vote} onVote={(next) => void votes.cast(targets, next)} labels={{ yes: t("done.yes"), no: t("done.no") }} /> : null}
        </div>
        {/* Only this browser's own entries can be taken off: an account's come back from its saved dates. */}
        {entry.id.startsWith("saved:") ? null : (
          <button type="button" aria-label={t("log.remove", { title: entry.title })} onClick={() => onRemove(entry.id)} className="grid size-11 shrink-0 place-items-center rounded-full text-forest/65 transition-colors hover:bg-forest/5 hover:text-destructive">
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <section aria-labelledby="done-log-title" data-testid="done-log" className={cn("rounded-[28px] bg-card p-5 shadow-soft ring-1 ring-forest/5", className)}>
      <h2 id="done-log-title" className="font-display text-[22px] text-forest">
        {t("log.title")}
      </h2>
      {count ? <p className="mt-1 text-[14.5px] text-forest/70">{count.kind === "weeks" ? t("log.weeks", { n: count.n }) : t("log.year", { n: count.n })}</p> : null}
      <ol className="mt-3">{entries.slice(0, SHOWN).map(row)}</ol>
      {entries.length > SHOWN ? (
        <details className="group">
          <summary className="-my-1 inline-flex min-h-11 cursor-pointer list-none items-center text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">{t("log.all", { count: entries.length })}</summary>
          <ol>{entries.slice(SHOWN).map(row)}</ol>
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
