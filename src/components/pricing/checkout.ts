"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { currentRef } from "@/lib/attribution/ref";
import { checkoutErrorKey, type CheckoutRequest, type CheckoutResult } from "./offers";
import { errorOf, postJson } from "./requests";

/**
 * Opens Stripe Checkout for one product. Every buy button on the site goes through here, so each one
 * carries the visitor's ref the same way (a creator's personal link is how they are credited) and
 * reads the server's answer the same way: a URL to go to, or an error code for the caller to show.
 */
export async function startCheckout(body: CheckoutRequest): Promise<CheckoutResult> {
  const result = await postJson("/api/stripe/checkout", { ...body, ref: body.ref ?? currentRef() });
  const url = result.json.url;
  if (typeof url === "string" && url.length > 0) return { url };
  return { error: errorOf(result) ?? (result.status === 0 ? "network" : "checkout") };
}

/**
 * Says why checkout didn't open, in words. Owning it already isn't a failure, so it isn't shown as
 * one; everything else is.
 */
export function useCheckoutError(): (error: string) => void {
  const t = useTranslations("money.checkoutErrors");
  return (error) => {
    const key = checkoutErrorKey(error);
    if (key === "alreadyOwned") toast(t(key));
    else toast.error(t(key));
  };
}
