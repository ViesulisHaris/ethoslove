"use client";

import type { Stripe as StripeJs } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";

export type Wallet = "apple" | "google";

/**
 * The wallet this browser can pay with, as far as the page can tell without loading Stripe: Apple
 * Pay where Safari says it can, Google Pay in Chrome on Android. Never inside Instagram's or
 * Facebook's own browser: Apple Pay is switched off there, and so is Google Pay in an Android web
 * view, so the buttons would never come. Stripe makes the final call once its button loads.
 * Kept here, apart from the buttons, so a card can ask without bringing Stripe's components along
 * (the pay sheet's one-tap buttons and the share screen's "two more gifts" both ask).
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

/**
 * Whether Google Pay really has a card here, asked of Stripe.js without making a Checkout Session:
 * walletHere() says "google" for every Android Chrome, Google Pay set up or not, and a card that
 * asked for a session on that guess alone made one (and a pending purchase row) for every Android
 * visitor who saw it. False when Stripe.js can't load or answer. The country is the account's own
 * (Latvia, content/legal.ts); it doesn't change the answer.
 */
export async function googlePayReady(key: string, locale: "en" | "es", amount: number, currency: string): Promise<boolean> {
  try {
    const stripe = await stripeFor(key, locale);
    if (!stripe) return false;
    const request = stripe.paymentRequest({ country: "LV", currency, total: { label: "Ethos", amount }, disableWallets: ["link", "applePay", "browserCard"] });
    const can = await request.canMakePayment();
    return Boolean(can?.googlePay);
  } catch {
    return false;
  }
}

// Stripe.js loads only when a wallet button is about to be drawn: nothing of Stripe's runs before.
// One promise for the page, whichever button asks first.
let stripePromise: Promise<StripeJs | null> | null = null;
export function stripeFor(key: string, locale: "en" | "es"): Promise<StripeJs | null> {
  stripePromise ??= loadStripe(key, { locale });
  return stripePromise;
}
