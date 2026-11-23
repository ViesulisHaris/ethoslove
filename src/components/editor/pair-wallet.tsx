"use client";

import { useEffect, useRef } from "react";
import { CheckoutElementsProvider, ExpressCheckoutElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { stripeFor } from "@/components/pricing/wallet";

export type WalletEvents = {
  /** Stripe has drawn a wallet button. */
  onReady: () => void;
  /** Stripe says there is no wallet here after all, or its button could not load. */
  onNone: () => void;
  /** The buyer tapped the button (before the wallet's own sheet). */
  onStart: () => void;
  /** The payment went through. */
  onPaid: () => void;
  /** The payment was refused. */
  onDeclined: () => void;
};

/**
 * Stripe's own Apple Pay / Google Pay button for two more gifts, on a session the server made for
 * it (api/stripe/checkout, `oneTap`). Loaded only when the card is in view, the browser has a wallet
 * and there is an offer (components/editor/two-more-gifts.tsx), so none of Stripe's code reaches
 * anyone else. The payment confirms in place: no page is left, and the card turns into "Two gifts
 * are ready." A cancelled wallet sheet is no error and changes nothing.
 */
export function PairWallet({ clientSecret, publishableKey, locale, events }: { clientSecret: string; publishableKey: string; locale: "en" | "es"; events: WalletEvents }) {
  return (
    <CheckoutElementsProvider key={clientSecret} stripe={stripeFor(publishableKey, locale)} options={{ clientSecret }}>
      <Button events={events} />
    </CheckoutElementsProvider>
  );
}

function Button({ events }: { events: WalletEvents }) {
  const checkout = useCheckoutElements();
  // Said once each: Stripe may repeat itself as the screen re-renders.
  const said = useRef(false);
  const failed = checkout.type === "error";
  useEffect(() => {
    if (failed && !said.current) {
      said.current = true;
      events.onNone();
    }
  }, [failed, events]);
  if (checkout.type === "error") return null;
  return (
    <ExpressCheckoutElement
      options={{
        paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
        buttonType: { applePay: "plain", googlePay: "plain" },
        buttonHeight: 48,
        buttonTheme: undefined,
        layout: undefined,
        paymentMethodOrder: undefined,
      }}
      onAvailablePaymentMethodsChange={(event) => {
        if (said.current) return;
        said.current = true;
        if (event.paymentMethods) events.onReady();
        else events.onNone();
      }}
      onConfirm={async (event) => {
        if (checkout.type !== "success") return;
        events.onStart();
        // In place when no bank page is needed: the share screen stays where it is.
        const result = await checkout.checkout.confirm({ expressCheckoutConfirmEvent: event, redirect: "if_required" });
        if (result.type === "error") events.onDeclined();
        else events.onPaid();
      }}
    />
  );
}
