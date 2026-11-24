"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest, TemplateModule } from "@/templates/types";
import type { ShownReaction } from "@/lib/proof/numbers";
import { freeTestEvent, track } from "@/lib/analytics/track";
import { countRecipientGiftSent } from "@/lib/attribution/recipient-loop";
import { decidePublish, fieldMustHaves, fieldProblems, readinessProblems, premiumExtras, withOldGiftRule, type FieldProblem } from "@/lib/gift/publish";
import { FREE_NOTE_MAX_CHARS, NOTE_PHOTOS_MAX, NOTE_TEMPLATES, noteCanBeFree, noteLength, noteRules, oldFreeGiftAddsPhotos, sellsNotePhotos } from "@/lib/gift/free-tier";
import { FreeNoteOption } from "./free-note-option";
import { pickPaySheet, type PayArm } from "@/lib/editor/pay-sheet-split";
import { canKeepPhotos, pickKeep, rememberLetterClick, type KeepArm } from "@/lib/editor/keep-split";
import { CAMPAIGN_GIFT_LIMIT } from "@/lib/commerce/campaign-rules";
import { PRODUCTS, extrasAmount, formatAmount, hasGroupUnlock, photosUnlock } from "@/lib/pricing/products";
import { startCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { useCurrency } from "@/lib/pricing/use-currency";
import { getManifest } from "@/templates/manifests";
import { useEditor } from "@/lib/editor/store";
import { stuckUploads, type StuckUpload } from "@/lib/editor/failed-uploads";
import { LIMITS } from "@/config/site";
import { getEntitlement, publishGift } from "@/app/actions/gift";
import { getIdeaHint } from "@/app/actions/monthly-idea";
import type { IdeaHint, IdeaMode } from "@/lib/lifecycle/monthly-idea";
import { useEtsyMode } from "./etsy-claim";
import { FreeTermsBox } from "./free-terms-box";
import { IdeaWhereNote } from "./idea-where-note";
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
import { groupOnSheet, guestPaysOnSheet, publishAsksForMoney, replyTokenFrom, resumePath, templatePlan, type UpgradeQuote } from "@/components/pricing/offers";
import { fetchUpgradeQuote } from "@/components/pricing/upgrade-quote";
import { cn } from "@/lib/utils";
import { SITE } from "@/config/site";
import { request, tell } from "@/lib/app/bridge";
import { useInApp, useNativeEvents } from "@/lib/app/use-bridge";
import { Paywall } from "./paywall";
import { GroupPayPanel } from "./group-pay-panel";
import type { HolidayExtra } from "@/lib/lifecycle/holiday-extras";
import { AlreadyPaid, openingOf } from "./already-paid";
import { ShareScreen, type ShareScreenPair } from "./share-screen";
import { fetchEntitlements } from "@/components/pricing/entitlements";
import { fetchSavedReminders } from "./pair-used";
import { humanize } from "./template-fields";

export function PublishSheet({
  open,
  onOpenChange,
  manifest,
  mod,
  slug,
  supabaseConfigured,
  paymentsEnabled,
  resume = false,
  reaction = null,
  groupEnabled = false,
  ideaMode = "off",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  manifest: TemplateManifest;
  /** The template's schema and field labels: its own fields are checked as publishing checks them. */
  mod: TemplateModule | null;
  slug: string;
  supabaseConfigured: boolean;
  /** Back from checkout with ?resume=publish: publish as soon as everything is in place. */
  resume?: boolean;
  paymentsEnabled: boolean;
  /** A real reaction (approved, its writer agreed: lib/proof) the pay panel may open with. */
  reaction?: ShownReaction | null;
  /**
   * Group cards are on (the editor's own prop, from the server). A group card's lines on this
   * screen, and its pay panel, are drawn only with it: off, their words are not sent to the browser
   * (src/i18n/client-namespaces.ts, GROUP_WORDS) and the product is not on sale.
   */
  groupEnabled?: boolean;
  /** The monthly idea's setting, from the server (lib/lifecycle/monthly-idea.ts); "off" draws nothing new. */
  ideaMode?: IdeaMode;
}) {
  const t = useTranslations("editor.publishSheet");
  const tCommon = useTranslations("common");
  const tCheckout = useTranslations("money.checkoutErrors");
  const locale = useLocale() as GiftLocale;
  const state = useEditor();
  const search = useSearchParams();
  const [fetchedEntitlement, setFetchedEntitlement] = useState<Awaited<ReturnType<typeof getEntitlement>> | null>(null);
  const entitlement = state.authed ? fetchedEntitlement : { unlocked: false, owned: [], campaign: null, giftsReady: 0, paidJustNow: false };
  const [busy, setBusy] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeQuote | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const autoPublished = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Inside the iPhone app (lib/app/bridge.ts): paying is the App Store's sheet, signing in is the
  // app's, and once the app says a purchase went through the gift goes out as it does back from Stripe.
  const inApp = useInApp();
  // Inside the app or in Etsy mode the monthly idea's notice can't be shown: no box, no line, no enrolment.
  const [etsy] = useEtsyMode();
  const quiet = inApp || etsy;
  const [ideaHintNow, setIdeaHintNow] = useState<IdeaHint>("none");
  const [appUnlocked, setAppUnlocked] = useState(false);
  const signingIn = useRef(false);
  const currency = useCurrency();
  // The price a guest is told before signing in: what this gift's own row costs.
  const priceHint = formatAmount(PRODUCTS[templatePlan(manifest.tier)].amounts[currency], currency, locale);
  // "Send one back" from a paid premium gift opens this editor with ?reply=<token>: the reply is free
  // (footer on, no extras). Only the server can open the token; until it says otherwise at publish,
  // the sheet takes it at its word. A premium template only: a free one is free anyway.
  const replyToken = manifest.tier === "premium" ? replyTokenFrom(search.get("reply")) : undefined;
  // The server said no ("reply_used", "reply_invalid"): the gift goes back to its normal price.
  const [replyRefused, setReplyRefused] = useState<string | null>(null);
  const freeReply = Boolean(replyToken) && replyRefused === null;
  // A running creator-campaign grant that covers this template: free, footer on, no extras
  // (lib/commerce/campaign-rules.ts). The server checks it again at publish.
  const campaign = state.authed && !freeReply && manifest.tier === "premium" && !fetchedEntitlement?.unlocked ? (fetchedEntitlement?.campaign ?? null) : null;
  const [published, setPublished] = useState<{
    shortId: string;
    status: "live" | "scheduled";
    holidayExtra: HolidayExtra | null;
    usedGift?: true;
    /** Sending it started the monthly idea: the line the share screen shows. */
    ideaNotice?: string;
    /** With `usedGift`: gifts ready left after this one. */
    usedLeft: number;
    /** Two more gifts under the link, as it stood when the gift went out (never drawn later: nothing moves). */
    pair: ShareScreenPair | null;
  } | null>(null);
  // "Pay for this one instead": the sender would rather keep their gift ready, or it went meanwhile.
  const [payInstead, setPayInstead] = useState(false);

  // Opening the sheet kicks uploads + a fresh entitlement check.
  useEffect(() => {
    if (!open || !state.authed) return;
    // Anything still waiting on this device goes up now, including files an earlier visit never sent.
    void state.ensureRemote().then(() => useEditor.getState().uploadPending());
    getEntitlement(slug).then(setFetchedEntitlement);
    if (ideaMode === "all") void getIdeaHint(slug).then(setIdeaHintNow).catch(() => {});
    void fetchUpgradeQuote(currency).then(setUpgrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state.authed, slug]);
  // A gift held to the note's rules (lib/gift/free-tier.ts): its photos and a long letter are paid.
  // The Letter can still go out free as a short note; Constellations, made of photos, cannot.
  const note = noteRules(manifest, state.data);
  const noteFree = noteCanBeFree(manifest);
  // Which pay panel a premium gift shows this visitor (lib/editor/pay-sheet-split.ts): decided once,
  // when the editor's send screen first exists, and null where there is no premium price to show.
  const [payPanel] = useState<PayArm>(() => pickPaySheet({ userId: state.userId, search: typeof window === "undefined" ? "" : window.location.search }));
  const payArm: PayArm | null = manifest.tier === "premium" && !freeReply && !campaign && !inApp ? payPanel : null;
  // Which version of the Letter's send screen this visitor is shown (lib/editor/keep-split.ts):
  // only for a note that can also go out free, and never inside the iPhone app.
  const [keepPick] = useState<KeepArm>(() => pickKeep({ userId: state.userId, search: typeof window === "undefined" ? "" : window.location.search }));
  const keepArm: KeepArm | null = note && noteFree && !inApp ? keepPick : null;
  // The account's unlock rows; "a note with photos" is one of them (photos:<slug>).
  const ownedRows = useMemo(() => (state.authed ? (fetchedEntitlement?.owned ?? []) : []), [state.authed, fetchedEntitlement]);
  const photosOwned = ownedRows.includes(photosUnlock(slug));
  const showCheckoutError = useCheckoutError();
  const [keepPaying, setKeepPaying] = useState(false);
  // Which version of the free Letter test this gift is in, for the test's own events; null elsewhere.
  const letterArm = manifest.tier === "free" && NOTE_TEMPLATES.includes(slug) ? (note ? "note" : "classic") : null;
  useEffect(() => {
    if (!open) return;
    track("publish_sheet_shown", { template: slug, tier: manifest.tier, guest: !state.authed });
    if (letterArm) track(freeTestEvent(slug, "sheet", letterArm), { guest: !state.authed });
    if (payArm) track(payArm === "one" ? "pay_sheet_one" : "pay_sheet_classic", { template: slug, guest: !state.authed });
  }, [open, slug, manifest.tier, state.authed, letterArm, payArm]);
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
  const fieldsSchema = mod?.fieldsSchema;
  const problems = useMemo(() => {
    if (!serialized) return ["uploadsPending"];
    const p = readinessProblems(manifest, serialized, fieldsSchema);
    if (uploadsInFlight && !p.includes("uploadsPending")) p.push("uploadsPending");
    return p;
  }, [manifest, serialized, uploadsInFlight, fieldsSchema]);
  // The template's own must-haves, ticked off like the names, then anything else its schema refuses
  // right now: publishing checks the fields too, so nobody pays for a gift that can't be sent.
  const fieldRows = useMemo(() => {
    if (!fieldsSchema) return [];
    const rows = new Map<string, { problem: FieldProblem; bad: boolean }>();
    for (const problem of fieldMustHaves(fieldsSchema)) rows.set(problem.key, { problem, bad: false });
    for (const problem of serialized ? fieldProblems(fieldsSchema, serialized.fields) : []) rows.set(problem.key, { problem, bad: true });
    return [...rows.values()];
  }, [fieldsSchema, serialized]);
  const fieldLabel = (key: string) => mod?.fieldMeta?.[locale]?.[key]?.label ?? humanize(key);
  const fieldTask = ({ key, need, count }: FieldProblem) => t(`problems.fields.${need}`, { label: fieldLabel(key), count: count ?? 0 });
  // What the server refused, when it was the template's own fields: named, so they know what to fix.
  const [refusedFields, setRefusedFields] = useState<string[]>([]);

  const options = {
    removeWatermark: state.removeWatermark,
    schedule: state.schedule.enabled,
    password: state.password.length > 0,
  };
  // Once the note is for everyone, a free gift from before it takes no new photos without the unlock
  // (the server checks the same, app/actions/gift.ts): then the sheet shows the pay panel for it.
  const addsToOldGift = Boolean(
    serialized &&
      state.heldPhotos &&
      state.status !== "draft" &&
      oldFreeGiftAddsPhotos(manifest, { stored: serialized.freeTier, photos: state.heldPhotos.map((url) => ({ url })) }, serialized.photos),
  );
  const decision =
    entitlement && serialized
      ? withOldGiftRule(
          decidePublish(manifest, serialized, { unlocked: entitlement.unlocked, photos: photosOwned, group: hasGroupUnlock(ownedRows, slug) }, { ...options, freeReply, campaign: Boolean(campaign), fieldsSchema }),
          addsToOldGift,
          entitlement.unlocked,
        )
      : null;
  // A group card (a gift carrying notes on a template made for them) that the account hasn't paid
  // for yet: the send screen shows the group card's own price instead of the usual panel.
  const needsGroup = Boolean(decision && !decision.ok && decision.reason === "payment_required" && decision.needs === "group");
  // The template's own rules for a group's notes, for the checklist; none while group cards are off.
  const groupRules = groupEnabled ? manifest.features.group : undefined;
  // What they have already paid for, so the paywall can name it instead of asking again blindly.
  const ownedElsewhere = useMemo(
    () =>
      (state.authed ? (fetchedEntitlement?.owned ?? []) : [])
        .filter((s) => s !== slug && s !== "*")
        .map((s) => getManifest(s))
        .filter((m): m is TemplateManifest => Boolean(m)),
    [fetchedEntitlement, state.authed, slug],
  );
  // What in this gift is paid for, once: named as features for the App Store's sheet, and on the pay
  // panel as what each one does for them ("Your voice saying it", not "a voice message").
  const premiumKeys = [
    // A free reply's template costs nothing: what it's paying for is the rest of the list.
    manifest.tier === "premium" && !freeReply && !campaign && "PremiumTemplate",
    options.removeWatermark && "NoWatermark",
    options.schedule && "Schedule",
    options.password && "Password",
    // New photos on a free gift from before the note: what the pay panel names for it.
    addsToOldGift && "Photos",
    ...(serialized ? premiumExtras(serialized, { note, photosOwned }) : [])
      // The editor calls the surprise "Included" on a premium template: the template is what is paid for there.
      .filter((extra) => extra !== "unwrap" || manifest.tier === "free" || freeReply || Boolean(campaign))
      // Music from outside Ethos; the catalogue song is free (lib/gift/publish.ts).
      .map((extra) => ({ song: "Song", video: "Video", voiceNote: "VoiceNote", morePhotos: "Photos", unwrap: "Unwrap", photos: "AllPhotos", longLetter: "FullLetter" })[extra]),
  ].filter(Boolean) as string[];
  const premiumFeatures = premiumKeys.map((key) => t(`feature${key}`));
  // A premium template and its missing footer say the same for them: once. A note's photos and long
  // letter are the pay panel's own first line (their count), so they aren't listed again under it.
  const premiumBenefits = [...new Set(premiumKeys.filter((key) => !note || (key !== "AllPhotos" && key !== "FullLetter")).map((key) => t(`benefit${key}`)))];
  // What the pay panel of a note opens with, and what the free way out has to take away.
  const noteLetter = noteLength(serialized?.message ?? "");
  const notePaid = note && serialized ? premiumExtras(serialized, { note, photosOwned }) : [];
  const noteOffer =
    note && serialized && notePaid.length > 0
      ? { photos: serialized.photos.length, longLetter: notePaid.includes("longLetter"), thumbs: (state.data?.photos ?? []).slice(0, 4).map((photo) => photo.url) }
      : null;
  const noteOthers = options.removeWatermark || options.schedule || options.password || notePaid.some((extra) => extra !== "photos" && extra !== "longLetter");
  const [strippingNote, setStrippingNote] = useState(false);
  const money = (minor: number) => formatAmount(minor, currency, locale);
  const noteThumbs = (state.data?.photos ?? []).slice(0, 5).map((photo) => photo.url);
  // "A note with photos" can be bought for this gift: the "keep" version, a note of one to five
  // photos with nothing else paid in it, payments on, and not already held.
  const keepPrice =
    keepArm === "keep" && noteOffer && paymentsEnabled && sellsNotePhotos(manifest) && !photosOwned && canKeepPhotos({ photos: noteOffer.photos, longLetter: noteOffer.longLetter, others: noteOthers }, NOTE_PHOTOS_MAX)
      ? money(PRODUCTS.photos.amounts[currency])
      : null;
  // Counted once per opening, per version: a Letter's send screen that holds something paid.
  const pricedNote = Boolean(noteOffer);
  useEffect(() => {
    if (open && keepArm && pricedNote) track(keepArm === "keep" ? "letter_sheet_keep" : "letter_sheet_plain", { guest: !state.authed });
  }, [open, keepArm, pricedNote, state.authed]);
  /** Straight to checkout for one product on this template, from the step that takes the photos out. */
  const payFromKeepStep = async (product: "photos" | "extras") => {
    if (keepPaying) return;
    setKeepPaying(true);
    track(product === "photos" ? "letter_keep_tap" : "letter_keepfull_tap", { guest: !state.authed });
    track("pay_clicked", { template: slug, product, bump: false, second: false, reply: false, guest: !state.authed });
    track("letter_pay_keep", { guest: !state.authed });
    rememberLetterClick("keep");
    const total = product === "photos" ? PRODUCTS.photos.amounts[currency] : extrasAmount(currency, ownedRows, slug);
    const result = await startCheckout({ product, templateSlugs: [slug], currency, returnTo: next, locale }, { total, category: manifest.tier });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    setKeepPaying(false);
    showCheckoutError(result.error);
  };
  // The simpler panel for a premium gift: named for who it is for, with their first photos.
  const oneOffer =
    payArm === "one" && serialized
      ? { name: serialized.recipientName.trim(), photos: serialized.photos.length, thumbs: (state.data?.photos ?? []).slice(0, 4).map((photo) => photo.url) }
      : null;
  /** The free way out of a note's pay panel: everything paid comes out, and the gift goes free. */
  const sendAsNote = async () => {
    setStrippingNote(true);
    track("free_note_chosen", { template: slug, photos: serialized?.photos.length ?? 0, guest: !state.authed });
    if (keepArm) track(keepArm === "keep" ? "letter_free_keep" : "letter_free_plain", { guest: !state.authed });
    try {
      for (const photo of [...useEditor.getState().data.photos]) await state.removePhoto(photo.id);
      if (useEditor.getState().data.video) state.clearVideo();
      if (useEditor.getState().data.voiceNote) state.clearVoiceNote();
      if (useEditor.getState().data.unwrap) state.patch({ unwrap: undefined });
      state.setRemoveWatermark(false);
      state.setPassword("");
      state.setSchedule({ enabled: false });
    } finally {
      setStrippingNote(false);
    }
  };
  /** A letter over the free length is theirs to shorten: back to the form, at the letter. */
  const shortenNote = () => {
    track("free_note_too_long", { template: slug, chars: noteLetter, guest: !state.authed });
    onOpenChange(false);
    window.setTimeout(() => {
      const field = document.getElementById("message");
      field?.scrollIntoView({ block: "center" });
      field?.focus();
    }, 350);
  };

  // The free version's Terms box (lib/lifecycle/monthly-idea.ts): only in the setting "all", for a
  // signed-in account the server says needs it, on a first send that is free and not a reply, a
  // campaign gift, the app or Etsy. Off, none of this draws anything or changes the button.
  const needsTerms = ideaMode === "all" && state.authed && state.status === "draft" && Boolean(decision?.ok) && !freeReply && !campaign && !quiet && ideaHintNow === "box";
  const [termsOn, setTermsOn] = useState(false);
  const [termsNudge, setTermsNudge] = useState(false);
  const termsRef = useRef<HTMLInputElement>(null);
  const termsMissing = needsTerms && !termsOn;
  const termsShown = useRef(false);
  useEffect(() => {
    if (!open) termsShown.current = false;
    else if (needsTerms && !termsShown.current) {
      termsShown.current = true;
      track("free_terms_shown", { template: slug });
    }
  }, [open, needsTerms, slug]);

  const publish = async ({ useGift = false }: { useGift?: boolean } = {}) => {
    // The free version's Terms box isn't ticked: say so, where the box is, and send nothing.
    if (termsMissing && !useGift) {
      setTermsNudge(true);
      termsRef.current?.focus();
      track("free_terms_nudged", { template: slug });
      return;
    }
    setBusy(true);
    setError(null);
    setRefusedFields([]);
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
      ...(useGift ? { useGift: true } : {}),
      ...(quiet ? { quiet: true } : {}),
      ...(needsTerms && termsOn ? { acceptFreeTerms: true } : {}),
    });
    setBusy(false);
    // The gift ready went meanwhile (used in another tab, or refunded): the pay panel, as today.
    if (!result.ok && useGift && result.error === "payment_required") {
      setPayInstead(true);
      void getEntitlement(slug).then(setFetchedEntitlement);
      return;
    }
    // The server says this send needs the box (its answer is newer than the sheet's hint): show it.
    if (!result.ok && result.error === "terms_required") {
      setError(null);
      setTermsNudge(true);
      void getIdeaHint(slug).then(setIdeaHintNow).catch(() => {});
      return;
    }
    if (!result.ok) {
      if (result.error === "reply_used" || result.error === "reply_invalid") setReplyRefused(result.error);
      else setError(result.error);
      const refused = result.error === "invalid_data" ? (result.problems ?? []).filter((path) => path.startsWith("fields.")) : [];
      setRefusedFields([...new Set(refused.map((path) => path.split(".")[1]).filter(Boolean))]);
      return;
    }
    // Notes left out of a group card because they were taken back since this editor last looked: out of its copy too.
    for (const key of result.data.takenBack ?? []) useEditor.getState().removeContribution(key);
    state.markPublished(result.data.shortId, result.data.status);
    // Two more gifts: offered only when this publish followed a payment for this very gift (back from
    // checkout, its own purchase paid in the last day, something in it paid for), drawn from what was
    // loaded while the sheet was open, or not at all.
    // A gift sent on a gift ready gets its line whether or not that load finished (pair-used.tsx).
    const loaded = pairLoaded.current;
    const afterPayment = resume && entitlement?.paidJustNow === true && premiumKeys.length > 0 && !result.data.usedGift;
    const usedLeft = Math.max(0, (entitlement?.giftsReady ?? 1) - 1);
    setPublished({
      ...result.data,
      usedLeft,
      pair: loaded ? { ...loaded, afterPayment, left: usedLeft } : null,
    });
    if (result.data.usedGift) track("gift_ready_used", { template: slug, left: Math.max(0, (entitlement?.giftsReady ?? 1) - 1) });
    // A recipient's own gift going out, the first time it does: the end of the loop a gift starts
    // (lib/attribution/recipient.ts). `state` is this render's, so it still says what the gift was
    // before the line above: a draft. The last word says whether the gift holds something that
    // costs money (a premium template, a paid extra), not whether anyone paid just now: someone who
    // already owns it pays nothing, and a buyer's tab has usually lost its tag by this line
    // (docs/marketing/LOOP-KPI.md).
    if (state.status === "draft") countRecipientGiftSent(new URLSearchParams(window.location.search), slug, premiumKeys.length > 0);
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
    (manifest.tier === "premium" && !freeReply && !campaign) ||
    options.removeWatermark ||
    options.schedule ||
    options.password ||
    addsToOldGift ||
    (serialized ? premiumExtras(serialized, { note, photosOwned }).length > 0 : false);

  // A draft that holds a group's notes, on a template made for them: signed out, it gets the sign-in
  // step and never the guest pay panel, whose prices don't send it (components/pricing/offers.ts).
  // Whether group cards are on or off: the server asks for the group card's own unlock either way.
  const groupDraft = Boolean(manifest.features.group && (serialized?.contributions?.length ?? 0) > 0);
  const guestCanPay = guestPaysOnSheet({ wouldNeedPayment, paymentsEnabled, groupDraft });
  // Which of a group card's own parts this screen draws: none of them while group cards are off.
  const groupShown = groupOnSheet({ groupEnabled, groupDraft, needsGroup });
  // A gift ready (two more gifts) sends this one with nothing to pay, in place of the pay panel; never
  // inside the iPhone app, where the App Store sells. A free reply or a creator's grant covers it already.
  const useGiftReady = state.authed && !inApp && !payInstead && !freeReply && !campaign && (entitlement?.giftsReady ?? 0) > 0;
  // Two more gifts: the card's code and the account's answer are loaded while the sheet is open, for
  // a sender back from paying or about to send on a gift ready, so the share screen has the card in
  // its first frame or never (it sits under the link: arriving later, it would push everything down).
  const pairWanted = open && state.authed && !inApp && (resume || useGiftReady);
  const [pairCard, setPairCard] = useState<Pick<ShareScreenPair, "Card" | "ent" | "saved"> | null>(null);
  const pairLoaded = useRef<Pick<ShareScreenPair, "Card" | "ent" | "saved"> | null>(null);
  useEffect(() => {
    pairLoaded.current = pairCard;
  }, [pairCard]);
  useEffect(() => {
    if (!pairWanted || pairCard) return;
    let live = true;
    // The saved days too, so the card's rows are right in its first frame and never redrawn.
    void Promise.all([fetchEntitlements(), fetchSavedReminders(), import("./two-more-gifts")])
      .then(([ent, saved, mod]) => {
        if (live) setPairCard({ Card: mod.TwoMoreGifts, ent, saved });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pairWanted, pairCard]);
  const opensWhen = state.schedule.enabled && state.schedule.unlockAt ? openingOf(state.schedule.unlockAt, state.schedule.timezone, locale === "es" ? "es" : "en") : null;
  // The "keep" version: the note with and without their photos, the extra row among the options,
  // and what the step that takes the photos out offers.
  const compareOffer =
    keepArm === "keep" && noteOffer && noteOffer.photos > 0 && noteThumbs.length > 0 && serialized
      ? { photo: noteThumbs[0], line: letterOpening(serialized.message), name: serialized.recipientName.trim(), photos: noteOffer.photos }
      : null;
  const keepRow = keepPrice ? { price: keepPrice, max: NOTE_PHOTOS_MAX, busy: keepPaying, onPay: () => void payFromKeepStep("photos") } : null;
  const keepStep =
    keepArm === "keep" && paymentsEnabled
      ? {
          thumbs: noteThumbs,
          price: keepPrice,
          fullPrice: money(extrasAmount(currency, ownedRows, slug)),
          paying: keepPaying,
          onKeep: () => void payFromKeepStep("photos"),
          onKeepFull: () => void payFromKeepStep("extras"),
        }
      : null;
  const askedToSendFree = () => {
    if (keepArm) track(keepArm === "keep" ? "letter_confirm_keep" : "letter_confirm_plain", { guest: !state.authed });
  };
  // "One payment, no subscription" under a free publish read as if sending it cost something.
  const asksForMoney = publishAsksForMoney({ authed: state.authed, supabaseConfigured, inApp, paymentsEnabled, wouldNeedPayment, decision, giftReady: useGiftReady });
  // Guests can't upload before they have an account; those uploads run right after payment.
  const guestProblems = problems.filter((p) => p !== "uploadsPending");
  // The simpler panel folds a finished checklist into one line; anything still missing opens it again.
  const checklistDone = payArm === "one" && (state.authed ? problems : guestProblems).length === 0;

  // Back from Stripe, signed in, everything in place: one less tap.
  // (Never past an unticked Terms box: termsMissing is declared above, with the box.)
  const canAutoPublish =
    !termsMissing &&
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
            holidayExtra={published.holidayExtra}
            usedGift={published.usedGift === true}
            usedLeft={published.usedLeft}
            pair={published.pair}
            ideaNotice={published.ideaNotice ?? null}
            ideaBox={ideaMode === "optin" || ideaMode === "buyers"}
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
              {checklistDone ? (
                <p className="flex items-center gap-2 text-sm text-ink" data-testid="publish-checklist-done">
                  <Check aria-hidden="true" className="size-4 shrink-0 text-moss" />
                  {t("checklistDone", { count: serialized?.photos.length ?? 0 })}
                </p>
              ) : (
                <p className="mb-3 text-eyebrow text-ink-soft">{t("checklist")}</p>
              )}
              <ul className={cn("divide-y divide-border rounded-2xl border border-border bg-card", checklistDone && "hidden")} data-testid="publish-checklist">
                {(["recipientName", "senderName", "message"] as const).map((key) => (
                  <ChecklistItem key={key} bad={problems.includes(key)} label={t(`problems.${key}`)} />
                ))}
                {fieldRows.map(({ problem, bad }) => (
                  <ChecklistItem key={`fields.${problem.key}`} bad={bad} label={fieldTask(problem)} />
                ))}
                {(["photosMin", "uploadsPending"] as const)
                  // A template that needs no photos has nothing to tick off for them.
                  // A note goes out without photos (lib/gift/free-tier.ts): it has no photo row to tick.
                  .filter((key) => (state.authed || key !== "uploadsPending") && (key !== "photosMin" || (manifest.features.photos.min > 0 && !(note && noteFree))))
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
                    return <ChecklistItem key={key} bad={bad} spinning={key === "uploadsPending" && !stuck} label={label} />;
                  })}
                {/* A group card: the template's own number of notes, and anything about them that stops it going out. */}
                {groupRules
                  ? (["contributionsMin", "contributionsMax", "contributionNote"] as const)
                      .filter((key) => problems.includes(key) || (key === "contributionsMin" && groupRules.min > 0))
                      .map((key) => <ChecklistItem key={key} bad={problems.includes(key)} label={t(`problems.${key}`, { min: groupRules.min, max: key === "contributionNote" ? groupRules.noteMax : groupRules.max })} />)
                  : null}
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
                features={premiumBenefits}
                reaction={reaction}
                returnTo={next}
                freeReply={freeReply}
                upgrade={null}
                blocked={guestProblems.length > 0}
                onSignInInstead={() => setShowSignIn(true)}
                note={noteOffer}
                letterArm={letterArm}
                one={oneOffer}
                payArm={payArm}
                compare={compareOffer}
                keepArm={keepArm}
                keepRow={keepRow}
                ownedRows={ownedRows}
                ideaWhere={ideaMode === "all" || ideaMode === "buyers"}
              />
            ) : null}
            {noteOffer && noteFree && !state.authed && supabaseConfigured && !inApp && guestCanPay && !showSignIn ? (
              <FreeNoteOption photos={noteOffer.photos} chars={noteLetter} max={FREE_NOTE_MAX_CHARS} others={noteOthers} busy={strippingNote} onShorten={shortenNote} onSendFree={sendAsNote} onAsk={askedToSendFree} keep={keepStep} />
            ) : null}
            {!state.authed && supabaseConfigured && !inApp && (!guestCanPay || showSignIn) ? (
              <section className="mt-7 rounded-xl border border-line bg-card p-5" data-testid="publish-sign-in">
                <p className="font-display text-xl">{t("signInTitle")}</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  {groupShown.signIn === "group"
                    ? t("signInBlurbGroup")
                    : groupShown.signIn === "plain"
                      ? t("signInBlurb")
                      : wouldNeedPayment && paymentsEnabled
                        ? t("signInBlurbPaid", { price: priceHint })
                        : freeReply
                          ? t("signInBlurbFreeReply")
                          : t("signInBlurb")}
                </p>
                {/* The card has its own title and blurb: no second "Welcome back" to a first-time guest (walk-make-8). */}
                <AuthForm mode="login" next={next} compact bare />
                {ideaMode === "all" || (ideaMode === "buyers" && wouldNeedPayment && paymentsEnabled) ? <IdeaWhereNote className="mt-3 text-center text-balance" /> : null}
              </section>
            ) : null}

            {state.authed && groupShown.pay === "panel" ? (
              <GroupPayPanel manifest={manifest} currency={currency} locale={locale} ownedRows={ownedRows} returnTo={next} paymentsEnabled={paymentsEnabled} inApp={inApp} />
            ) : state.authed && groupShown.pay === "not_on_sale" ? (
              // A draft that holds a group's notes, opened while group cards are off: there is nothing
              // to buy, so no price and no button, only what checkout itself would answer.
              <Notice tone="info" className="mt-7" data-testid="group-not-on-sale">
                {tCheckout("notOnSale")}
              </Notice>
            ) : state.authed && decision && !decision.ok && decision.reason === "payment_required" && useGiftReady ? (
              <AlreadyPaid
                ready={entitlement?.giftsReady ?? 0}
                thumbs={(state.data?.photos ?? []).slice(0, 4).map((photo) => photo.url)}
                photos={serialized?.photos.length ?? 0}
                name={state.data.recipientName.trim()}
                opensWhen={opensWhen}
                busy={busy}
                onSend={() => void publish({ useGift: true })}
                onPayInstead={() => setPayInstead(true)}
              />
            ) : state.authed && decision && !decision.ok && decision.reason === "payment_required" ? (
              paymentsEnabled || inApp ? (
                <Paywall
                  manifest={manifest}
                  currency={currency}
                  locale={locale}
                  guest={false}
                  features={premiumBenefits}
                  reaction={reaction}
                  returnTo={next}
                  freeReply={freeReply}
                  upgrade={upgrade}
                  blocked={false}
                  ownedElsewhere={ownedElsewhere}
                  onAppUnlock={unlockInApp}
                  note={noteOffer}
                  letterArm={letterArm}
                  one={oneOffer}
                  payArm={payArm}
                  compare={compareOffer}
                  keepArm={keepArm}
                  keepRow={keepRow}
                  ownedRows={ownedRows}
                  ideaWhere={ideaMode === "all" || ideaMode === "buyers"}
                />
              ) : (
                <Notice tone="info" className="mt-7">
                  {t("paymentSoon")}
                </Notice>
              )
            ) : null}
            {noteOffer && noteFree && state.authed && !needsGroup && decision && !decision.ok && decision.reason === "payment_required" ? (
              <FreeNoteOption photos={noteOffer.photos} chars={noteLetter} max={FREE_NOTE_MAX_CHARS} others={noteOthers} busy={strippingNote} onShorten={shortenNote} onSendFree={sendAsNote} onAsk={askedToSendFree} keep={keepStep} />
            ) : null}

            {/* Only when the reply is what makes it free: someone who owns the template sends it without the footer. */}
            {freeReply && decision?.ok && !entitlement?.unlocked ? (
              <Notice tone="info" className="mt-6">
                {t.rich("freeReply", { name: state.data.recipientName || "…", who: keepAsWritten })}
              </Notice>
            ) : null}
            {campaign && decision?.ok ? (
              <Notice tone="info" className="mt-6">
                {t("campaign", { left: campaign.left, limit: CAMPAIGN_GIFT_LIMIT })}
              </Notice>
            ) : null}
            {replyRefused ? (
              <Notice tone="warn" className="mt-6">
                {t(replyRefused === "reply_used" ? "freeReplyUsed" : "freeReplyInvalid")}
              </Notice>
            ) : null}
            {error ? (
              <Notice tone="warn" className="mt-6">
                {refusedFields.length ? t("errorFields", { fields: refusedFields.map(fieldLabel).join(", ") }) : t("error", { error })}
              </Notice>
            ) : null}

            {needsTerms ? (
              <FreeTermsBox
                checked={termsOn}
                onChange={(v) => {
                  setTermsOn(v);
                  if (v) {
                    setTermsNudge(false);
                    track("free_terms_ticked", { template: slug });
                  }
                }}
                nudge={termsNudge}
                inputRef={termsRef}
              />
            ) : null}
            <Button
              className={cn(
                needsTerms ? "mt-4" : "mt-8",
                "h-12 w-full rounded-full text-base",
                termsMissing && "opacity-50",
                ((decision && !decision.ok && decision.reason === "payment_required") ||
                  (!state.authed && guestCanPay && !showSignIn) ||
                  (!state.authed && inApp) ||
                  // Under the sign-in card a disabled "Publish now" does nothing (walk-make-8).
                  (!state.authed && supabaseConfigured)) &&
                  "hidden",
              )}
              disabled={
                !supabaseConfigured || !state.authed || busy || problems.length > 0 || !decision?.ok
              }
              aria-disabled={termsMissing || undefined}
              aria-describedby={termsNudge && needsTerms ? "free-terms-nudge" : undefined}
              onClick={() => void publish()}
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
            {asksForMoney && groupShown.pay !== "not_on_sale" ? (
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

/** The letter's opening as plain words (its bold and italic marks taken off), for the pay panel's two small pictures. */
function letterOpening(message: string): string {
  return message
    .replace(/[*_~`]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function ChecklistItem({ bad, spinning = false, label }: { bad: boolean; spinning?: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3 text-sm", bad ? "text-ink" : "text-muted-foreground line-through decoration-moss/60")}>
      {bad ? (
        spinning ? (
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
}

function Notice({
  tone,
  className,
  children,
  "data-testid": testId,
}: {
  tone: "warn" | "info";
  className?: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div
      data-testid={testId}
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
