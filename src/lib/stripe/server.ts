import "server-only";

import Stripe from "stripe";
import { env, isConfigured } from "@/lib/env";
import { BUMP, PRODUCTS } from "@/lib/pricing/products";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isConfigured.stripe) return null;
  if (!stripe) stripe = new Stripe(env.stripeSecretKey!, { typescript: true });
  return stripe;
}

/**
 * STRIPE_PRODUCT_* from the environment, by variable name. Optional: a set one files that product's
 * lines under an existing Stripe Product; the amount charged always comes from the catalogue.
 */
export function stripeProductIds(): Record<string, string | undefined> {
  const keys = [...Object.values(PRODUCTS).map((p) => p.envProductKey), BUMP.envProductKey];
  return Object.fromEntries(keys.map((key) => [key, process.env[key] || undefined]));
}

/** Checkout needs Stripe's secret key and the service role (purchases are written by the server). */
export const stripeReady = () => isConfigured.stripe && isConfigured.supabaseAdmin;
