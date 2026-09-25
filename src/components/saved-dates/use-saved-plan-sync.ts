"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getSavedDate, patchSavedDate, type Result } from "@/lib/saved-dates/client";
import { readLink, useSavedLink, writeLink, type SavedLink } from "@/lib/saved-dates/link";
import { afterRefresh, afterSave, planKey, type SaveAnswer, type SyncNotice, type SyncStatus, type SyncStep } from "@/lib/saved-dates/sync";
import type { SavedDate } from "@/lib/saved-dates/types";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import { currentPlan, usePlan } from "@/components/dates/use-plan";

const asAnswer = (result: Result<{ savedDate: SavedDate }>): SaveAnswer => (result.ok ? { ok: true, savedDate: result.savedDate } : result);

/** A pause in the editing this long, and the plan is saved. */
const SAVE_DELAY_MS = 1200;
/** While the page is in view, the row is read again this often, so the other phone's changes arrive without a reload. */
const REFRESH_MS = 45_000;

/**
 * Saves the plan back to the saved date it is linked to (lib/saved-dates/link.ts), a moment after
 * each change, and takes the other phone's changes when the page comes back into view. Mounted
 * wherever the plan is edited: the plan itself, and the Dates map that adds stops to it. Nothing
 * happens while the plan isn't linked, so a plan that was never saved never leaves the browser.
 */
export function useSavedPlanSync(onNotice: (notice: SyncNotice) => void): { link: SavedLink | null; status: SyncStatus } {
  const [plan, updatePlan] = usePlan();
  const link = useSavedLink();
  const key = useMemo(() => planKey(plan), [plan]);
  const dirty = link !== null && key !== link.synced;
  const [saving, setSaving] = useState(false);
  // The plan whose save didn't arrive (offline, signed out): shown as "not saved yet", and tried
  // again on the next change, when the page comes back into view, or when the connection does.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const inFlight = useRef(false);
  const notice = useRef(onNotice);
  useEffect(() => {
    notice.current = onNotice;
  });

  const apply = useCallback(
    (step: SyncStep) => {
      // The link first: with the plan replaced before it, the new plan would read as a change to save.
      writeLink(step.link);
      if (step.plan) {
        const next = step.plan;
        updatePlan(() => next);
      }
      if (step.notice) notice.current(step.notice);
    },
    [updatePlan],
  );

  const save = useCallback(async () => {
    const linked = readLink();
    if (!linked || inFlight.current) return;
    const sending = currentPlan();
    const sentKey = planKey(sending);
    if (sentKey === linked.synced) return;
    if (!hasSessionCookie()) return setFailedKey(sentKey);
    inFlight.current = true;
    setSaving(true);
    const answer = await patchSavedDate(linked.id, { baseVersion: linked.version, data: sending });
    inFlight.current = false;
    setSaving(false);
    // Unlinked, or another date opened, while it was on its way: the answer is about a plan no longer here.
    const latest = readLink();
    if (!latest || latest.id !== linked.id) return;
    const step = afterSave(latest, planKey(currentPlan()), asAnswer(answer));
    apply(step);
    setFailedKey(step.retry ? sentKey : null);
  }, [apply]);

  // A change, then a pause: save. A save that didn't arrive waits for a reason to try again.
  const synced = link?.synced ?? null;
  useEffect(() => {
    if (!dirty || saving || failedKey === key) return;
    const timer = window.setTimeout(() => void save(), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, key, synced, saving, failedKey, save]);

  const linkedId = link?.id ?? null;
  useEffect(() => {
    if (!linkedId) return;
    let live = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight.current || !hasSessionCookie()) return;
      const answer = asAnswer(await getSavedDate(linkedId));
      const latest = readLink();
      if (!live || !latest || latest.id !== linkedId || inFlight.current) return;
      apply(afterRefresh(latest, planKey(currentPlan()), answer));
      // Back in view, or back online: a change that couldn't be saved gets another go.
      setFailedKey(null);
    };
    void refresh();
    const onVisible = () => void refresh();
    const timer = window.setInterval(onVisible, REFRESH_MS);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [linkedId, apply]);

  const status: SyncStatus = saving ? "saving" : !dirty ? "saved" : failedKey === key ? "offline" : "pending";
  return { link, status };
}

/** What a sync notice says, for the page's toast. */
export function useSyncNoticeText(): (notice: SyncNotice) => string {
  const t = useTranslations("savedDates.sync");
  return useCallback((notice: SyncNotice) => (notice.kind === "conflict" ? (notice.name ? t("conflict", { name: notice.name }) : t("conflictHere")) : notice.kind === "readOnly" ? t("readOnly") : t("gone")), [t]);
}
