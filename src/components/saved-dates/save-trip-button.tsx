"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Currency } from "@/lib/pricing/products";
import { markSavingUnavailable } from "@/lib/saved-dates/availability";
import { deleteSavedDate, saveDate } from "@/lib/saved-dates/client";
import { forgetSaveAfterSignIn, isPassingFailure, rememberSaveAfterSignIn, takeSaveAfterSignIn, type SaveAfterSignIn } from "@/lib/saved-dates/link";
import type { SavedDatesError } from "@/lib/saved-dates/types";
import { SignInDialog } from "./sign-in-dialog";
import { SavedDatesUpsell } from "./upsell-sheet";
import { useSavedAccount, useSignedInWhile } from "./use-saved-account";

const PILL = "inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-forest ring-1 ring-forest/12 transition-colors hover:bg-rose-mist disabled:opacity-60";

/**
 * "Save trip", in a trip's hero: a toggle that keeps the trip in My dates, beside the dates they
 * save. The same rules as saving a date: a visitor signs in first (and it saves itself once they
 * are back), and a free account past its saves is shown what Ethos for Two adds. The trip's name
 * isn't stored with it: My dates and the reminder show it in whoever's reading language.
 */
export function SaveTripButton({ tripId, title, monthly, currency }: { tripId: string; title: string; monthly: boolean; currency: Currency }) {
  const t = useTranslations("savedDates");
  const account = useSavedAccount("trip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SavedDatesError | "network" | null>(null);
  const [upsell, setUpsell] = useState(false);
  const [signIn, setSignIn] = useState(false);
  // What was done here, ahead of the list catching up: the saved row's id, or null once removed.
  const [done, setDone] = useState<{ id: string | null } | null>(null);

  const items = account.list?.items ?? [];
  const mine = items.find((item) => item.tripId === tripId && item.mine);
  const theirs = items.find((item) => item.tripId === tripId && !item.mine);
  const savedId = done ? done.id : (mine?.id ?? null);
  const member = Boolean(account.list?.member);

  useSignedInWhile(signIn, () => setSignIn(false));

  const askToSignIn = () => {
    rememberSaveAfterSignIn(`trip:${tripId}`);
    setSignIn(true);
  };

  /** `waiting`: the save left for after signing in, when this is it. */
  const save = async (waiting: SaveAfterSignIn | null = null) => {
    if (account.status === "guest") return askToSignIn();
    setBusy(true);
    setError(null);
    const res = await saveDate({ kind: "trip", data: { v: 1, tripId } });
    setBusy(false);
    if (res.ok) {
      forgetSaveAfterSignIn(`trip:${tripId}`);
      setDone({ id: res.savedDate.id });
      if (!res.existing) track("saved_date_saved", { kind: "trip", member });
      account.reload();
      return;
    }
    if (waiting && isPassingFailure(res.error)) {
      // It didn't get through: it waits for another go rather than being used up (as on the plan).
      rememberSaveAfterSignIn(waiting.what, waiting.at);
      if (res.error === "not_configured") return markSavingUnavailable();
    }
    if (res.error === "limit_reached") return setUpsell(true);
    if (res.error === "unauthenticated") return askToSignIn();
    setError(res.error);
  };

  const remove = async () => {
    if (!savedId) return;
    setBusy(true);
    setError(null);
    const res = await deleteSavedDate(savedId);
    setBusy(false);
    // Already gone is what they asked for.
    if (res.ok || res.error === "not_found") {
      setDone({ id: null });
      account.reload();
      return;
    }
    setError(res.error);
  };

  // Back from signing in with this trip still to save: it saves itself, once.
  const signedIn = account.status === "ready";
  useEffect(() => {
    if (!signedIn || savedId) return;
    const timer = window.setTimeout(() => {
      const waiting = takeSaveAfterSignIn((what) => what === `trip:${tripId}`);
      if (waiting) void save(waiting);
    }, 0);
    return () => window.clearTimeout(timer);
    // Only the moment the list arrives for a session: `save` is a new function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Saving is off right now (0015 not applied, the database down): no button that can only fail.
  if (account.status === "unavailable") return null;

  return (
    <>
      {savedId ? (
        <div className="inline-flex items-center gap-1" data-testid="trip-saved">
          <Link href="/my-dates" className={PILL}>
            <BookmarkCheck aria-hidden="true" className="size-4 text-rose-deep" />
            {t("save.trip.saved")}
          </Link>
          <button type="button" onClick={() => void remove()} disabled={busy} aria-label={t("save.trip.removeLabel", { title })} className="inline-flex h-12 items-center rounded-full px-4 text-[14px] font-semibold text-forest/70 underline-offset-4 transition-colors hover:text-forest hover:underline disabled:opacity-60">
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : t("save.trip.remove")}
          </button>
        </div>
      ) : theirs ? (
        // Their partner's: shared already, and only its owner removes it.
        <Link href="/my-dates" className={PILL} data-testid="trip-saved">
          <BookmarkCheck aria-hidden="true" className="size-4 text-rose-deep" />
          {theirs.owner.name ? t("save.trip.byPartner", { name: theirs.owner.name }) : t("save.trip.saved")}
        </Link>
      ) : (
        <button type="button" onClick={() => void save()} disabled={busy} className={PILL} data-testid="save-trip">
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Bookmark aria-hidden="true" className="size-4 text-rose-deep" />}
          {t("save.trip.cta")}
        </button>
      )}
      {error ? (
        <p role="alert" className="basis-full text-[13px] leading-snug text-destructive">
          {error === "network" || error === "invalid_input" ? t("save.trip.failed") : t(`errors.${error}`)}
        </p>
      ) : null}
      <SavedDatesUpsell open={upsell} onOpenChange={setUpsell} reason="limit" monthly={monthly} currency={currency} />
      <SignInDialog open={signIn} onOpenChange={setSignIn} next={`/trips/${tripId}`} title={t("save.trip.signIn.title")} sub={t("save.trip.signIn.sub")} />
    </>
  );
}
