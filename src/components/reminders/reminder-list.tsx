"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMonthDay, type Reminder } from "@/lib/lifecycle/reminders";
import { Button } from "@/components/ui/button";

/** The reminders on the account page: each can be removed, nothing else to manage. */
export function ReminderList({ initial }: { initial: Reminder[] }) {
  const t = useTranslations("lifecycle");
  const locale = useLocale() === "es" ? "es" : "en";
  const [reminders, setReminders] = useState(initial);
  const [removing, setRemoving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const remove = async (id: string) => {
    setRemoving(id);
    setFailed(false);
    try {
      const res = await fetch(`/api/reminders?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setReminders((list) => list.filter((r) => r.id !== id));
    } catch {
      setFailed(true);
    } finally {
      setRemoving(null);
    }
  };

  if (reminders.length === 0)
    return (
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("page.empty")}</p>
        <Button asChild variant="outline" className="mt-4 h-11 rounded-full">
          <Link href="/templates">{t("page.makeGift")}</Link>
        </Button>
      </div>
    );

  return (
    <>
      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {reminders.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2 pr-2 pl-5">
            <div className="min-w-0 flex-1 py-1">
              <p className="truncate font-medium">{r.recipientName}</p>
              <p className="text-sm text-muted-foreground">
                {t(`remind.occasions.${r.occasion}`)} · {formatMonthDay(r, locale)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => remove(r.id)} disabled={removing !== null} aria-label={t("page.removeLabel", { name: r.recipientName })} className="h-11 shrink-0 rounded-full px-4">
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
