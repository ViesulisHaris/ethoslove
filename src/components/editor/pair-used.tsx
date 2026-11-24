"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftData } from "@/lib/gift/schema";
import { REMINDER_NAME_MAX, reminderDateFor, reminderOccasionFor, type Reminder } from "@/lib/lifecycle/reminders";
import { dayArgs, localToday, nextDays, type NextDay } from "@/lib/lifecycle/next-days";
import { getManifest } from "@/templates/manifests";

/**
 * The small, always-loaded half of "two more gifts": the days it names and the quiet line a gift sent
 * on one of them gets. Imported statically by the share screen, so that line never waits for the
 * offer card's own code (two-more-gifts.tsx, loaded by the publish sheet while it is open).
 */

/**
 * The account's saved days (GET /api/reminders, as the reminder card reads it), or null when they
 * can't be read. The publish sheet asks while it is open, with the entitlements, so the card's rows
 * are right in its first frame and never redrawn when the answer comes.
 */
export async function fetchSavedReminders(): Promise<Reminder[] | null> {
  try {
    const r = await fetch("/api/reminders", { cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as { reminders?: Reminder[] } | null;
    return body?.reminders ?? null;
  } catch {
    return null;
  }
}

/**
 * The next two days for this recipient, from the saved days handed in (`initial`, read while the
 * sheet was open). Read here only when they weren't (`initial` null), and again each time the
 * reminder card below saves one ("ethos:reminder-saved"); nothing at all while `enabled` is false,
 * so a screen with no card asks nothing.
 */
export function useNextDays(data: GiftData, initial: Reminder[] | null | undefined, enabled = true): NextDay[] {
  const [made] = useState(() => {
    const occasions = getManifest(data.templateSlug)?.occasions;
    if (occasions?.[0] === "christmas") return { occasion: "christmas" as const, month: 12, day: 25 };
    const occasion = reminderOccasionFor(occasions);
    return { occasion, ...reminderDateFor(occasion, data.countdown, new Date()) };
  });
  const who = data.recipientName.trim().slice(0, REMINDER_NAME_MAX).toLowerCase();
  const theirs = useCallback((all: Reminder[]) => all.filter((r) => r.recipientName.trim().toLowerCase() === who), [who]);
  const [saved, setSaved] = useState<Reminder[]>(() => (initial ? theirs(initial) : []));
  const read = useCallback(() => {
    if (!who) return () => {};
    let live = true;
    void fetchSavedReminders().then((all) => {
      if (live && all) setSaved(theirs(all));
    });
    return () => {
      live = false;
    };
  }, [who, theirs]);
  const known = initial != null;
  useEffect(() => {
    if (!enabled) return;
    const stop = known ? () => {} : read();
    const again = () => void read();
    window.addEventListener("ethos:reminder-saved", again);
    return () => {
      stop();
      window.removeEventListener("ethos:reminder-saved", again);
    };
  }, [enabled, known, read]);
  // Recomputed only when what it reads changes, so the rows never move unless the days really differ.
  return useMemo(() => nextDays(localToday(), saved, made), [saved, made]);
}

/** Picture a8: this gift went out on one of the two. */
export function UsedOne({ left, days, name }: { left: number; days: NextDay[]; name: string }) {
  const t = useTranslations("editor.share.pair");
  const next = days[0];
  return (
    <section className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-card p-5" data-testid="pair-used">
      <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-moss" />
      <div className="min-w-0">
        <p className="text-base font-medium text-ink">{t("usedOne")}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{left > 0 ? t("leftOne", next ? dayArgs(next, name) : { kind: "other", name: "" }) : t("leftNone")}</p>
      </div>
    </section>
  );
}

/** The share screen's line for a gift sent on a gift ready, with its days. */
export function UsedGiftLine({ data, left, saved }: { data: GiftData; left: number; saved?: Reminder[] | null }) {
  const days = useNextDays(data, saved);
  return <UsedOne left={left} days={days} name={data.recipientName} />;
}
