"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { currentRef } from "@/lib/attribution/ref";
import { decidePublish, readinessProblems, premiumExtras } from "@/lib/gift/publish";
import { PRODUCTS, currencyFor, formatAmount, type ProductId } from "@/lib/pricing/products";
import { getManifest } from "@/templates/manifests";
import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { stuckUploads, type StuckUpload } from "@/lib/editor/failed-uploads";
import { LIMITS } from "@/config/site";
import { getEntitlement, publishGift } from "@/app/actions/gift";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthForm } from "@/components/auth/auth-form";
import { keepAsWritten } from "@/components/shared/keep-as-written";
import { cn } from "@/lib/utils";
import { ShareScreen } from "./share-screen";

export function PublishSheet({
  open,
  onOpenChange,
  manifest,
  slug,
  supabaseConfigured,
  paymentsEnabled,
  resume = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  manifest: TemplateManifest;
  slug: string;
  supabaseConfigured: boolean;
  /** Back from checkout with ?resume=publish: publish as soon as everything is in place. */
  resume?: boolean;
  paymentsEnabled: boolean;
}) {
  const t = useTranslations("editor.publishSheet");
  const tCommon = useTranslations("common");
  const locale = useLocale() as GiftLocale;
  const state = useEditor();
  const [fetchedEntitlement, setFetchedEntitlement] = useState<{ unlocked: boolean; owned: string[] } | null>(null);
  const entitlement = state.authed ? fetchedEntitlement : { unlocked: false, owned: [] };
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<ProductId | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const autoPublished = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const currency = currencyFor(locale === "es" ? "ES" : "US");
  const priceOne = formatAmount(PRODUCTS.single.amounts[currency], currency, locale);
  const priceAll = formatAmount(PRODUCTS.everything.amounts[currency], currency, locale);
  const [published, setPublished] = useState<{
    shortId: string;
    status: "live" | "scheduled";
  } | null>(null);

  // Opening the sheet kicks uploads + a fresh entitlement check.
  useEffect(() => {
    if (!open || !state.authed) return;
    // Anything still waiting on this device goes up now, including files an earlier visit never sent.
    void state.ensureRemote().then(() => useEditor.getState().uploadPending());
    getEntitlement(slug).then(setFetchedEntitlement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state.authed, slug]);

  const serialized = useMemo(() => (state.hydrated ? state.serializedForServer() : null), [state]);
  const uploadsInFlight = Object.values(state.assets).some(
    (a) => a.status === "uploading" || a.status === "processing",
  );
  const uploadTotals = useMemo(() => {
    const local = Object.values(state.assets).filter((a) => a.local || a.status === "processing");
    return { total: local.length, done: local.filter((a) => a.status === "uploaded").length };
  }, [state.assets]);
  // Everything the gift still points at on this device, named the way the sender thinks of it.
  const stuckItems = useMemo(
    () => (state.hydrated ? stuckUploads(state.data, state.assets) : []),
    [state.hydrated, state.data, state.assets],
  );
  // A file that failed says so at once; one that is still going gets twenty seconds before we
  // offer to drop it, so nobody is ever left watching a spinner with no way forward.
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setGraceOver(true), 20000);
    return () => window.clearTimeout(id);
  }, [open]);
  const lastingProblem = stuckItems.some((item) => item.reason !== "waiting");
  const showStuck = stuckItems.length > 0 && (lastingProblem || graceOver);
  const failedLabel = (item: StuckUpload) =>
    item.group === "song"
      ? item.title
        ? t("failed.song", { title: item.title })
        : t("failed.songUntitled")
      : item.group === "photos"
        ? t("failed.photos", { n: item.count })
        : t(`failed.${item.group}`);
  const failedReason = (item: StuckUpload) =>
    item.reason === "type"
      ? t(item.group === "video" ? "failed.typeVideo" : item.group === "photos" ? "failed.typePhoto" : "failed.typeAudio")
      : item.reason === "too_big"
        ? t("failed.tooBig", { mb: Math.round(LIMITS.uploadMaxBytes / 1024 / 1024) })
        : t(`failed.${item.reason}`);
  // A phone that comes back online mid-checklist picks its uploads straight back up.
  useEffect(() => {
    if (!open) return;
    const onOnline = () => void useEditor.getState().retryUploads();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [open]);
  const problems = useMemo(() => {
    if (!serialized) return ["uploadsPending"];
    const p = readinessProblems(manifest, serialized);
    if (uploadsInFlight && !p.includes("uploadsPending")) p.push("uploadsPending");
    return p;
  }, [manifest, serialized, uploadsInFlight]);

  const options = {
    removeWatermark: state.removeWatermark,
    schedule: state.schedule.enabled,
    password: state.password.length > 0,
  };
  const decision =
    entitlement && serialized ? decidePublish(manifest, serialized, entitlement, options) : null;
  // What they have already paid for, so the paywall can name it instead of asking again blindly.
  const ownedElsewhere = useMemo(
    () =>
      (state.authed ? (fetchedEntitlement?.owned ?? []) : [])
        .filter((s) => s !== slug && s !== "*")
        .map((s) => getManifest(s))
        .filter((m): m is TemplateManifest => Boolean(m)),
    [fetchedEntitlement, state.authed, slug],
  );
  const premiumFeatures = [
    manifest.tier === "premium" && t("featurePremiumTemplate"),
    options.removeWatermark && t("featureNoWatermark"),
    options.schedule && t("featureSchedule"),
    options.password && t("featurePassword"),
    ...(serialized ? premiumExtras(serialized) : []).map(
      (extra) =>
        ({
          song: t("featureSong"),
          video: t("featureVideo"),
          voiceNote: t("featureVoiceNote"),
          morePhotos: t("featurePhotos"),
        })[extra],
    ),
  ].filter(Boolean) as string[];

  const publish = async () => {
    setBusy(true);
    setError(null);
    const giftId = await state.ensureRemote();
    if (!giftId) {
      setBusy(false);
      setError("no_gift");
      return;
    }
    await state.uploadPending();
    const result = await publishGift({
      giftId,
      data: useEditor.getState().serializedForServer(),
      removeWatermark: state.removeWatermark,
      password: state.password || undefined,
      schedule:
        state.schedule.enabled && state.schedule.unlockAt
          ? { unlockAt: state.schedule.unlockAt, timezone: state.schedule.timezone }
          : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    state.markPublished(result.data.shortId, result.data.status);
    setPublished(result.data);
  };

  const next = `/create/${slug}?resume=publish`;
  // Anything that would need an unlock at publish time, shown before sign-in as a price hint.
  const wouldNeedPayment =
    manifest.tier === "premium" ||
    options.removeWatermark ||
    options.schedule ||
    options.password ||
    (serialized ? premiumExtras(serialized).length > 0 : false);

  const guestCanPay = wouldNeedPayment && paymentsEnabled;
  // Guests can't upload before they have an account; those uploads run right after payment.
  const guestProblems = problems.filter((p) => p !== "uploadsPending");

  const checkout = async (product: ProductId) => {
    setPaying(product);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product,
          templateSlugs: product === "single" ? [slug] : [],
          currency,
          returnTo: next,
          locale,
          ref: currentRef(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string };
      if (!json.url) throw new Error("no_url");
      window.location.assign(json.url);
    } catch {
      setPaying(null);
      toast.error(t("error", { error: "checkout" }));
    }
  };
  // Back from Stripe, signed in, everything in place: one less tap.
  const canAutoPublish =
    resume &&
    open &&
    state.authed &&
    Boolean(decision?.ok) &&
    !busy &&
    !published &&
    problems.every((p) => p === "uploadsPending");
  useEffect(() => {
    if (!canAutoPublish || autoPublished.current) return;
    autoPublished.current = true;
    const id = window.setTimeout(() => void publish(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- publish is recreated every render; the flag above gates it
  }, [canAutoPublish]);

  if (!state.hydrated) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) setError(null);
        onOpenChange(v);
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto bg-paper p-0 sm:max-w-lg">
        {published ? (
          <ShareScreen
            shortId={published.shortId}
            status={published.status}
            unlockAt={state.schedule.enabled ? state.schedule.unlockAt : undefined}
            data={state.data}
            giftId={state.giftId}
          />
        ) : (
          <div className="px-6 pt-8 pb-10 sm:px-8">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="font-display text-3xl">{t("title")}</SheetTitle>
              <SheetDescription>
                {t.rich("subtitle", { name: state.data.recipientName || "…", who: keepAsWritten })}
              </SheetDescription>
            </SheetHeader>

            {!supabaseConfigured ? (
              <Notice tone="warn" className="mt-6">
                {t("notConfigured")}
              </Notice>
            ) : null}

            <section className="mt-7">
              <p className="mb-3 text-eyebrow text-ink-soft">{t("checklist")}</p>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {(
                  ["recipientName", "senderName", "message", "photosMin", "uploadsPending"] as const
                )
                  .filter((key) => state.authed || key !== "uploadsPending")
                  .map((key) => {
                    const bad = problems.includes(key);
                    const stuck = key === "uploadsPending" && bad && lastingProblem;
                    const label = stuck
                      ? t("problems.uploadsFailed")
                      : key === "uploadsPending" && bad && uploadTotals.total > 1
                        ? t("uploadingCount", { done: uploadTotals.done, total: uploadTotals.total })
                        : t(`problems.${key}`, { min: manifest.features.photos.min });
                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm",
                          bad
                            ? "text-ink"
                            : "text-muted-foreground line-through decoration-moss/60",
                        )}
                      >
                        {bad ? (
                          key === "uploadsPending" && !stuck ? (
                            <Loader2 className="size-4 animate-spin text-coral" />
                          ) : (
                            <AlertCircle className="size-4 text-coral" />
                          )
                        ) : (
                          <Check className="size-4 text-moss" />
                        )}
                        <span>{label}</span>
                      </li>
                    );
                  })}
              </ul>
              {state.authed && showStuck ? (
                <div className="mt-3 rounded-2xl border border-coral/40 bg-coral/5 p-3" role="alert" data-testid="failed-uploads">
                  <ul className="flex flex-col gap-3">
                    {stuckItems.map((item) => (
                      <li key={item.group} className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-coral" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium [overflow-wrap:anywhere]">{failedLabel(item)}</p>
                          <p className="mt-0.5 text-xs text-ink-soft">{failedReason(item)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 shrink-0 rounded-full px-3.5"
                          onClick={() => void state.dropStuckUploads(item.group)}
                          data-testid={`remove-failed-${item.group}`}
                        >
                          {t("failed.remove")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {stuckItems.some((item) => item.retryable) ? (
                    <Button type="button" variant="outline" className="mt-3 h-10 w-full rounded-full" onClick={() => void state.retryUploads()}>
                      {t("retryUploads")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </section>

            {!state.authed && supabaseConfigured && guestCanPay && !showSignIn ? (
              <section
                className="mt-7 rounded-xl border border-ink bg-card p-5"
                data-testid="pay-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-display text-xl">
                      <Lock className="size-4 text-coral" />
                      {t("payTitle")}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {t("payGuestBlurb", {
                        features: premiumFeatures.join(", "),
                        price: priceOne,
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-[2rem] leading-none tracking-tight">
                    {priceOne}
                  </p>
                </div>
                <Button
                  className="mt-5 h-12 w-full rounded-full text-base"
                  disabled={paying !== null || guestProblems.length > 0}
                  onClick={() => checkout("single")}
                  data-testid="pay-single"
                >
                  {paying === "single" ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>{paying === "single" ? t("paying") : t("payButton", { price: priceOne })}</span>
                </Button>
                <button
                  type="button"
                  disabled={paying !== null || guestProblems.length > 0}
                  onClick={() => checkout("everything")}
                  className="mt-3 w-full text-center text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                >
                  {t("payAll", { price: priceAll })}
                </button>
                <p className="mt-3 text-center text-mono-meta text-muted-foreground">
                  {t("payNote")} {t("uploadsAfterPay")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSignIn(true)}
                  className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
                >
                  {t("signInInstead")}
                </button>
              </section>
            ) : null}
            {!state.authed && supabaseConfigured && (!guestCanPay || showSignIn) ? (
              <section className="mt-7 rounded-xl border border-line bg-card p-5">
                <p className="font-display text-xl">{t("signInTitle")}</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  {wouldNeedPayment && paymentsEnabled
                    ? t("signInBlurbPaid", { price: priceOne })
                    : t("signInBlurb")}
                </p>
                <AuthForm mode="login" next={next} compact />
              </section>
            ) : null}

            {state.authed && decision && !decision.ok && decision.reason === "payment_required" ? (
              <section
                className="mt-7 rounded-xl border border-ink bg-card p-5"
                data-testid="pay-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-display text-xl">
                      <Lock className="size-4 text-coral" />
                      {t("payTitle")}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {t("payBlurb", { features: premiumFeatures.join(", ") })}
                    </p>
                    {ownedElsewhere.length ? (
                      <p className="mt-3 text-sm text-ink-soft">
                        {t("ownedElsewhere", { templates: ownedElsewhere.map((m) => m.name[locale]).join(", ") })}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-display text-[2rem] leading-none tracking-tight">
                    {priceOne}
                  </p>
                </div>
                {paymentsEnabled ? (
                  <>
                    <Button
                      className="mt-5 h-12 w-full rounded-full text-base"
                      disabled={paying !== null}
                      onClick={() => checkout("single")}
                      data-testid="pay-single"
                    >
                      {paying === "single" ? <Loader2 className="size-4 animate-spin" /> : null}
                      <span>{paying === "single" ? t("paying") : t("payButton", { price: priceOne })}</span>
                    </Button>
                    <button
                      type="button"
                      disabled={paying !== null}
                      onClick={() => checkout("everything")}
                      className="mt-3 w-full text-center text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
                    >
                      {t("payAll", { price: priceAll })}
                    </button>
                    {ownedElsewhere.length === 1 ? (
                      <a
                        href={`/create/${ownedElsewhere[0].slug}`}
                        className="mt-3 block w-full text-center text-sm font-medium text-coral underline-offset-4 hover:underline"
                      >
                        {t("openOwned", { template: ownedElsewhere[0].name[locale] })}
                      </a>
                    ) : null}
                    <p className="mt-3 text-center text-mono-meta text-muted-foreground">
                      {t("payNote")}
                    </p>
                  </>
                ) : (
                  <Notice tone="info" className="mt-4">
                    {t("paymentSoon")}
                  </Notice>
                )}
              </section>
            ) : null}

            {error ? (
              <Notice tone="warn" className="mt-6">
                {t("error", { error })}
              </Notice>
            ) : null}

            <Button
              className={cn(
                "mt-8 h-12 w-full rounded-full text-base",
                ((decision && !decision.ok && decision.reason === "payment_required") ||
                  (!state.authed && guestCanPay && !showSignIn)) &&
                  "hidden",
              )}
              disabled={
                !supabaseConfigured || !state.authed || busy || problems.length > 0 || !decision?.ok
              }
              onClick={publish}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              <span>
                {busy
                  ? t("publishing")
                  : state.schedule.enabled
                    ? t("publishScheduled")
                    : t("publishNow")}
              </span>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {tCommon("noSubscription")}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Notice({
  tone,
  className,
  children,
}: {
  tone: "warn" | "info";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 text-sm",
        tone === "warn"
          ? "border-coral/40 bg-coral/5 text-ink"
          : "border-border bg-card text-ink-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}
