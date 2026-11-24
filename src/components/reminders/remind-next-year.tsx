"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Cake, CalendarHeart, Check, Gem, Heart, Loader2, Plus, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { track } from "@/lib/analytics/track";
import { useCurrency } from "@/lib/pricing/use-currency";
import {
  MAX_REMINDERS,
  REMINDER_NAME_MAX,
  REMINDER_OCCASIONS,
  countdownDay,
  firstEmailDate,
  formatMonthDay,
  initialLastSentYear,
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
/** The rows behind "Add another day": this gift's occasion next year, then the other days to add. */
type RowId = "next" | "birthday" | "anniversary" | "valentines" | "monthly" | "someone";
/** The card's two days, asked for on the card itself. */
type Field = "birthday" | "anniversary";
const FIELDS: readonly Field[] = ["birthday", "anniversary"];

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
 * "Never be late for their day.", under a published gift: the share screen's one question, two days
 * ("Mia's birthday", "Your anniversary") and one button. The day this gift tells (its template's
 * occasion, with the countdown's day or today) is filled in and marked as coming from the gift, and
 * can be changed; a day only the person knows is never guessed. Each saved day gets three e-mails a
 * year (lib/lifecycle/reminder-job.ts). "Add another day" opens the other rows as they always worked:
 * this gift's occasion when it is neither of the two, Valentine's Day, every month (the monthsary)
 * and someone else. A day the account already has for this person shows as saved.
 */
export function RemindNextYear({ data }: { data: GiftData }) {
  const t = useTranslations("lifecycle.remind");
  const locale = useLocale() === "es" ? "es" : "en";
  const currency = useCurrency();
  const partner = data.recipientName.trim().slice(0, REMINDER_NAME_MAX);
  const [initial] = useState(() => {
    const occasion = reminderOccasionFor(getManifest(data.templateSlug)?.occasions);
    return { occasion, ...reminderDateFor(occasion, data.countdown, new Date()) };
  });
  // The gift's own day is one of the two fields when it is a birthday or an anniversary.
  const giftField: Field | null = initial.occasion === "birthday" || initial.occasion === "anniversary" ? initial.occasion : null;
  const [name, setName] = useState(partner);
  // The two days: the gift's own filled in, the other empty until chosen.
  const [fields, setFields] = useState<Partial<Record<Field, MonthDay>>>(() => (giftField ? { [giftField]: { month: initial.month, day: initial.day } } : {}));
  // Still the day the gift told: "from this gift" until it is changed.
  const [fromGift, setFromGift] = useState(giftField !== null);
  // Saved this time, in the order saved, for "Saved. Your first email comes on…".
  const [savedNow, setSavedNow] = useState<{ field: Field; date: MonthDay; doneYear: number | null }[]>([]);
  const [more, setMore] = useState(false);

  // The rows behind "Add another day".
  const [occasion, setOccasion] = useState<ReminderOccasion>(initial.occasion);
  const [nextDate, setNextDate] = useState<MonthDay>({ month: initial.month, day: initial.day });
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<Partial<Record<"birthday" | "anniversary" | "someone", MonthDay>>>({});
  const [someone, setSomeone] = useState({ name: "", occasion: "birthday" as ReminderOccasion });
  const [since, setSince] = useState<{ date: MonthDay | null; year: number | null }>({ date: null, year: null });
  const [open, setOpen] = useState<RowId | null>(null);
  const [status, setStatus] = useState<Partial<Record<RowId | "dates", Status>>>({});
  // "Someone else" can be added more than once: the ones added so far.
  const [others, setOthers] = useState<{ name: string; occasion: ReminderOccasion; date: MonthDay }[]>([]);

  const thisYear = new Date().getFullYear();
  // Who the days are about: the gift's recipient, or the name typed above when the gift has none.
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

  // What the account already has for this person shows as saved, so a second gift for them doesn't
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
      const foundDays: Partial<Record<Field, MonthDay>> = {};
      // This gift's occasion, when it is not one of the two days, on whatever day the account has it.
      if (!giftField) {
        const first = mine.find((r) => r.occasion === initial.occasion && (initial.occasion !== "other" || (r.month === initial.month && r.day === initial.day)));
        if (first) {
          found.next = "saved";
          setNextDate({ month: first.month, day: first.day });
        }
      }
      for (const row of ["birthday", "anniversary", "valentines"] as const) {
        if (row === initial.occasion && !giftField) continue;
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
      // A day already saved replaces the one the gift suggested: that is the day the e-mails are for.
      setFields((f) => ({ ...f, ...foundDays }));
      if (giftField && foundDays[giftField]) setFromGift(false);
      setStatus((s) => ({ ...found, ...s }));
    });
    return () => {
      live = false;
    };
  }, [partner, initial, giftField]);
  const anySaved = Object.values(status).includes("saved") || others.length > 0;
  const setRow = (row: RowId | "dates", next: Status) => setStatus((s) => ({ ...s, [row]: next }));
  const busy = Object.values(status).includes("saving");

  /** POST /api/reminders. `forThisGift` only for the gift's own day: this year's e-mails are skipped there when the day is near. */
  const post = async (body: { recipientName: string; occasion: ReminderOccasion; date: MonthDay; forThisGift: boolean; someone?: boolean }): Promise<"saved" | "tooMany" | "failed"> => {
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
          // The page's currency, so an e-mail can say a price in it.
          currency,
          // The template is kept only to suggest a different one next time; someone else's days have nothing to do with it.
          ...(body.someone ? {} : { templateSlug: data.templateSlug }),
          // The countdown's day tells the server which occasion this gift is for, so that one is skipped.
          ...(body.forThisGift ? { giftDay: countdownDay(data.countdown) ?? undefined } : { forThisGift: false }),
        }),
      });
      if (res.status === 409) return "tooMany";
      if (!res.ok) return "failed";
      track("reminder_saved", { occasion: body.occasion, template: data.templateSlug, row: body.someone ? "someone" : body.occasion });
      // The "two more gifts" card above names the next days: it reads them again.
      window.dispatchEvent(new Event("ethos:reminder-saved"));
      return "saved";
    } catch {
      return "failed";
    }
  };

  const saveReminder = async (row: RowId, body: { recipientName: string; occasion: ReminderOccasion; date: MonthDay; forThisGift: boolean }): Promise<boolean> => {
    setRow(row, "saving");
    const result = await post({ ...body, someone: row === "someone" });
    setRow(row, result);
    return result === "saved";
  };

  /** "Remind me": each filled day not saved yet, one request each. */
  const saveDates = async () => {
    const todo = FIELDS.filter((f) => fields[f] && status[f] !== "saved");
    if (!who || todo.length === 0) return;
    setRow("dates", "saving");
    let worst: Status = "saved";
    for (const field of todo) {
      const date = fields[field]!;
      const forThisGift = field === giftField;
      const result = await post({ recipientName: who, occasion: field, date, forThisGift });
      if (result !== "saved") {
        worst = result;
        continue;
      }
      setRow(field, "saved");
      const doneYear = forThisGift ? initialLastSentYear(date, new Date(), countdownDay(data.countdown)) : null;
      setSavedNow((list) => [...list.filter((s) => s.field !== field), { field, date, doneYear }]);
    }
    setRow("dates", worst);
  };

  const saveNext = async () => {
    if (await saveReminder("next", { recipientName: who, occasion, date: nextDate, forThisGift: true })) setEditing(false);
  };
  const savePartnerDay = async (row: "birthday" | "anniversary" | "valentines") => {
    const date = row === "valentines" ? VALENTINES : days[row];
    if (!date) return;
    if (await saveReminder(row, { recipientName: who, occasion: row, date, forThisGift: false })) {
      setOpen(null);
      if (row !== "valentines") setFields((f) => ({ ...f, [row]: date }));
    }
  };
  const saveSomeone = async () => {
    const date = days.someone;
    const other = someone.name.trim();
    if (!date || !other) return;
    if (await saveReminder("someone", { recipientName: other, occasion: someone.occasion, date, forThisGift: false })) {
      setOthers((list) => [...list, { name: other, occasion: someone.occasion, date }]);
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

  // Both days in: the card says when the first e-mail comes, and lists them.
  const bothSaved = FIELDS.every((f) => status[f] === "saved");
  const datesDone = savedNow.length > 0 && FIELDS.every((f) => status[f] === "saved" || !fields[f]) ? true : bothSaved;
  const savedDays = FIELDS.filter((f) => status[f] === "saved" && fields[f])
    .map((f) => ({ field: f, date: fields[f]!, doneYear: savedNow.find((s) => s.field === f)?.doneYear ?? null }))
    // Soonest e-mails first: a day done for this year (the gift was just made for it) comes round next year.
    .sort((a, b) => (firstEmailDate([{ ...a.date, doneYear: a.doneYear }], new Date())?.getTime() ?? 0) - (firstEmailDate([{ ...b.date, doneYear: b.doneYear }], new Date())?.getTime() ?? 0));
  const first = firstEmailDate(savedDays.map((s) => ({ ...s.date, doneYear: s.doneYear })), new Date());
  const fieldLabel = (f: Field) => nextLabel(t, f, who);
  const filled = FIELDS.some((f) => fields[f] && status[f] !== "saved");

  // Behind "Add another day": this gift's occasion when it isn't one of the two days, a day of the two
  // not saved, Valentine's Day unless it is this gift's, then every month and someone else.
  const showNext = giftField === null;
  const partnerRows = (["birthday", "anniversary", "valentines"] as const).filter((row) => {
    if (row === "valentines") return !(showNext && occasion === "valentines" && status.valentines !== "saved");
    return datesDone && status[row] !== "saved";
  });
  const rowLabel = (row: Exclude<RowId, "next" | "someone">) => (row === "monthly" ? t("rows.monthly") : nextLabel(t, row, who));

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5" data-testid="remind-card">
      {datesDone ? (
        <div className="flex items-start gap-3" role="status" data-testid="remind-saved">
          <Check className="mt-1 size-5 shrink-0 text-moss" aria-hidden />
          <div className="min-w-0">
            <p className="text-[17px] leading-snug font-medium">{first ? t("savedFirst", { date: formatMonthDay({ month: first.getUTCMonth() + 1, day: first.getUTCDate() }, locale) }) : t("added")}</p>
            <ul className="mt-1.5 grid gap-0.5 text-[15px] text-muted-foreground">
              {savedDays.map((s) => (
                <li key={s.field}>
                  {fieldLabel(s.field)} · {formatMonthDay(s.date, locale)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <BellRing className="mt-1 size-5 shrink-0 text-coral" aria-hidden />
            <div className="min-w-0">
              <p className="font-display text-xl">{t("datesTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("datesWhy")}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {/* A gift without a name: whose days these are, first. */}
            {!partner ? (
              <label className="grid gap-1.5 text-[15px] font-medium">
                {t("name")}
                <input value={name} maxLength={REMINDER_NAME_MAX} onChange={(e) => setName(e.target.value)} className={fieldClass} autoComplete="off" data-testid="remind-name" />
              </label>
            ) : null}
            {FIELDS.map((f) => {
              const saved = status[f] === "saved";
              const marked = f === giftField && fromGift && !saved;
              return (
                // Not a <label> round the picker: a label names the button it holds, and the name would lose the day.
                <div key={f} className="grid gap-1.5 text-[15px] font-medium" data-testid={`remind-field-${f}`}>
                  <span aria-hidden="true">{fieldLabel(f)}</span>
                  <MonthDayPicker
                    label={marked ? `${fieldLabel(f)}, ${t("fromGift")}` : fieldLabel(f)}
                    value={fields[f] ?? null}
                    placeholder={t("pickDay")}
                    locale={locale}
                    onChange={(next) => {
                      setFields((d) => ({ ...d, [f]: next }));
                      if (f === giftField) setFromGift(false);
                      setStatus((s) => ({ ...s, [f]: s[f] === "saved" ? "saved" : "idle", dates: "idle" }));
                    }}
                    className={pickerClass}
                    adornment={
                      saved ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-moss">
                          <Check className="size-4" aria-hidden />
                          {t("added")}
                        </span>
                      ) : marked ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-normal text-moss">
                          <Check className="size-4" aria-hidden />
                          {t("fromGift")}
                        </span>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>

          <Button onClick={saveDates} disabled={!filled || !who.trim() || busy} className="mt-5 h-11 w-full rounded-full text-[15px]" data-testid="remind-save-dates">
            {status.dates === "saving" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            <span>{t("remindMe")}</span>
          </Button>
          <RowProblem status={status.dates} t={t} />
          <p className="mt-4 text-sm text-muted-foreground">{t("datesSmall")}</p>
        </>
      )}

      {more ? (
        <ul className="mt-4 divide-y divide-border border-t border-border" data-testid="remind-more">
          {/* This gift's occasion, next year, when it is neither a birthday nor an anniversary. */}
          {showNext ? (
            <li className="py-3" data-testid="remind-row-next">
              <Row
                icon={OCCASION_ICONS[occasion]}
                label={nextLabel(t, occasion, who)}
                sub={
                  <>
                    {formatMonthDay(nextDate, locale)} · {t("nextYear")}
                    {status.next !== "saved" ? (
                      <button type="button" onClick={() => setEditing(!editing)} aria-expanded={editing} className="ml-1.5 inline-flex min-h-11 items-center underline underline-offset-4 hover:text-ink">
                        {editing ? t("done") : t("edit")}
                      </button>
                    ) : null}
                  </>
                }
                status={status.next}
                action={t("save")}
                actionLabel={t("addLabel", { what: nextLabel(t, occasion, who) })}
                onAction={saveNext}
                disabled={!who || busy}
              />
              {editing && status.next !== "saved" ? (
                <div className="mt-3 grid gap-3">
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
          ) : null}

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
                disabled={busy || !who}
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
      ) : (
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-expanded={false}
          className="mt-3 inline-flex min-h-11 items-center gap-2.5 text-[15px] text-ink-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none"
          data-testid="remind-another"
        >
          <Plus className="size-4" aria-hidden />
          <span className="underline underline-offset-4">{t("another")}</span>
        </button>
      )}

      {more && anySaved ? (
        <p className="mt-2 text-sm">
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
