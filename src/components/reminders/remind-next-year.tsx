"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Cake, CalendarHeart, Check, Gem, Heart, Loader2, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { track } from "@/lib/analytics/track";
import {
  MAX_REMINDERS,
  REMINDER_NAME_MAX,
  REMINDER_OCCASIONS,
  countdownDay,
  formatMonthDay,
  reminderDateFor,
  reminderOccasionFor,
  type MonthDay,
  type Reminder,
  type ReminderOccasion,
} from "@/lib/lifecycle/reminders";
import { formatYmd, isValidSince, parseYmd, type MonthsaryView } from "@/lib/lifecycle/monthsaries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChoiceMenu } from "@/components/pickers/choice-menu";
import { MonthDayPicker } from "@/components/pickers/month-day-picker";

type Status = "idle" | "saving" | "saved" | "failed" | "tooMany";
/** The card's rows: this gift's occasion next year, then the other days to add. */
type RowId = "next" | "birthday" | "anniversary" | "valentines" | "monthly" | "someone";

const fieldClass = "h-11 w-full rounded-xl border border-border bg-paper px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
/** The pickers' fields, drawn as this form's name field is. */
const pickerClass = "rounded-xl border-border bg-paper hover:border-ink/30 md:text-base";
const OCCASION_ICONS: Record<ReminderOccasion, LucideIcon> = { birthday: Cake, anniversary: Gem, valentines: Heart, other: Sparkles };
const ROW_ICONS: Record<Exclude<RowId, "next">, LucideIcon> = { birthday: Cake, anniversary: Gem, valentines: Heart, monthly: CalendarHeart, someone: UserPlus };
const VALENTINES: MonthDay = { month: 2, day: 14 };
/** How far back "together since" goes in the year menu: monthsaries are for the first years. */
const SINCE_YEARS = 10;
/** A second tap this soon after a row opened or closed is the same tap, not a change of mind. */
const TOGGLE_MS = 400;

/**
 * "Want a nudge before the next one?", under a published gift: the share screen's one card. Its
 * first row is this gift's occasion next year, filled in from the gift (one tap saves it, the details
 * open only to change them). Then the other days a couple has, each added with its own tap: their
 * birthday, your anniversary, Valentine's Day, every month (the monthsary, with a check the day
 * before each one) and someone else (mum, a best friend). Nothing is ticked for them: a row is only
 * saved when it is tapped, and a day only the person knows (a birthday) is never guessed. A day the
 * account already has (from an earlier gift for the same person) shows as added.
 */
