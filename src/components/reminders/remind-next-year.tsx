"use client";

import { useState } from "react";
import { BellRing, Cake, Check, Gem, Heart, Loader2, Sparkles, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { track } from "@/lib/analytics/track";
import { MAX_REMINDERS, REMINDER_NAME_MAX, REMINDER_OCCASIONS, countdownDay, formatMonthDay, reminderDateFor, reminderOccasionFor, type MonthDay, type ReminderOccasion } from "@/lib/lifecycle/reminders";
import { Button } from "@/components/ui/button";
import { ChoiceMenu } from "@/components/pickers/choice-menu";
import { MonthDayPicker } from "@/components/pickers/month-day-picker";

type Status = "idle" | "saving" | "saved" | "failed" | "tooMany";

const fieldClass = "h-11 w-full rounded-xl border border-border bg-paper px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
/** The pickers' fields, drawn as this form's name field is. */
const pickerClass = "rounded-xl border-border bg-paper hover:border-ink/30 md:text-base";
const OCCASION_ICONS: Record<ReminderOccasion, LucideIcon> = { birthday: Cake, anniversary: Gem, valentines: Heart, other: Sparkles };

/**
 * "Remind me next year", under a published gift. It starts filled in from the gift (who it's for,
 * the template's occasion, the countdown's day or today), so one tap saves it; the details open
 * only for someone who wants to change them.
 */
export function RemindNextYear({ data }: { data: GiftData }) {
  const t = useTranslations("lifecycle.remind");
  const locale = useLocale() === "es" ? "es" : "en";
  const [initial] = useState(() => {
    const occasion = reminderOccasionFor(getManifest(data.templateSlug)?.occasions);
    return { occasion, ...reminderDateFor(occasion, data.countdown, new Date()) };
  });
  const [name, setName] = useState(data.recipientName.trim().slice(0, REMINDER_NAME_MAX));
  const [occasion, setOccasion] = useState<ReminderOccasion>(initial.occasion);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  // Without a name there is nothing to save yet, so the details start open.
  const [editing, setEditing] = useState(() => !data.recipientName.trim());
  const [status, setStatus] = useState<Status>("idle");

  const shownName = name.trim() || data.recipientName;
  const canSave = name.trim().length > 0 && status !== "saving";

  const changeOccasion = (next: ReminderOccasion) => {
    setOccasion(next);
    if (next === "valentines") {
      setMonth(2);
      setDay(14);
    }
    setStatus("idle");
  };
  // The picker keeps the day inside the month (31 January → 29 February), as the two selects did.
  const changeDate = (next: MonthDay) => {
    setMonth(next.month);
    setDay(next.day);
    setStatus("idle");
  };
  const changeName = (next: string) => {
    setName(next);
    setStatus("idle");
  };

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The countdown's day tells the server which occasion this gift is for, so that one is skipped.
        body: JSON.stringify({ recipientName: name, occasion, month, day, locale, templateSlug: data.templateSlug, giftDay: countdownDay(data.countdown) ?? undefined }),
      });
      if (res.status === 409) return setStatus("tooMany");
      if (!res.ok) return setStatus("failed");
      setStatus("saved");
      setEditing(false);
      track("reminder_saved", { occasion, template: data.templateSlug });
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <BellRing className="mt-1 size-5 shrink-0 text-coral" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-xl">{t("title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("blurb", { name: shownName })}</p>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">
            {t("name")}
            <input value={name} maxLength={REMINDER_NAME_MAX} onChange={(e) => changeName(e.target.value)} className={fieldClass} autoComplete="off" />
          </label>
          {/* Not <label>s round the pickers: a label names the button it holds, and the name would lose the choice. Each field says both. */}
          <div className="grid gap-1.5 text-sm font-medium">
            <span aria-hidden="true">{t("occasion")}</span>
            <ChoiceMenu
              look="field"
              label={t("occasion")}
              value={occasion}
              choices={REMINDER_OCCASIONS.map((o) => ({ value: o, label: t(`occasions.${o}`), icon: OCCASION_ICONS[o] }))}
              onChange={changeOccasion}
              className={pickerClass}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-medium">
            <span aria-hidden="true">{t("date")}</span>
            <MonthDayPicker label={t("date")} value={{ month, day }} locale={locale} onChange={changeDate} className={pickerClass} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm">
          <span className="font-medium">{t(`occasions.${occasion}`)}</span>
          <span className="text-muted-foreground"> · {formatMonthDay({ month, day }, locale)}</span>
          {status !== "saved" ? (
            <button type="button" onClick={() => setEditing(true)} className="ml-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-ink">
              {t("edit")}
            </button>
          ) : null}
        </p>
      )}

      {status === "saved" ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" role="status">
          <span className="inline-flex items-center gap-1.5 text-moss">
            <Check className="size-4" aria-hidden />
            {t("saved", { date: formatMonthDay({ month, day }, locale) })}
          </span>
          <Link href="/account/reminders" className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4 hover:text-ink">
            {t("manage")}
          </Link>
        </div>
      ) : (
        <>
          <Button onClick={save} disabled={!canSave} className="mt-4 h-11 w-full rounded-full sm:w-auto sm:px-6">
            {status === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <BellRing className="size-4" aria-hidden />}
            <span>{status === "saving" ? t("saving") : t("save")}</span>
          </Button>
          {status === "failed" || status === "tooMany" ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {status === "tooMany" ? t("tooMany", { max: MAX_REMINDERS }) : t("failed")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
