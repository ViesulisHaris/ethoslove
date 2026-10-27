"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { CheckoutElementsProvider, ExpressCheckoutElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import type { GiftLocale } from "@/lib/gift/schema";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics/track";
import { adTrack } from "@/lib/analytics/ads";
import { consentSentence } from "@/lib/stripe/line-items";
import { startOneTapCheckout, useCheckoutError } from "@/components/pricing/checkout";
import type { CheckoutRequest } from "@/components/pricing/offers";
import { Link } from "@/i18n/navigation";

type Wallet = "apple" | "google";

/**
 * The wallet this browser can pay with, as far as the page can tell without loading Stripe: Apple
 * Pay where Safari says it can, Google Pay in Chrome on Android. Never inside Instagram's or
 * Facebook's own browser: Apple Pay is switched off there, and so is Google Pay in an Android web
 * view, so the buttons would never come. Stripe makes the final call once its button loads.
 */
export function walletHere(): Wallet | null {
  const w = window as Window & { ApplePaySession?: { canMakePayments?: () => boolean } };
  try {
    if (w.ApplePaySession?.canMakePayments?.()) return "apple";
  } catch {
    // Some web views define it and then refuse the call.
  }
  const ua = navigator.userAgent;
  if (/Android/i.test(ua) && /Chrome\//.test(ua) && !/; wv\)|FBAN|FBAV|FB_IAB|Instagram|Line\//.test(ua)) return "google";
  return null;
}

/** Offered to everyone once NEXT_PUBLIC_ONE_TAP is "on"; before that, only on an editor opened with ?onetap=1. */
function offered(): boolean {
  return env.oneTap || new URLSearchParams(window.location.search).get("onetap") === "1";
}

// Stripe.js loads only once someone ticks the box: nothing of Stripe's runs on the pay sheet before.
let stripePromise: Promise<StripeJs | null> | null = null;
function stripeFor(key: string, locale: GiftLocale): Promise<StripeJs | null> {
  stripePromise ??= loadStripe(key, { locale });
  return stripePromise;
}

type Sale = { template: string; product: string; bump: boolean; second: boolean; reply: boolean; guest: boolean; total: number; category: string; currency: string };

/**
 * One-tap Apple Pay or Google Pay on the pay sheet, under the pay button that opens Stripe's page.
 * Stripe's own page asks for the withdrawal tickbox; here nothing of Stripe's would, so the box is
 * ours and comes first: the button appears once it is ticked, from a session the server makes only
 * then (api/stripe/checkout, `oneTap`). Paying sends the buyer to the same success page as Stripe's
 * page does, so the gift publishes itself the same way.
 */
export function OneTapPay({ request, locale, disabled, sale }: { request: CheckoutRequest; locale: GiftLocale; disabled: boolean; sale: Sale }) {
  const t = useTranslations("editor.publishSheet");
  const key = env.stripePublishableKey;
  // Rendered in the browser only (the pay sheet loads this with ssr: false), so this reads the page.
  const [wallet] = useState<Wallet | null>(() => (offered() ? walletHere() : null));
  const [ticked, setTicked] = useState(false);
  // One session per plan and bump: changing either asks for a new one, which the button re-mounts on.
  const want = JSON.stringify(request);
  const [session, setSession] = useState<{ want: string; secret: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const showCheckoutError = useCheckoutError();

  const ready = session?.want === want ? session.secret : null;
  const asking = ticked && !disabled && !ready && failed !== want;
  useEffect(() => {
    if (!asking) return;
    let live = true;
    startOneTapCheckout(request).then((result) => {
      if (!live) return;
      if ("clientSecret" in result) setSession({ want, secret: result.clientSecret });
      else {
        setFailed(want);
        showCheckoutError(result.error);
      }
    });
    return () => {
      live = false;
    };
    // `want` stands for `request`: the same request asks once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asking, want]);

  if (!wallet || !key) return null;
  return (
    <div className="mt-4" data-testid="one-tap">
      <p className="flex items-center gap-3 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        {wallet === "apple" ? t("oneTapApple") : t("oneTapGoogle")}
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </p>
      {/* The sentence Stripe's page shows by its own tickbox, word for word (lib/stripe/line-items.ts). */}
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-left text-xs leading-relaxed text-ink-soft">
        <input
          type="checkbox"
          checked={ticked}
          disabled={disabled}
          onChange={(e) => setTicked(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-coral"
          data-testid="one-tap-consent"
        />
        <span>
          {consentSentence(request.product, locale)}{" "}
          <Link href="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-ink">
            {t("oneTapTerms")}
          </Link>
        </span>
      </label>
      {ticked && !disabled ? (
        ready ? (
          <div className="mt-3 min-h-12">
            <CheckoutElementsProvider key={ready} stripe={stripeFor(key, locale)} options={{ clientSecret: ready }}>
              <Buttons sale={sale} onError={() => showCheckoutError("checkout")} />
            </CheckoutElementsProvider>
          </div>
        ) : failed === want ? null : (
          <p className="mt-3 flex min-h-12 items-center justify-center" role="status">
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
          </p>
        )
      ) : null}
    </div>
  );
}

function Buttons({ sale, onError }: { sale: Sale; onError: () => void }) {
  const t = useTranslations("editor.publishSheet");
  const checkout = useCheckoutElements();
  // Stripe says, once its button has looked, whether there is one to show here after all.
  const [none, setNone] = useState(false);
  if (checkout.type === "error") return <p className="text-center text-sm text-ink">{t("oneTapNone")}</p>;
  return (
    <>
      <ExpressCheckoutElement
        options={{
          paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
          buttonType: { applePay: "buy", googlePay: "buy" },
          buttonHeight: 48,
          buttonTheme: undefined,
          layout: undefined,
          paymentMethodOrder: undefined,
        }}
        onAvailablePaymentMethodsChange={(event) => setNone(!event.paymentMethods)}
        onConfirm={async (event) => {
          if (checkout.type !== "success") return;
          track("pay_clicked", { template: sale.template, product: sale.product, bump: sale.bump, second: sale.second, reply: sale.reply, guest: sale.guest, oneTap: true });
          adTrack({ name: "InitiateCheckout", contents: [{ id: sale.template, category: sale.category }], value: sale.total / 100, currency: sale.currency.toUpperCase() });
          const result = await checkout.checkout.confirm({ expressCheckoutConfirmEvent: event });
          if (result.type === "error") onError();
        }}
      />
      {none ? <p className="text-center text-sm text-muted-foreground">{t("oneTapNone")}</p> : null}
    </>
  );
}
