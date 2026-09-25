"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { track } from "@/lib/analytics/track";
import { decidePublish, readinessProblems, premiumExtras } from "@/lib/gift/publish";
import { PRODUCTS, currencyFor, formatAmount } from "@/lib/pricing/products";
import { getManifest } from "@/templates/manifests";
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
import { publishAsksForMoney, replyTokenFrom, resumePath, templatePlan, type UpgradeQuote } from "@/components/pricing/offers";
import { fetchUpgradeQuote } from "@/components/pricing/upgrade-quote";
import { cn } from "@/lib/utils";
import { SITE } from "@/config/site";
import { request, tell } from "@/lib/app/bridge";
import { useInApp, useNativeEvents } from "@/lib/app/use-bridge";
import { Paywall } from "./paywall";
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
  const search = useSearchParams();
  const [fetchedEntitlement, setFetchedEntitlement] = useState<{ unlocked: boolean; owned: string[] } | null>(null);
  const entitlement = state.authed ? fetchedEntitlement : { unlocked: false, owned: [] };
  const [busy, setBusy] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeQuote | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const autoPublished = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Inside the iPhone app (lib/app/bridge.ts): paying is the App Store's sheet, signing in is the
  // app's, and once the app says a purchase went through the gift goes out as it does back from Stripe.
  const inApp = useInApp();
  const [appUnlocked, setAppUnlocked] = useState(false);
  const signingIn = useRef(false);
  const currency = currencyFor(locale === "es" ? "ES" : "US");
  // The price a guest is told before signing in: what this gift's own row costs.
  const priceHint = formatAmount(PRODUCTS[templatePlan(manifest.tier)].amounts[currency], currency, locale);
  // "Send one back" from a paid premium gift opens this editor with ?reply=<token>: the reply is free
  // (footer on, no extras). Only the server can open the token; until it says otherwise at publish,
  // the sheet takes it at its word. A premium template only: a free one is free anyway.
  const replyToken = manifest.tier === "premium" ? replyTokenFrom(search.get("reply")) : undefined;
  // The server said no ("reply_used", "reply_invalid"): the gift goes back to its normal price.
  const [replyRefused, setReplyRefused] = useState<string | null>(null);
  const freeReply = Boolean(replyToken) && replyRefused === null;
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
    void fetchUpgradeQuote(currency).then(setUpgrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state.authed, slug]);
  useEffect(() => {
    if (open) track("publish_sheet_shown", { template: slug, tier: manifest.tier, guest: !state.authed });
  }, [open, slug, manifest.tier, state.authed]);
  // The app says what this account owns changed (a purchase, a restore, a pass joined): check again.
  useNativeEvents((event) => {
    if (event.type === "entitlements" && open && state.authed) void getEntitlement(slug).then(setFetchedEntitlement);
  });

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
    entitlement && serialized ? decidePublish(manifest, serialized, entitlement, { ...options, freeReply }) : null;
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
    // A free reply's template costs nothing: what it's paying for is the rest of the list.
    manifest.tier === "premium" && !freeReply && t("featurePremiumTemplate"),
    options.removeWatermark && t("featureNoWatermark"),
    options.schedule && t("featureSchedule"),
    options.password && t("featurePassword"),
    ...(serialized ? premiumExtras(serialized) : [])
      // The editor calls the surprise "Included" on a premium template: the template is what is paid for there.
      .filter((extra) => extra !== "unwrap" || manifest.tier === "free" || freeReply)
      .map(
        (extra) =>
          ({
            // Music from outside Ethos; the catalogue song is free (lib/gift/publish.ts).
            song: t("featureSong"),
            video: t("featureVideo"),
            voiceNote: t("featureVoiceNote"),
            morePhotos: t("featurePhotos"),
            unwrap: t("featureUnwrap"),
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
      ...(freeReply ? { replyToken } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "reply_used" || result.error === "reply_invalid") setReplyRefused(result.error);
      else setError(result.error);
      return;
    }
    state.markPublished(result.data.shortId, result.data.status);
    setPublished(result.data);
    // The app closes the editor and shows its own "It's ready" sheet; the share screen below stays
    // as the fallback for an app that doesn't.
    if (inApp) {
      const sent = useEditor.getState();
      tell("published", {
        giftId,
        shortId: result.data.shortId,
        url: `${window.location.origin}${SITE.giftPath}/${result.data.shortId}`,
        status: result.data.status,
        ...(result.data.status === "scheduled" && sent.schedule.unlockAt ? { unlockAt: sent.schedule.unlockAt } : {}),
        title: sent.data.title,
        recipientName: sent.data.recipientName,
        templateSlug: slug,
      });
    }
  };

  /** The App Store's sheet for this gift; on "unlocked", check again, and the gift goes out below. */
  const unlockInApp = async (): Promise<"unlocked" | "cancelled" | "failed"> => {
    const reply = await request("paywall", { templateSlug: slug, tier: manifest.tier, features: premiumFeatures });
    if (reply.status !== "unlocked") return reply.status === "cancelled" ? "cancelled" : "failed";
    try {
      setFetchedEntitlement(await getEntitlement(slug));
    } catch {
      // Bought all the same: the next check (reopening the sheet, the app's "entitlements") sees it.
    }
    setAppUnlocked(true);
    return "unlocked";
  };

  /**
   * Signing in happens in the app, which then hands this page a session of its own. The page is
   * loaded again to pick it up, back on this sheet (the draft is kept on this device meanwhile).
   */
  const signInInApp = async () => {
    if (signingIn.current) return;
    signingIn.current = true;
    try {
      const reply = await request("signIn", { reason: "publish" });
      if (reply.status !== "signedIn") return;
      // Back to this editor in the page's own language, with the sheet open again. A whole page load,
      // not a client-side hop: the server has to render it with the session the app just handed over.
      const back = new URL(`${/^\/es(\/|$)/.test(window.location.pathname) ? "/es" : ""}${next}`, window.location.origin);
      window.location.assign(back.href);
    } catch {
      // The app said no: the sheet stays as it is.
    } finally {
      signingIn.current = false;
    }
  };

  const next = resumePath(slug, freeReply ? replyToken : undefined);
  // Anything that would need an unlock at publish time, shown before sign-in as a price hint.
  const wouldNeedPayment =
    (manifest.tier === "premium" && !freeReply) ||
    options.removeWatermark ||
    options.schedule ||
    options.password ||
    (serialized ? premiumExtras(serialized).length > 0 : false);

  const guestCanPay = wouldNeedPayment && paymentsEnabled;
  // "One payment, no subscription" under a free publish read as if sending it cost something.
  const asksForMoney = publishAsksForMoney({ authed: state.authed, supabaseConfigured, inApp, paymentsEnabled, wouldNeedPayment, decision });
  // Guests can't upload before they have an account; those uploads run right after payment.
  const guestProblems = problems.filter((p) => p !== "uploadsPending");

  // Back from Stripe, signed in, everything in place: one less tap.
  const canAutoPublish =
    (resume || appUnlocked) &&
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
      {/* A phone's whole screen, so the plans and the pay button have room; 32rem beside the editor from `sm`. */}
      <SheetContent side="right" closeLabel={tCommon("close")} className="w-full overflow-y-auto overscroll-contain bg-paper p-0 sm:max-w-lg">
        {published ? (
          <ShareScreen
            shortId={published.shortId}
            status={published.status}
            unlockAt={state.schedule.enabled ? state.schedule.unlockAt : undefined}
            data={state.data}
            giftId={state.giftId}
          />
        ) : (
          <div className="px-4 pt-8 pb-10 min-[360px]:px-5 sm:px-8">
            {/* Clear of the 44px close button, which "¿Listo para enviarlo?" ran under on a 320px phone. */}
            <SheetHeader className="p-0 pr-10 text-left">
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
                  // A template that needs no photos has nothing to tick off for them.
                  .filter((key) => (state.authed || key !== "uploadsPending") && (key !== "photosMin" || manifest.features.photos.min > 0))
                  .map((key) => {
                    const bad = problems.includes(key);
                    const stuck = key === "uploadsPending" && bad && lastingProblem;
                    // Ticked-off items read as the task they were ("Add their name"), so a finished
                    // upload can't keep saying the files are still uploading.
                    const label = key === "uploadsPending" && !bad
                      ? t("problems.uploadsDone")
                      : stuck
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

            {!state.authed && supabaseConfigured && inApp ? (
              <section className="mt-7 rounded-xl border border-line bg-card p-5" data-testid="app-sign-in">
                <p className="font-display text-xl">{t("signInTitle")}</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">{freeReply ? t("signInBlurbFreeReply") : t("signInBlurb")}</p>
                <Button className="h-12 w-full rounded-full text-base" onClick={() => void signInInApp()}>
                  {t("appSignIn")}
                </Button>
              </section>
            ) : null}
            {!state.authed && supabaseConfigured && !inApp && guestCanPay && !showSignIn ? (
              <Paywall
                manifest={manifest}
                currency={currency}
                locale={locale}
                guest
                features={premiumFeatures}
                returnTo={next}
                freeReply={freeReply}
                upgrade={null}
                blocked={guestProblems.length > 0}
                onSignInInstead={() => setShowSignIn(true)}
              />
            ) : null}
            {!state.authed && supabaseConfigured && !inApp && (!guestCanPay || showSignIn) ? (
              <section className="mt-7 rounded-xl border border-line bg-card p-5">
                <p className="font-display text-xl">{t("signInTitle")}</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  {wouldNeedPayment && paymentsEnabled
                    ? t("signInBlurbPaid", { price: priceHint })
                    : freeReply
                      ? t("signInBlurbFreeReply")
                      : t("signInBlurb")}
                </p>
                <AuthForm mode="login" next={next} compact />
              </section>
            ) : null}

            {state.authed && decision && !decision.ok && decision.reason === "payment_required" ? (
              paymentsEnabled || inApp ? (
                <Paywall
                  manifest={manifest}
                  currency={currency}
                  locale={locale}
                  guest={false}
                  features={premiumFeatures}
                  returnTo={next}
                  freeReply={freeReply}
                  upgrade={upgrade}
                  blocked={false}
                  ownedElsewhere={ownedElsewhere}
                  onAppUnlock={unlockInApp}
                />
              ) : (
                <Notice tone="info" className="mt-7">
                  {t("paymentSoon")}
                </Notice>
              )
            ) : null}

            {/* Only when the reply is what makes it free: someone who owns the template sends it without the footer. */}
            {freeReply && decision?.ok && !entitlement?.unlocked ? (
              <Notice tone="info" className="mt-6">
                {t.rich("freeReply", { name: state.data.recipientName || "…", who: keepAsWritten })}
              </Notice>
            ) : null}
            {replyRefused ? (
              <Notice tone="warn" className="mt-6">
                {t(replyRefused === "reply_used" ? "freeReplyUsed" : "freeReplyInvalid")}
              </Notice>
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
                  (!state.authed && guestCanPay && !showSignIn) ||
                  (!state.authed && inApp)) &&
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
            {asksForMoney ? (
              <p className="mt-3 text-center text-xs text-muted-foreground" data-testid="no-subscription">
                {tCommon("noSubscription")}
              </p>
            ) : null}
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
