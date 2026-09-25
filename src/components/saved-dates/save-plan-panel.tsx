"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, CloudOff, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Plan } from "@/lib/dates/plan";
import { markSavingUnavailable } from "@/lib/saved-dates/availability";
import { saveDate } from "@/lib/saved-dates/client";
import { forgetSaveAfterSignIn, isPassingFailure, rememberSaveAfterSignIn, takeSaveAfterSignIn, writeLink, type SaveAfterSignIn, type SavedLink } from "@/lib/saved-dates/link";
import { linkFor, type SyncStatus } from "@/lib/saved-dates/sync";
import type { SavedDatesError, UpsellReason } from "@/lib/saved-dates/types";
import { cn } from "@/lib/utils";
import { RemindToggle } from "./remind-toggle";
import type { SavedAccount } from "./use-saved-account";

/**
 * "Save to my dates", in the plan's aside. Before: one button, which signs a visitor in first (the
 * plan waits in this browser and saves itself once they are back) and offers Ethos for Two when the
 * free saves are used. After: where it is ("Saved to my dates · All changes saved"), whose it is
 * when it is the partner's, the day-before reminder for members, and the way to My dates.
 */
export function SavePlanPanel({
  plan,
  defaultTitle,
  link,
  status,
  account,
  onUpsell,
  onSignIn,
}: {
  plan: Plan;
  defaultTitle: string;
  link: SavedLink | null;
  status: SyncStatus;
  account: SavedAccount;
  onUpsell: (reason: UpsellReason) => void;
  onSignIn: () => void;
}) {
  const t = useTranslations("savedDates");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<SavedDatesError | "network" | null>(null);
  // The reminder switch answers at once; the list it came from catches up on the next load.
  const [remindShown, setRemindShown] = useState<{ id: string; remind: boolean } | null>(null);
  const list = account.list;
  const member = Boolean(list?.member);
  const item = link ? list?.items.find((i) => i.id === link.id) : undefined;
  const remind = remindShown && remindShown.id === link?.id ? remindShown.remind : item?.remind;

  /** `waiting`: the save left for after signing in, when this is it. */
  const save = async (waiting: SaveAfterSignIn | null = null) => {
    if (account.status === "guest") return onSignIn();
    setSaving(true);
    setError(null);
    const res = await saveDate({ kind: "date", data: plan, title: defaultTitle });
    setSaving(false);
    if (res.ok) {
      forgetSaveAfterSignIn("plan");
      writeLink(linkFor(res.savedDate));
      track("saved_date_saved", { kind: "date", member });
      account.reload();
      return;
    }
    if (waiting && isPassingFailure(res.error)) {
      // It didn't get through: it waits for another go rather than being used up. Saving off for the
      // moment hides the panel until saving answers again, and then it saves itself (the effect below).
      rememberSaveAfterSignIn(waiting.what, waiting.at);
      if (res.error === "not_configured") return markSavingUnavailable();
    }
    if (res.error === "limit_reached") return onUpsell("limit");
    if (res.error === "unauthenticated") return onSignIn();
    setError(res.error);
  };

  // Back from signing in with the plan still to save: it saves itself, once, when the account has
  // answered (not while it is loading: an answer that saving is off, or no answer, leaves it waiting).
  const ready = account.status === "ready";
  useEffect(() => {
    if (!ready || link || plan.stops.length === 0) return;
    const timer = window.setTimeout(() => {
      const waiting = takeSaveAfterSignIn((what) => what === "plan");
      if (waiting) void save(waiting);
    }, 0);
    return () => window.clearTimeout(timer);
    // Only the moment the account's answer arrives: `save` is a new function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Saving is off right now (0015 not applied, the database down): no button that can only fail.
  if (!link && account.status === "unavailable") return null;

  if (!link)
    return (
      <div className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5" data-testid="save-plan">
        <h2 className="font-display text-[22px] text-forest">{t("save.title")}</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/65">{t("save.sub")}</p>
        <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-[14.5px] font-semibold text-cream transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60">
          {saving ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Bookmark aria-hidden="true" className="size-4" />}
          {saving ? t("save.saving") : t("save.cta")}
        </button>
        {/* Past the limit (a membership ended with more saved): "your free saves are used", never "4 of 3". */}
        {list && list.quota.limit !== null ? <p className="mt-3 text-center text-[12.5px] text-forest/60 tabular-nums">{list.quota.used >= list.quota.limit ? t("errors.limit_reached") : t("save.quota", { used: list.quota.used, limit: list.quota.limit })}</p> : null}
        {error ? (
          <p role="alert" className="mt-3 text-[13px] leading-snug text-destructive">
            {t(`errors.${error}`)}
          </p>
        ) : null}
      </div>
    );

  const partner = list?.partner?.name ?? null;
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5" data-testid="saved-plan">
      <p className="flex items-center gap-2 font-display text-[21px] leading-tight text-forest">
        <BookmarkCheck aria-hidden="true" className="size-5 shrink-0 text-rose-deep" />
        {link.mine ? t("save.saved") : t("save.partners", { name: link.ownerName ?? "…" })}
      </p>
      <p role="status" aria-live="polite" className={cn("mt-1.5 flex items-center gap-1.5 text-[13.5px]", status === "offline" ? "font-semibold text-forest/80" : "text-forest/60")}>
        {status === "saving" ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : status === "offline" ? <CloudOff aria-hidden="true" className="size-3.5 text-star" /> : null}
        {status === "saving" ? t("save.saving") : status === "offline" ? t("save.offline") : status === "pending" ? t("save.saving") : t("save.synced")}
      </p>
      {link.mine && member && partner ? (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-blush-paper px-3.5 py-2.5 text-[13.5px] leading-snug text-forest/75">
          <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-deep" />
          {t("save.shared", { name: partner })}
        </p>
      ) : null}
      {remind !== undefined ? <RemindToggle className="mt-3" savedId={link.id} remind={remind} member={member} hasDay={Boolean(plan.date)} onLocked={() => onUpsell("reminders")} onChanged={(next) => setRemindShown({ id: link.id, remind: next })} /> : null}
      <Link href="/my-dates" className="group mt-2 -mb-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
        {t("save.open")}
        <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
