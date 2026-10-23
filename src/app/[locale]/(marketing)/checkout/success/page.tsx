import type { Metadata } from "next";
import { ArrowRight, Check, Clock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStripe } from "@/lib/stripe/server";
import { accountCreatedByCheckout, fulfilCheckoutSession, readSession, sessionUserId, type Fulfilment, type Sold } from "@/lib/stripe/fulfil";
import { redeemUrl } from "@/lib/commerce/db";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { InviteLink } from "@/components/pricing/invite-link";
import { purchaseOutcome, safeReturnPath } from "@/components/pricing/offers";
import { BackToGift, UpgradeAfterPurchase } from "@/components/pricing/upgrade-after-purchase";
import { membershipSuccess, readStartedMembership, type StartedRead } from "@/components/membership/success";
import { isFresh, upgradeAfterCheckout, type UpgradeAfter } from "@/lib/commerce/after-checkout";
import { AutoContinue, GiftCardCode, RefreshWhileArriving, TrackPurchase } from "./after-payment";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  const { session_id, return: back } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const tm = await getTranslations("money.success");
  const tf = await getTranslations("membership.success");
  const user = await getCurrentUser();
  const stripe = getStripe();
  const lang = locale === "es" ? "es" : "en";

  const returnTo = safeReturnPath(typeof back === "string" ? back : null, "/dashboard");

  let state: "paid" | "pending" | "error" | "signin" = "error";
  let signInUrl: string | null = null;
  // The guest's one-time sign-in, kept so each of Ethos for Two's two buttons can go through it.
  let tokenHash: string | null = null;
  const through = (hash: string, next: string) => `/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=magiclink&next=${encodeURIComponent(next)}`;
  let sold: Sold | null = null;
  let result: Fulfilment | null = null;
  // Whether this page may show what the purchase hands over (a gift card code, a partner invite):
  // both work for whoever holds them. The signed-in buyer, always; a guest's session id only while
  // it may also sign this browser in. After that the email that went with it carries them.
  let mayReveal = false;
  // "Every template for the difference", for a buyer this browser is (or is about to be signed in
  // as): never on a page that asks them to sign in first.
  let upgrade: UpgradeAfter | null = null;
  if (stripe && typeof session_id === "string") {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      sold = readSession(session);
      if (session.metadata?.guest === "1") {
        // Guest checkout: fulfil, then sign this browser in as the buyer. The session id only
        // ever reaches the buyer's browser (Stripe redirects there), and the window is short.
        // Stripe never verifies the email typed at checkout, so this only ever signs in to an
        // account the same checkout created; an existing account's owner signs in as usual.
        result = await fulfilCheckoutSession(session);
        state = result.ok ? "paid" : session.payment_status === "unpaid" ? "pending" : "error";
        const fresh = isFresh(session.created);
        mayReveal = result.ok && (user?.id === result.userId || fresh);
        if (result.ok && result.email && result.userId && user?.id !== result.userId) {
          const admin = getSupabaseAdminClient();
          const { data: link } =
            admin && fresh && (await accountCreatedByCheckout(result.userId, session.id))
              ? await admin.auth.admin.generateLink({ type: "magiclink", email: result.email })
              : { data: null };
          tokenHash = link?.properties?.hashed_token ?? null;
          if (tokenHash) signInUrl = through(tokenHash, returnTo);
          else state = "signin";
        }
        // A membership is bought as ethos_user_id, everything else as user_id (docs/MEMBERSHIP.md 2.1, R1).
      } else if (user && sessionUserId(session) === user.id) {
        result = await fulfilCheckoutSession(session);
        state = result.ok ? "paid" : session.payment_status === "unpaid" ? "pending" : "error";
        mayReveal = result.ok;
      }
      const buyerHere = result?.userId && (user?.id === result.userId || signInUrl !== null) ? result.userId : null;
      if (state === "paid" && sold && buyerHere) upgrade = await upgradeAfterCheckout(session, sold, buyerHere);
    } catch {
      state = "error";
    }
  }

  const paid = state === "paid" || state === "signin";
  const outcome = sold && paid ? purchaseOutcome(sold) : "gift";
  // Where "Continue" leads: through the one-time sign-in when there is one, then back.
  const continueHref = signInUrl ?? returnTo;

  // Pass: the year this purchase bought, read by purchase so it is right for a renewal too (a
  // renewal's row starts where the running year ends, and keeps the partner who already joined).
  let pass: { endsAt: string; partnerJoined: boolean } | null = null;
  if (paid && sold && outcome === "pass") {
    const admin = getSupabaseAdminClient();
    const { data } = admin
      ? await admin.from("couple_passes").select("ends_at, partner_user_id").eq("purchase_id", sold.purchaseId).maybeSingle()
      : { data: null };
    if (data) pass = { endsAt: data.ends_at, partnerJoined: Boolean(data.partner_user_id) };
  }
  // Ethos for Two as a subscription: the row this checkout started, read by purchase the same way,
  // for the plan and the day it renews (components/membership/success.ts). A bank still confirming
  // the first payment, a row not written yet and a read that failed each say something different:
  // only the first is a payment being processed.
  const forTwo = sold?.product === "membership";
  let started: StartedRead | null = null;
  if (paid && sold && outcome === "membership") {
    const admin = getSupabaseAdminClient();
    const purchaseId = sold.purchaseId;
    started = admin
      ? await readStartedMembership(() => admin.from("couple_passes").select("plan, status, current_period_end, partner_user_id").eq("purchase_id", purchaseId).maybeSingle())
      : { kind: "unreadable" };
  }
  const forTwoState = forTwo && (paid || state === "pending") ? membershipSuccess(state === "pending", started) : null;
  const membership = forTwoState?.kind === "on" ? forTwoState : null;
  const processing = forTwoState?.kind === "processing";
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  const giftCardCode = mayReveal ? result?.giftCardCode : undefined;
  const invite =
    mayReveal && paid && ((outcome === "pass" && pass && !pass.partnerJoined) || (outcome === "membership" && membership && !membership.partnerJoined))
      ? result?.passInviteUrl
      : undefined;

  const copy = (() => {
    if (processing) return { title: t("pending.title"), detail: tf("processing") };
    if (forTwoState?.kind === "arriving") return { title: tf("arriving.title"), detail: tf("arriving.detail") };
    if (forTwoState?.kind === "unreadable") return { title: tf("unreadable.title"), detail: tf("unreadable.detail") };
    if (!paid) return { title: t(`${state}.title`), detail: t(`${state}.detail`) };
    switch (outcome) {
      case "membership": {
        if (!membership?.renewsOn) return { title: tf("title"), detail: tf(invite ? "noDate" : "noDateEmailed") };
        // "The link below" only when it is below; otherwise it went out with the welcome email.
        return { title: tf("title"), detail: tf(invite ? "detail" : "emailed", { plan: tf(membership.plan), date: longDate(membership.renewsOn) }) };
      }
      case "pass":
        if (!pass) return { title: tm("pass.title"), detail: tm("passLater") };
        if (pass.partnerJoined) return { title: tm("passJoined.title"), detail: tm("passJoined.detail", { date: longDate(pass.endsAt) }) };
        // "The link below" only when it is below; otherwise it went out in the pass's welcome email.
        return { title: tm("pass.title"), detail: tm(invite ? "pass.detail" : "passEmailed", { date: longDate(pass.endsAt) }) };
      case "giftcard":
        return { title: tm("giftcard.title"), detail: giftCardCode ? tm("giftcard.detail") : tm("giftcardWaiting") };
      case "everything":
        return { title: tm("everything.title"), detail: tm("everything.detail") };
      case "pack":
        return { title: tm("pack.title"), detail: tm("pack.detail") };
      default:
        return state === "signin" ? { title: t("signin.title"), detail: t("signin.detail") } : { title: t("paid.title"), detail: t("paid.detail") };
    }
  })();
  // Whoever bought for a gift goes straight back to it, where it publishes itself: a guest through
  // the one-time sign-in, a signed-in buyer directly. A pass, a membership or a gift card has
  // something to hand over here first (the invite link, the code), and the upgrade has something to
  // say, so those pages wait for a tap, with the way back to the gift first.
  const autoContinue =
    state === "paid" &&
    !upgrade &&
    outcome !== "pass" &&
    outcome !== "membership" &&
    outcome !== "giftcard" &&
    (signInUrl !== null || returnTo.startsWith("/create/") || /^\/es\/create\//.test(returnTo));
  const giftCardUrl = paid && outcome === "giftcard" && giftCardCode ? new URL(redeemUrl(giftCardCode, lang)) : null;
  const continueLabel = returnTo.startsWith("/create/") ? tm("toGift") : returnTo.startsWith("/account") ? tm("toAccount") : t("continue");
  // Ethos for Two's two ways on: the first date, or the account (where the partner's link also is).
  const member = forTwo && (paid || state === "pending") && state !== "signin";
  const memberHref = (next: string) => (tokenHash ? through(tokenHash, lang === "es" ? `/es${next}` : next) : next);

  return (
    <div className="container-narrow flex flex-col items-center py-24 text-center">
      {paid && sold && typeof session_id === "string" ? <TrackPurchase sessionId={session_id} product={sold.product} bump={sold.bump} /> : null}
      {membership ? (
        // The membership's own colours (docs/MEMBERSHIP.md 4.1): a starlight check on the dusk.
        <div className="grid size-16 place-items-center rounded-full bg-dusk shadow-dusk-seal ring-4 ring-starlight/25" data-testid="membership-success">
          <Check aria-hidden="true" className="size-7 text-starlight" strokeWidth={2.6} />
        </div>
      ) : forTwoState && forTwoState.kind !== "processing" ? (
        // Paid, and on its way or on the account page: the dusk seal, with the clock of a moment's wait.
        <div className="grid size-16 place-items-center rounded-full bg-dusk shadow-dusk-seal ring-4 ring-starlight/25" data-testid={`membership-${forTwoState.kind}`}>
          <Clock aria-hidden="true" className="size-7 text-starlight" strokeWidth={2.4} />
        </div>
      ) : (
        <div className={state === "pending" || processing ? "grid size-16 place-items-center rounded-full bg-gold/15" : "grid size-16 place-items-center rounded-full bg-moss/10"}>
          {state === "pending" || processing ? <Clock aria-hidden="true" className="size-7 text-gold-deep" /> : <Check aria-hidden="true" className="size-7 text-moss" />}
        </div>
      )}
      <h1 className="mt-6 display-lg">{copy.title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{copy.detail}</p>

      {giftCardUrl && giftCardCode ? (
        <GiftCardCode code={giftCardCode} redeemUrl={giftCardUrl.toString()} redeemAt={`${giftCardUrl.host}${giftCardUrl.pathname}`} />
      ) : null}
      {invite ? <InviteLink url={invite} className="mt-8 w-full max-w-sm text-left" /> : null}
      {forTwoState?.kind === "arriving" ? <RefreshWhileArriving /> : null}

      {autoContinue ? <AutoContinue href={continueHref} /> : null}
      {member ? (
        <div className="mt-8 grid w-full max-w-sm gap-2.5">
          {/* The one-time sign-in lives outside the locale routes: plain links, not the i18n ones. */}
          {tokenHash ? (
            <>
              <a href={memberHref("/dates")} className="btn-star inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold">
                {tf("planFirst")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a href={memberHref("/account")} className="inline-flex h-12 items-center justify-center rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
                {tf("toAccount")}
              </a>
            </>
          ) : (
            <>
              <Link href="/dates" className="btn-star inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold">
                {tf("planFirst")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/account" className="inline-flex h-12 items-center justify-center rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
                {tf("toAccount")}
              </Link>
            </>
          )}
        </div>
      ) : upgrade && signInUrl && typeof session_id === "string" ? (
        // A guest with the card: signed in when they tap, not by the page's own link (BackToGift).
        <BackToGift sessionId={session_id} returnTo={returnTo} label={continueLabel} />
      ) : (
        <Button asChild className="mt-8 h-12 rounded-full px-6">
          {state === "signin" ? (
            <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>{t("signIn")}</Link>
          ) : signInUrl ? (
            // The one-time sign-in lives outside the locale routes: a plain link, not the i18n one.
            <a href={continueHref}>{continueLabel}</a>
          ) : (
            <Link href={continueHref}>{continueLabel}</Link>
          )}
        </Button>
      )}
      {upgrade && typeof session_id === "string" ? (
        <UpgradeAfterPurchase
          sessionId={session_id}
          returnTo={returnTo}
          upgrade={{ ...upgrade.offer, full: upgrade.full, paid: upgrade.paid, earlier: upgrade.earlier, sorted: upgrade.sorted, ahead: upgrade.ahead }}
        />
      ) : null}
    </div>
  );
}
