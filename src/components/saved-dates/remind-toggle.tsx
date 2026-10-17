"use client";

import { useId, useState } from "react";
import { BellRing, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { patchSavedDate } from "@/lib/saved-dates/client";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

/**
 * "Remind us the day before", on a saved date: an email to both of them the morning before. A
 * member's switch; for anyone else the same line with a lock, which explains what it would take.
 * It needs a day to be the day before, so a date without one says so instead.
 */
export function RemindToggle({ savedId, remind, member, hasDay, onLocked, onChanged, className }: { savedId: string; remind: boolean; member: boolean; hasDay: boolean; onLocked: () => void; onChanged: (remind: boolean) => void; className?: string }) {
  const t = useTranslations("savedDates");
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!member)
    return (
      <button type="button" onClick={onLocked} className={cn("flex min-h-11 w-full items-center gap-3 rounded-2xl px-1 text-left text-[14.5px] text-forest/75 transition-colors hover:text-forest", className)}>
        <BellRing aria-hidden="true" className="size-4 shrink-0 text-forest/50" />
        <span className="flex-1">{t("save.remind")}</span>
        <Lock aria-hidden="true" className="size-4 shrink-0 text-forest/45" />
        <span className="sr-only">{t("maps.locked")}</span>
      </button>
    );

  if (!hasDay)
    return (
      <p className={cn("flex items-start gap-3 px-1 py-2 text-[13.5px] leading-snug text-forest/60", className)}>
        <BellRing aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-forest/40" />
        {t("save.remindNeedsDay")}
      </p>
    );

  const change = async (next: boolean) => {
    setBusy(true);
    setFailed(false);
    onChanged(next);
    const res = await patchSavedDate(savedId, { remind: next });
    setBusy(false);
    if (res.ok) return;
    // Put it back as it was, and say so: a switch that silently lies is worse than none.
    onChanged(!next);
    setFailed(true);
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[14.5px] text-forest">
        <BellRing aria-hidden="true" className="size-4 shrink-0 text-rose-deep" />
        <span className="flex-1">{t("save.remind")}</span>
        <Switch id={id} checked={remind} disabled={busy} onCheckedChange={(next) => void change(next)} />
      </label>
      {failed ? (
        <p role="alert" className="px-1 text-[12.5px] text-destructive">
          {t("card.remindFailed")}
        </p>
      ) : null}
    </div>
  );
}