export function RemindNextYear({ data }: { data: GiftData }) {
  const t = useTranslations("lifecycle.remind");
  const locale = useLocale() === "es" ? "es" : "en";
  const partner = data.recipientName.trim().slice(0, REMINDER_NAME_MAX);
  const [initial] = useState(() => {
    const occasion = reminderOccasionFor(getManifest(data.templateSlug)?.occasions);
    return { occasion, ...reminderDateFor(occasion, data.countdown, new Date()) };
  });
  // The first row: this gift's occasion, next year, as it was before the card grew.
  const [name, setName] = useState(partner);
  const [occasion, setOccasion] = useState<ReminderOccasion>(initial.occasion);
  const [nextDate, setNextDate] = useState<MonthDay>({ month: initial.month, day: initial.day });
  // Without a name there is nothing to save yet, so the details start open.
  const [editing, setEditing] = useState(() => !partner);
  // The other rows' days, none until chosen.
  const [days, setDays] = useState<Partial<Record<"birthday" | "anniversary" | "someone", MonthDay>>>({});
  const [someone, setSomeone] = useState({ name: "", occasion: "birthday" as ReminderOccasion });
  const [since, setSince] = useState<{ date: MonthDay | null; year: number | null }>({ date: null, year: null });
  const [open, setOpen] = useState<RowId | null>(null);
  const [status, setStatus] = useState<Partial<Record<RowId, Status>>>({});
  // "Someone else" can be added more than once: the ones added so far.
  const [others, setOthers] = useState<{ name: string; occasion: ReminderOccasion; date: MonthDay }[]>([]);

  const thisYear = new Date().getFullYear();
  const shownName = name.trim() || data.recipientName;
  // Who the other rows are about: the gift's recipient, as the buyer may have corrected the name above.
  const who = name.trim().slice(0, REMINDER_NAME_MAX) || partner;
  // The monthly row's day, once saved here or found on the account.
  const [monthlyDay, setMonthlyDay] = useState<number | null>(null);
  // When a row last opened or closed, by the tap's own clock (Event.timeStamp).
  const lastToggle = useRef(Number.NEGATIVE_INFINITY);
  const toggle = (row: RowId, at: number) => {
    if (at - lastToggle.current < TOGGLE_MS) return;
    lastToggle.current = at;
    setOpen((current) => (current === row ? null : row));
  };

  // What the account already has for this person shows as added, so a second gift for them doesn't
  // ask again for days already on the list (saving one again would only find it). Read once; a row
  // tapped meanwhile keeps its own state.
  useEffect(() => {
    if (!partner) return;
    let live = true;
    const same = (a: string) => a.trim().toLowerCase() === partner.toLowerCase();
    const read = (url: string) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    void Promise.all([read("/api/reminders"), read("/api/monthsaries")]).then(([listed, monthly]) => {
      if (!live) return;
      const mine = ((listed?.reminders ?? []) as Reminder[]).filter((r) => same(r.recipientName));
      const found: Partial<Record<RowId, Status>> = {};
      const foundDays: Partial<Record<"birthday" | "anniversary", MonthDay>> = {};
      // The first row's occasion, on whatever day the account has it (a person has one birthday).
      const first = mine.find((r) => r.occasion === initial.occasion && (initial.occasion !== "other" || (r.month === initial.month && r.day === initial.day)));
      if (first) {
        found.next = "saved";
        setNextDate({ month: first.month, day: first.day });
      }
      for (const row of ["birthday", "anniversary", "valentines"] as const) {
        // That one is the first row's, not a row of its own.
        if (row === initial.occasion) continue;
        const hit = mine.find((r) => r.occasion === row);
        if (!hit) continue;
        found[row] = "saved";
        if (row !== "valentines") foundDays[row] = { month: hit.month, day: hit.day };
      }
      const together = ((monthly?.monthsaries ?? []) as MonthsaryView[]).find((m) => same(m.partnerName));
      const sinceDate = together ? parseYmd(together.since) : null;
      if (sinceDate) {
        found.monthly = "saved";
        setMonthlyDay(sinceDate.day);
      }
      setDays((d) => ({ ...foundDays, ...d }));
      setStatus((s) => ({ ...found, ...s }));
    });
    return () => {
      live = false;
    };
  }, [partner, initial]);
  const anySaved = Object.values(status).includes("saved") || others.length > 0;
  const setRow = (row: RowId, next: Status) => setStatus((s) => ({ ...s, [row]: next }));
  const busy = Object.values(status).includes("saving");

  /** POST /api/reminders. `forThisGift` only for the first row: this year's email is skipped there when the day is near. */
  const saveReminder = async (row: RowId, body: { recipientName: string; occasion: ReminderOccasion; date: MonthDay; forThisGift: boolean }): Promise<boolean> => {
    setRow(row, "saving");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientName: body.recipientName,
          occasion: body.occasion,
          month: body.date.month,
          day: body.date.day,
          locale,
          // The template is kept only to suggest a different one next time; someone else's days have nothing to do with it.
          ...(row === "someone" ? {} : { templateSlug: data.templateSlug }),
          // The countdown's day tells the server which occasion this gift is for, so that one is skipped.
          ...(body.forThisGift ? { giftDay: countdownDay(data.countdown) ?? undefined } : { forThisGift: false }),
        }),
      });
      if (res.status === 409) return setRow(row, "tooMany"), false;
      if (!res.ok) return setRow(row, "failed"), false;
      setRow(row, "saved");
      track("reminder_saved", { occasion: body.occasion, template: data.templateSlug, row });
      return true;
    } catch {
      setRow(row, "failed");
      return false;
    }
  };

  const saveNext = async () => {
    if (await saveReminder("next", { recipientName: name, occasion, date: nextDate, forThisGift: true })) setEditing(false);
  };
  const savePartnerDay = async (row: "birthday" | "anniversary" | "valentines") => {
    const date = row === "valentines" ? VALENTINES : days[row];
    if (!date) return;
    if (await saveReminder(row, { recipientName: who, occasion: row, date, forThisGift: false })) setOpen(null);
  };
  const saveSomeone = async () => {
    const date = days.someone;
    const who = someone.name.trim();
    if (!date || !who) return;
    if (await saveReminder("someone", { recipientName: who, occasion: someone.occasion, date, forThisGift: false })) {
      setOthers((list) => [...list, { name: who, occasion: someone.occasion, date }]);
      // Ready for the next one.
      setSomeone({ name: "", occasion: "birthday" });
      setDays((d) => ({ ...d, someone: undefined }));
      setOpen(null);
    }
  };

  const sinceYear = since.date ? (since.year ?? defaultSinceYear(since.date, new Date())) : null;
  const sinceDay = since.date && sinceYear !== null ? { year: sinceYear, ...since.date } : null;
  const sinceOk = isValidSince(sinceDay, new Date());
  const saveMonthly = async () => {
    if (!sinceDay || !sinceOk) return;
    setRow("monthly", "saving");
    try {
      const res = await fetch("/api/monthsaries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerName: who, since: formatYmd(sinceDay), locale }),
      });
      if (!res.ok) return setRow("monthly", "failed");
      setMonthlyDay(sinceDay.day);
      setRow("monthly", "saved");
      setOpen(null);
      track("reminder_saved", { occasion: "monthly", template: data.templateSlug, row: "monthly" });
    } catch {
      setRow("monthly", "failed");
    }
  };

  // The other rows: every partner day the first row isn't already, then the monthly one, then someone else.
  const partnerRows = (["birthday", "anniversary", "valentines"] as const).filter((row) => row !== occasion || status[row] === "saved");
  const rowLabel = (row: Exclude<RowId, "next" | "someone">) => (row === "monthly" ? t("rows.monthly") : nextLabel(t, row, who));

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5" data-testid="remind-card">
      <div className="flex items-start gap-3">
        <BellRing className="mt-1 size-5 shrink-0 text-coral" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-xl">{t("title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("blurb")}</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border border-t border-border">
        {/* This gift's occasion, next year. */}
        <li className="py-3" data-testid="remind-row-next">
          <Row
            icon={OCCASION_ICONS[occasion]}
            label={nextLabel(t, occasion, shownName)}
            sub={
              <>
                {formatMonthDay(nextDate, locale)} · {t("nextYear")}
                {status.next !== "saved" && (!editing || name.trim()) ? (
                  <button type="button" onClick={() => setEditing(!editing)} aria-expanded={editing} className="ml-1.5 inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink">
                    {editing ? t("done") : t("edit")}
                  </button>
                ) : null}
              </>
            }
            status={status.next}
            action={t("save")}
            actionLabel={t("addLabel", { what: nextLabel(t, occasion, shownName) })}
            onAction={saveNext}
            disabled={!name.trim() || busy}
          />
          {editing && status.next !== "saved" ? (
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                {t("name")}
                <input value={name} maxLength={REMINDER_NAME_MAX} onChange={(e) => (setName(e.target.value), setRow("next", "idle"))} className={fieldClass} autoComplete="off" />
              </label>
              {/* Not <label>s round the pickers: a label names the button it holds, and the name would lose the choice. Each field says both. */}
              <div className="grid gap-1.5 text-sm font-medium">
                <span aria-hidden="true">{t("occasion")}</span>
                <ChoiceMenu
                  look="field"
                  label={t("occasion")}
                  value={occasion}
                  choices={REMINDER_OCCASIONS.map((o) => ({ value: o, label: t(`occasions.${o}`), icon: OCCASION_ICONS[o] }))}
                  onChange={(next) => {
                    setOccasion(next);
                    if (next === "valentines") setNextDate(VALENTINES);
                    setRow("next", "idle");
                  }}
                  className={pickerClass}
                />
              </div>
              <div className="grid gap-1.5 text-sm font-medium">
                <span aria-hidden="true">{t("date")}</span>
                {/* The picker keeps the day inside the month (31 January → 29 February), as the two selects did. */}
                <MonthDayPicker label={t("date")} value={nextDate} locale={locale} onChange={(next) => (setNextDate(next), setRow("next", "idle"))} className={pickerClass} />
              </div>
            </div>
          ) : null}
          <RowProblem status={status.next} t={t} />
        </li>

        {partnerRows.map((row) => (
          <li key={row} className="py-3" data-testid={`remind-row-${row}`}>
            <Row
              icon={ROW_ICONS[row]}
              label={rowLabel(row)}
              sub={row === "valentines" ? formatMonthDay(VALENTINES, locale) : days[row] ? formatMonthDay(days[row], locale) : t("pickDay")}
              status={status[row]}
              action={t("add")}
              actionLabel={t("addLabel", { what: rowLabel(row) })}
              // Valentine's is the same day for everyone: one tap. A birthday or an anniversary asks for its day first.
              onAction={row === "valentines" ? () => savePartnerDay(row) : (at) => toggle(row, at)}
              disabled={busy || (row !== "valentines" && !who)}
              expanded={row === "valentines" ? undefined : open === row}
            />
            {open === row && row !== "valentines" && status[row] !== "saved" ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="grid min-w-0 flex-1 basis-48 gap-1.5 text-sm font-medium">
                  <span aria-hidden="true">{t("date")}</span>
                  <MonthDayPicker label={t("date")} value={days[row] ?? null} placeholder={t("pickDay")} locale={locale} onChange={(next) => (setDays((d) => ({ ...d, [row]: next })), setRow(row, "idle"))} className={pickerClass} />
                </div>
                <Button onClick={() => savePartnerDay(row)} disabled={!days[row] || busy} className="h-11 rounded-full px-5" data-testid={`remind-save-${row}`}>
                  {status[row] === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  <span>{t("saveDay")}</span>
                </Button>
              </div>
            ) : null}
            <RowProblem status={status[row]} t={t} />
          </li>
        ))}

        {/* Every month: the monthsary, asked about the day before each one. Never sent to the partner. */}
        {who ? (
          <li className="py-3" data-testid="remind-row-monthly">
            <Row
              icon={ROW_ICONS.monthly}
              label={rowLabel("monthly")}
              sub={status.monthly === "saved" && monthlyDay ? t("monthlySaved", { day: monthlyDay }) : t("monthlySub", { name: who })}
              status={status.monthly}
              action={t("add")}
              actionLabel={t("addLabel", { what: rowLabel("monthly") })}
              onAction={(at) => toggle("monthly", at)}
              disabled={busy}
              expanded={open === "monthly"}
            />
            {open === "monthly" && status.monthly !== "saved" ? (
              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                  <div className="grid min-w-0 gap-1.5 text-sm font-medium">
                    <span aria-hidden="true">{t("since")}</span>
                    <MonthDayPicker label={t("since")} value={since.date} placeholder={t("pickDay")} locale={locale} onChange={(date) => (setSince((s) => ({ ...s, date })), setRow("monthly", "idle"))} className={pickerClass} />
                  </div>
                  <div className="grid min-w-0 gap-1.5 text-sm font-medium">
                    <span aria-hidden="true">{t("year")}</span>
                    <ChoiceMenu
                      look="field"
                      label={t("year")}
                      value={String(sinceYear ?? thisYear)}
                      choices={Array.from({ length: SINCE_YEARS }, (_, i) => String(thisYear - i)).map((y) => ({ value: y, label: y }))}
                      onChange={(y) => (setSince((s) => ({ ...s, year: Number(y) })), setRow("monthly", "idle"))}
                      className={pickerClass}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("monthlyNote", { name: who })}</p>
                {since.date && !sinceOk ? (
                  <p className="text-sm text-destructive" role="alert">
                    {t("sinceFuture")}
                  </p>
                ) : null}
                <Button onClick={saveMonthly} disabled={!sinceOk || busy} className="h-11 w-full rounded-full sm:w-auto sm:px-6" data-testid="remind-save-monthly">
                  {status.monthly === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  <span>{t("monthlySave")}</span>
                </Button>
              </div>
            ) : null}
            <RowProblem status={status.monthly} t={t} />
          </li>
        ) : null}

        {/* Someone else: mum, a best friend. As many as they like, one at a time. */}
        <li className="py-3" data-testid="remind-row-someone">
          {others.length > 0 ? (
            <ul className="mb-2 grid gap-1 text-sm" aria-label={t("othersLabel")}>
              {others.map((o, i) => (
                <li key={`${o.name}-${i}`} className="flex items-center gap-1.5 text-moss">
                  <Check className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">
                    {o.name} · {t(`occasions.${o.occasion}`)} · {formatMonthDay(o.date, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Row
            icon={ROW_ICONS.someone}
            label={others.length > 0 ? t("rows.someoneMore") : t("rows.someone")}
            sub={t("someoneSub")}
            status={status.someone === "saved" ? undefined : status.someone}
            action={t("add")}
            actionLabel={t("addLabel", { what: t("rows.someone") })}
            onAction={(at) => toggle("someone", at)}
            disabled={busy}
            expanded={open === "someone"}
          />
          {open === "someone" ? (
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                {t("name")}
                <input value={someone.name} maxLength={REMINDER_NAME_MAX} placeholder={t("someonePlaceholder")} onChange={(e) => (setSomeone((s) => ({ ...s, name: e.target.value })), setRow("someone", "idle"))} className={fieldClass} autoComplete="off" />
              </label>
              <div className="grid gap-1.5 text-sm font-medium">
                <span aria-hidden="true">{t("occasion")}</span>
                <ChoiceMenu
                  look="field"
                  label={t("occasion")}
                  value={someone.occasion}
                  choices={REMINDER_OCCASIONS.filter((o) => o !== "valentines").map((o) => ({ value: o, label: t(`occasions.${o}`), icon: OCCASION_ICONS[o] }))}
                  onChange={(next) => (setSomeone((s) => ({ ...s, occasion: next })), setRow("someone", "idle"))}
                  className={pickerClass}
                />
              </div>
              <div className="grid gap-1.5 text-sm font-medium">
                <span aria-hidden="true">{t("date")}</span>
                <MonthDayPicker label={t("date")} value={days.someone ?? null} placeholder={t("pickDay")} locale={locale} onChange={(next) => (setDays((d) => ({ ...d, someone: next })), setRow("someone", "idle"))} className={pickerClass} />
              </div>
              <Button onClick={saveSomeone} disabled={!someone.name.trim() || !days.someone || busy} className="h-11 w-full rounded-full sm:w-auto sm:px-6" data-testid="remind-save-someone">
                {status.someone === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                <span>{t("saveDay")}</span>
              </Button>
            </div>
          ) : null}
          <RowProblem status={status.someone} t={t} />
        </li>
      </ul>

      {anySaved ? (
        <p className="mt-2 text-sm" role="status">
          <Link href="/account/reminders" className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4 hover:text-ink">
            {t("manage")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** The card's translator, as the helpers below take it. */
type T = (key: string, values?: Record<string, string | number>) => string;

/** "Ana's birthday", "Your anniversary", "Valentine's Day", "A day for Ana": what a row is about. */
function nextLabel(t: T, occasion: ReminderOccasion, name: string): string {
  if (occasion === "valentines") return t("occasions.valentines");
  if (occasion === "anniversary") return t("rows.anniversary");
  return name ? t(`rows.${occasion}`, { name }) : t(`rows.${occasion}NoName`);
}

/** "Together since" a day with no year yet: this year if it has come, else last year. */
function defaultSinceYear(date: MonthDay, today: Date): number {
  const year = today.getFullYear();
  const passed = date.month < today.getMonth() + 1 || (date.month === today.getMonth() + 1 && date.day <= today.getDate());
  return passed ? year : year - 1;
}

/** One line of the card: what it is, its day, and its one button (or that it's saved). */
function Row({
  icon: Icon,
  label,
  sub,
  status,
  action,
  actionLabel,
  onAction,
  disabled,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  sub: React.ReactNode;
  status: Status | undefined;
  action: string;
  actionLabel: string;
  /** Given the tap's timestamp, so a double tap can be told from two. */
  onAction: (at: number) => void;
  disabled: boolean;
  /** For a row whose button opens its form below. */
  expanded?: boolean;
}) {
  const t = useTranslations("lifecycle.remind");
  const saved = status === "saved";
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("size-[18px] shrink-0", saved ? "text-moss" : "text-rose-deep")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium [overflow-wrap:anywhere]">{label}</p>
        <p className="flex flex-wrap items-center text-sm text-muted-foreground">{sub}</p>
      </div>
      {saved ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-moss" role="status">
          <Check className="size-4" aria-hidden />
          <span>{t("added")}</span>
        </span>
      ) : (
        <Button variant="outline" onClick={(e) => onAction(e.timeStamp)} disabled={disabled} aria-label={expanded ? undefined : actionLabel} aria-expanded={expanded} className="h-11 shrink-0 rounded-full px-4">
          {status === "saving" && expanded === undefined ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          <span>{expanded ? t("cancel") : action}</span>
        </Button>
      )}
    </div>
  );
}

function RowProblem({ status, t }: { status: Status | undefined; t: T }) {
  if (status !== "failed" && status !== "tooMany") return null;
  return (
    <p className="mt-2 text-sm text-destructive" role="alert">
      {status === "tooMany" ? t("tooMany", { max: MAX_REMINDERS }) : t("failed")}
    </p>
  );
}
