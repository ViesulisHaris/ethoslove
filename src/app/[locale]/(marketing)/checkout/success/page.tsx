import type { Metadata } from "next";
import { Check, Clock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStripe } from "@/lib/stripe/server";
import { accountCreatedByCheckout, fulfilCheckoutSession, readSession, type Fulfilment, type Sold } from "@/lib/stripe/fulfil";
import { redeemUrl } from "@/lib/commerce/db";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { InviteLink } from "@/components/pricing/invite-link";
import { purchaseOutcome, safeReturnPath } from "@/components/pricing/offers";
import { AutoContinue, GiftCardCode, TrackPurchase } from "./after-payment";

export const metadata: Metadata = { robots: { index: false } };

/** A guest's session may sign that browser in only this soon after it was created. */
const GUEST_SIGN_IN_WINDOW_S = 30 * 60;

const isFresh = (createdAtSeconds: number) => Date.now() / 1000 - createdAtSeconds < GUEST_SIGN_IN_WINDOW_S;

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  const { session_id, return: back } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const tm = await getTranslations("money.success");
  const user = await getCurrentUser();
  const stripe = getStripe();
  const lang = locale === "es" ? "es" : "en";

  const returnTo = safeReturnPath(typeof back === "string" ? back : null, "/dashboard");

  let state: "paid" | "pending" | "error" | "signin" = "error";
  let signInUrl: string | null = null;
  let sold: Sold | null = null;
  let result: Fulfilment | null = null;
  // Whether this page may show what the purchase hands over (a gift card code, a partner invite):
  // both work for whoever holds them. The signed-in buyer, always; a guest's session id only while
  // it may also sign this browser in. After that the email that went with it carries them.
  let mayReveal = false;
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
          const tokenHash = link?.properties?.hashed_token;
          if (tokenHash)
            signInUrl = `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(returnTo)}`;
          else state = "signin";
        }
      } else if (user && session.metadata?.user_id === user.id) {
        result = await fulfilCheckoutSession(session);
        state = result.ok ? "paid" : session.payment_status === "unpaid" ? "pending" : "error";
        mayReveal = result.ok;
      }
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
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  const giftCardCode = mayReveal ? result?.giftCardCode : undefined;
  const invite = mayReveal && paid && outcome === "pass" && pass && !pass.partnerJoined ? result?.passInviteUrl : undefined;

  const copy = (() => {
    if (!paid) return { title: t(`${state}.title`), detail: t(`${state}.detail`) };
    switch (outcome) {
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
  // the one-time sign-in, a signed-in buyer directly. A pass or a gift card has something to hand
  // over here first (the invite link, the code), so that page waits for a tap.
  const autoContinue = state === "paid" && outcome !== "pass" && outcome !== "giftcard" && (signInUrl !== null || returnTo.startsWith("/create/") || /^\/es\/create\//.test(returnTo));
  const giftCardUrl = paid && outcome === "giftcard" && giftCardCode ? new URL(redeemUrl(giftCardCode, lang)) : null;
  const continueLabel = returnTo.startsWith("/create/") ? tm("toGift") : returnTo.startsWith("/account") ? tm("toAccount") : t("continue");

  return (
    <div className="container-narrow flex flex-col items-center py-24 text-center">
      {paid && sold && typeof session_id === "string" ? <TrackPurchase sessionId={session_id} product={sold.product} bump={sold.bump} /> : null}
      <div className={state === "pending" ? "grid size-16 place-items-center rounded-full bg-gold/15" : "grid size-16 place-items-center rounded-full bg-moss/10"}>
        {state === "pending" ? <Clock className="size-7 text-gold-deep" /> : <Check className="size-7 text-moss" />}
      </div>
      <h1 className="mt-6 display-lg">{copy.title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{copy.detail}</p>

      {giftCardUrl && giftCardCode ? (
        <GiftCardCode code={giftCardCode} redeemUrl={giftCardUrl.toString()} redeemAt={`${giftCardUrl.host}${giftCardUrl.pathname}`} />
      ) : null}
      {invite ? <InviteLink url={invite} className="mt-8 w-full max-w-sm text-left" /> : null}

      {autoContinue ? <AutoContinue href={continueHref} /> : null}
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
    </div>
  );
}
