"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Currency, ProductId } from "@/lib/pricing/products";

/**
 * The personal price this browser holds, if any (lib/commerce/personal-price.ts): asked of the
 * server once per page load, and only when the offer email's cookie is there, so nobody else's
 * page makes the request. It ends by itself at its time, and `forget` drops it at once (checkout
 * said it has ended or been used).
 */
export type PersonalPrice = { endsAt: number; amounts: Record<Currency, number>; onto: readonly ProductId[] };

const COOKIE = "ethos_offer";

let answer: Promise<PersonalPrice | null> | null = null;
let forgotten = false;
const listeners = new Set<() => void>();

function ask(): Promise<PersonalPrice | null> {
  answer ??= fetch("/api/offer", { cache: "no-store", credentials: "same-origin" })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: { active?: boolean; endsAt?: number; amounts?: Record<Currency, number>; onto?: ProductId[] } | null) =>
      json?.active && typeof json.endsAt === "number" && json.amounts && json.onto ? { endsAt: json.endsAt, amounts: json.amounts, onto: json.onto } : null,
    )
    .catch(() => null);
  return answer;
}

function hasCookie(): boolean {
  try {
    return document.cookie.split(";").some((part) => part.trim().startsWith(`${COOKIE}=`));
  } catch {
    return false;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePersonalPrice(): { price: PersonalPrice | null; forget: () => void } {
  const gone = useSyncExternalStore(subscribe, () => forgotten, () => false);
  const [price, setPrice] = useState<PersonalPrice | null>(null);

  useEffect(() => {
    if (forgotten || !hasCookie()) return;
    let alive = true;
    void ask().then((found) => {
      if (alive) setPrice(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  // It ends on time, without a reload (straight away if it already has).
  useEffect(() => {
    if (!price) return;
    const left = Math.max(0, price.endsAt - Date.now());
    const timer = window.setTimeout(() => setPrice(null), Math.min(left, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [price]);

  const forget = () => {
    forgotten = true;
    answer = Promise.resolve(null);
    try {
      document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
    } catch {
      // Blocked site data: the server still refuses it.
    }
    listeners.forEach((listener) => listener());
  };

  return { price: gone ? null : price, forget };
}

/**
 * When the price ends, in the reader's own time: American English on a page in dollars ("Friday,
 * November 27 at 11:00 AM"), British otherwise ("Friday 27 November at 11:00"), and Spanish in
 * Spanish ("viernes, 27 de noviembre, 11:00"). The page's currency follows the visitor's country.
 */
export function personalPriceEnds(endsAt: number, locale: "en" | "es", currency: Currency): string {
  const tag = locale === "es" ? "es" : currency === "usd" ? "en-US" : "en-GB";
  return new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(endsAt));
}
