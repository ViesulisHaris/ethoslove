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
 */
type Handler = (product: PlanId) => void;
type Choice = { choose: RefObject<Handler | null>; register: (handler: Handler) => void; busy: boolean; setBusy: (busy: boolean) => void };

const PricingChoiceContext = createContext<Choice | null>(null);

export function PricingChoice({ children }: { children: ReactNode }) {
  const choose = useRef<Handler | null>(null);
  const [busy, setBusy] = useState(false);
  const register = useCallback((handler: Handler) => {
    choose.current = handler;
  }, []);
  return <PricingChoiceContext.Provider value={{ choose, register, busy, setBusy }}>{children}</PricingChoiceContext.Provider>;
}

/** Called by the cards: their own `choose` and `busy`, as they are. */
export function useRegisterChoice(choose: Handler, busy: boolean) {
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
  const busy = context?.busy ?? false;
  return (
    <button type="button" data-testid={`head-buy-${product}`} onClick={() => context?.choose.current?.(product)} disabled={busy} className={cn(className, "disabled:opacity-70")}>
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
