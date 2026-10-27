"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMonthDay, type Reminder } from "@/lib/lifecycle/reminders";
import { parseYmd, type MonthsaryView } from "@/lib/lifecycle/monthsaries";
import { Button } from "@/components/ui/button";

/** The reminders on the account page, and the monthly one if they asked for it: each can be removed, nothing else to manage. */
export function ReminderList({ initial, monthsary: initialMonthsary = null }: { initial: Reminder[]; monthsary?: MonthsaryView | null }) {
  const t = useTranslations("lifecycle");
  const locale = useLocale() === "es" ? "es" : "en";
  const [reminders, setReminders] = useState(initial);
  const [monthsary, setMonthsary] = useState(initialMonthsary);
  const [removing, setRemoving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const remove = async (id: string, kind: "reminder" | "monthsary" = "reminder") => {
    setRemoving(id);
    setFailed(false);
    try {
      const res = await fetch(`/api/${kind === "monthsary" ? "monthsaries" : "reminders"}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      if (kind === "monthsary") setMonthsary(null);
      else setReminders((list) => list.filter((r) => r.id !== id));
    } catch {
      setFailed(true);
    } finally {
      setRemoving(null);
    }
  };

  if (reminders.length === 0 && !monthsary)
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("page.empty")}</p>
        <Button asChild variant="outline" className="mt-4 h-11 rounded-full">
          <Link href="/templates">{t("page.makeGift")}</Link>
        </Button>
      </div>
    );

  const day = monthsary ? parseYmd(monthsary.since)?.day : undefined;
  return (
    <>
      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {monthsary ? (
          <li className="flex items-center gap-3 py-2 pr-2 pl-5" data-testid="monthsary-row">
            <div className="min-w-0 flex-1 py-1">
              <p className="truncate font-medium">{monthsary.partnerName}</p>
              <p className="text-sm text-muted-foreground">{t("page.monthly", { day: day ?? "" })}</p>
            </div>
            <Button variant="ghost" onClick={() => remove(monthsary.id, "monthsary")} disabled={removing !== null} aria-label={t("page.monthlyRemoveLabel", { name: monthsary.partnerName })} className="h-11 shrink-0 rounded-full px-4">
              {removing === monthsary.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
              <span>{t("page.monthlyRemove")}</span>
            </Button>
          </li>
        ) : null}
        {reminders.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2 pr-2 pl-5">
            <div className="min-w-0 flex-1 py-1">
              <p className="truncate font-medium">{r.recipientName}</p>
              <p className="text-sm text-muted-foreground">
                {t(`remind.occasions.${r.occasion}`)} · {formatMonthDay(r, locale)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => remove(r.id)} disabled={removing !== null} aria-label={t("page.removeLabel", { what: `${r.recipientName}, ${t(`remind.occasions.${r.occasion}`)}, ${formatMonthDay(r, locale)}` })} className="h-11 shrink-0 rounded-full px-4">
              {removing === r.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
              <span>{t("page.remove")}</span>
            </Button>
          </li>
        ))}
      </ul>
      {failed ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {t("page.failed")}
        </p>
      ) : null}
    </>
  );
}
