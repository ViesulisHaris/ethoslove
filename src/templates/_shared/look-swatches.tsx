"use client";

import { Field } from "@/components/editor/field";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { FieldEditorProps } from "../types";

/** A look as a swatch: its page, the paper on it and one accent, straight from the look's own colours. */
export type LookSwatch = { page: string; paper: string; accent: string };

/**
 * A look chosen by its colours. Past four options the generated form falls back to a dropdown of
 * names, which hides the one thing a look is; this is a grid of round swatches with the name under
 * each and the chosen one ringed. Every target is 44px, and the group reads as a radiogroup.
 * A template wraps it in a small field editor of its own that passes its swatches and names.
 */
export function LookSwatches<L extends string>({
  id,
  label,
  help,
  value,
  onChange,
  locale,
  swatches,
  names,
}: FieldEditorProps<L | undefined> & { swatches: Record<L, LookSwatch>; names: Record<GiftLocale, Record<string, string> | undefined> }) {
  const keys = Object.keys(swatches) as L[];
  const current = value && keys.includes(value) ? value : keys[0];
  const nameOf = (k: L) => names[locale]?.[k] ?? names.en?.[k] ?? k;
  return (
    <Field id={id} label={label} help={help}>
      <div id={id} role="radiogroup" aria-label={label} className="grid grid-cols-4 gap-x-1 gap-y-2">
        {keys.map((k) => {
          const on = k === current;
          const s = swatches[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(k)}
              className="group flex flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full shadow-sm ring-1 ring-black/10 transition-transform duration-200",
                  on ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "group-hover:scale-105",
                )}
                style={{ background: `linear-gradient(135deg, ${s.page} 0 52%, ${s.paper} 52% 100%)` }}
              >
                <span className="size-4 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,.85)]" style={{ background: s.accent }} />
              </span>
              <span className={cn("text-center text-[11px] leading-tight", on ? "font-semibold text-ink" : "text-muted-foreground")}>{nameOf(k)}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
