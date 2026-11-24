"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";

/**
 * The pricing page's head and its cards press the same button. With `?template=<slug>` the head's
 * button is that gift's own buy button: it is the "One gift" card's own handler (PricingCards'
 * `choose`, which opens the picker with that gift chosen, or says payments are not open yet),
 * handed up here as it is, never a copy of it. The cards register it; the head calls it. Without
 * this provider (the /gifts page's teaser) the cards register nothing and behave as they always did.
 *
 * `opener` is the button pressed, so the picker hands focus back to it when it closes.
 */
type Handler = (product: PlanId, opener?: HTMLElement | null) => void;
type Choice = { choose: RefObject<Handler | null>; register: (handler: Handler) => void; ready: boolean; busy: PlanId | null; setBusy: (busy: PlanId | null) => void };

const PricingChoiceContext = createContext<Choice | null>(null);

export function PricingChoice({ children }: { children: ReactNode }) {
  const choose = useRef<Handler | null>(null);
  // False in the server's HTML and until the cards have hydrated and handed their handler up: the
  // head's button waits (disabled, with the spinner) instead of taking taps that do nothing.
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const register = useCallback((handler: Handler) => {
    choose.current = handler;
    setReady(true);
  }, []);
  return <PricingChoiceContext.Provider value={{ choose, register, ready, busy, setBusy }}>{children}</PricingChoiceContext.Provider>;
}

/** Called by the cards: their own `choose`, and which of them is starting a checkout (or null). */
export function useRegisterChoice(choose: Handler, busy: PlanId | null) {
  const context = useContext(PricingChoiceContext);
  const register = context?.register;
  useEffect(() => {
    register?.(choose);
  });
  const setBusy = context?.setBusy;
  useEffect(() => {
    setBusy?.(busy);
  }, [busy, setBusy]);
}

/** The head's button for one gift: the "One gift" card's handler, pressed from the head. */
export function ChooseButton({ product, className, children }: { product: PlanId; className?: string; children: ReactNode }) {
  const context = useContext(PricingChoiceContext);
  const busy = context?.busy ?? null;
  const waiting = !context?.ready;
  return (
    <button
      type="button"
      data-testid={`head-buy-${product}`}
      data-ready={waiting ? undefined : ""}
      onClick={(event) => context?.choose.current?.(product, event.currentTarget)}
      disabled={waiting || busy !== null}
      aria-busy={waiting || busy === product}
      className={cn(className, "disabled:pointer-events-none disabled:opacity-70")}
    >
      {waiting || busy === product ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
      {children}
    </button>
  );
}
