"use client";

import type { ReactNode } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Vibe } from "@/lib/dates/ideas";
import { TONIGHT_VIBES, type TonightLength } from "@/lib/dates/tonight";

export type TonightWhen = "tonight" | "tomorrow" | "weekend" | "day";
export type TonightChoice = { vibe?: Vibe; budget?: 0 | 1 | 2 | 3; length?: TonightLength };

type Props = {
  choice: TonightChoice;
  when: TonightWhen;
  /** The days on offer, in order. `label` is what the sentence says ("tonight", "tomorrow", "on Sat 28 Nov"). */
  whens: readonly { value: TonightWhen; label: string }[];
  /** True on a page by kind: the sentence says "one of these" and has no mood. */
  ofKind?: boolean;
  /** Why the button cannot be pressed yet, said on it: "Finding places…" or "Say where first." */
  waiting?: string;
  busy?: boolean;
  onChoice: (next: TonightChoice) => void;
  onWhen: (when: TonightWhen) => void;
  onPlan: () => void;
};

/** The planner's one strong button: the gift page's primary, as a button. Shared with the result card. */
export const TONIGHT_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-6 text-base font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,translate,scale] duration-200 ease-(--ease-out-quint) hover:bg-page-accent-hover active:scale-[0.98] pointer-fine:hover:-translate-y-px aria-disabled:cursor-default aria-disabled:opacity-60 aria-disabled:active:scale-100 motion-reduce:transition-none";

const SELECT =
  "field-sizing-content h-11 max-w-full cursor-pointer appearance-none truncate rounded-none border-0 border-b border-page-ink/35 bg-transparent py-0 pr-7 pl-1 font-display text-[1.375rem] leading-none text-page-accent italic outline-offset-4 transition-colors hover:border-page-ink focus-visible:border-page-accent active:text-page-accent-hover disabled:cursor-default disabled:opacity-50";

/**
 * A choice as the select shows it: with a no-break space after it (an ordinary one is trimmed). A
 * select clips its words at their own width, and an italic letter leans past it ("any kind of"
 * lost the hook of its f).
 */
const room = (label: string): string => `${label}\u00a0`;

/** One choice inside the sentence: a native select, read by its name, with a small chevron. */
function Choice({ name, value, onChange, children }: { name: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="relative inline-flex max-w-full align-baseline">
      <span className="sr-only">{name}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-0.5 size-4 -translate-y-1/2 text-page-body" />
    </label>
  );
}

/**
 * "Plan a cozy date tonight. Up to 2 hours, free." One sentence with the choices inside it, then
 * one button: the one-step planner's form, on the dates map, a city's page and a page by kind.
 */
export function TonightForm({ choice, when, whens, ofKind, waiting, busy, onChoice, onWhen, onPlan }: Props) {
  const t = useTranslations("dates");
  const blocked = Boolean(busy || waiting);
  const parts = {
    mood: () => (
      <Choice name={t("ideas.vibes")} value={choice.vibe ?? ""} onChange={(v) => onChoice({ ...choice, vibe: (v || undefined) as Vibe | undefined })}>
        <option value="">{room(t("tonight.mood.any"))}</option>
        {TONIGHT_VIBES.map((vibe) => (
          <option key={vibe} value={vibe}>
            {room(t(`tonight.mood.${vibe}`))}
          </option>
        ))}
      </Choice>
    ),
    when: () => (
      <Choice name={t("when.label")} value={when} onChange={(v) => onWhen(v as TonightWhen)}>
        {whens.map((w) => (
          <option key={w.value} value={w.value}>
            {room(w.label)}
          </option>
        ))}
      </Choice>
    ),
    length: () => (
      <Choice name={t("tonight.lengthLabel")} value={choice.length ?? ""} onChange={(v) => onChoice({ ...choice, length: (v || undefined) as TonightLength | undefined })}>
        <option value="">{room(t("tonight.length.any"))}</option>
        <option value="short">{room(t("tonight.length.short"))}</option>
        <option value="medium">{room(t("tonight.length.medium"))}</option>
        <option value="long">{room(t("tonight.length.long"))}</option>
      </Choice>
    ),
    budget: () => (
      <Choice name={t("tonight.budgetLabel")} value={choice.budget === undefined ? "" : String(choice.budget)} onChange={(v) => onChoice({ ...choice, budget: v === "" ? undefined : (Number(v) as 0 | 1 | 2 | 3) })}>
        <option value="">{room(t("tonight.budget.any"))}</option>
        <option value="0">{room(t("tonight.budget.0"))}</option>
        <option value="1">{room(t("tonight.budget.1"))}</option>
        <option value="2">{room(t("tonight.budget.2"))}</option>
        <option value="3">{room(t("tonight.budget.3"))}</option>
      </Choice>
    ),
  };

  return (
    <div>
      <p className="font-display text-[1.375rem] leading-[2.9rem] text-page-ink">
        {ofKind ? t.rich("tonight.sentenceKind", { when: parts.when, length: parts.length, budget: parts.budget }) : t.rich("tonight.sentence", parts)}
      </p>
      <button
        type="button"
        aria-disabled={blocked ? "true" : undefined}
        onClick={() => {
          if (!blocked) onPlan();
        }}
        className={`mt-4 ${TONIGHT_BUTTON}`}
      >
        {busy ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            {t("tonight.finding")}
          </>
        ) : (
          (waiting ?? t("tonight.plan"))
        )}
      </button>
    </div>
  );
}
