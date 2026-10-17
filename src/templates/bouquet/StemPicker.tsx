"use client";

import { useId } from "react";
import { Minus, Plus, Shuffle, X } from "lucide-react";
import { Field } from "@/components/editor/field";
import { cn } from "@/lib/utils";
import type { FieldEditorProps } from "../types";
import { FlowerHead } from "./art";
import { COLOR_NAMES, FLOWERS, FLOWER_IDS, MAX_STEMS, toneOf, type FlowerId } from "./catalogue";
import type { Stem } from "./schema";

const T = {
  en: { add: "Add a flower", stems: "{n} of {max} stems", remove: "Remove", fewer: "One fewer", more: "One more", full: "That's a full bouquet.", shuffle: "Shuffle" },
  es: { add: "Añade una flor", stems: "{n} de {max} tallos", remove: "Quitar", fewer: "Uno menos", more: "Uno más", full: "El ramo está completo.", shuffle: "Mezclar" },
};

function Icon({ id, color, size }: { id: FlowerId; color: string; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="-60 -60 120 120" width={size} height={size} aria-hidden="true" className="shrink-0 overflow-visible">
      <FlowerHead id={id} tone={toneOf(id, color).tone} uid={uid} seed={7} />
    </svg>
  );
}

/** The editor for `stems`: what's in the bouquet, and a shelf of flowers to add. */
export function StemPicker({ id, label, help, value, onChange, locale }: FieldEditorProps<Stem[]>) {
  const t = T[locale] ?? T.en;
  const stems = Array.isArray(value) ? value : [];
  const total = stems.reduce((n, s) => n + s.count, 0);
  const full = total >= MAX_STEMS;
  const set = (i: number, patch: Partial<Stem>) => onChange(stems.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const add = (flower: FlowerId) => {
    if (full) return;
    const color = Object.keys(FLOWERS[flower].colors)[0];
    const i = stems.findIndex((s) => s.flower === flower && s.color === color);
    if (i >= 0 && stems[i].count < 12) set(i, { count: stems[i].count + 1 });
    else if (stems.length < 12) onChange([...stems, { flower, color, count: 1 }]);
  };

  return (
    <Field id={id} label={label} help={help} counter={t.stems.replace("{n}", String(total)).replace("{max}", String(MAX_STEMS))}>
      <ul id={id} className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card" data-testid="stem-list">
        {stems.map((s, i) => {
          const colors = Object.keys(FLOWERS[s.flower].colors);
          return (
            // Two rows so every control can be a full 44px touch target on a phone: the flower and
            // its count on top, its colours underneath (they were 20px dots 6px apart).
            <li key={`${s.flower}-${i}`} className="flex flex-col gap-0.5 px-3 py-2" data-testid="stem-row">
              <div className="flex items-center gap-2">
                <Icon id={s.flower} color={s.color} size={40} />
                <p className="min-w-0 flex-1 truncate pl-1 text-sm font-medium">{FLOWERS[s.flower].name[locale]}</p>
                <div className="flex items-center">
                  <button type="button" aria-label={t.fewer} disabled={s.count <= 1} onClick={() => set(i, { count: s.count - 1 })} className="grid size-11 place-items-center rounded-full disabled:opacity-30">
                    <span className="grid size-8 place-items-center rounded-full border border-border">
                      <Minus className="size-3.5" />
                    </span>
                  </button>
                  <span className="w-5 text-center text-sm tabular-nums">{s.count}</span>
                  <button type="button" aria-label={t.more} disabled={full || s.count >= 12} onClick={() => set(i, { count: s.count + 1 })} className="grid size-11 place-items-center rounded-full disabled:opacity-30">
                    <span className="grid size-8 place-items-center rounded-full border border-border">
                      <Plus className="size-3.5" />
                    </span>
                  </button>
                </div>
                <button type="button" aria-label={t.remove} disabled={stems.length <= 1} onClick={() => onChange(stems.filter((_, k) => k !== i))} className="-mr-1.5 grid size-11 place-items-center rounded-full text-muted-foreground hover:text-ink disabled:opacity-30">
                  <X className="size-4" />
                </button>
              </div>
              {colors.length > 1 ? (
                <div className="ml-[42px] flex flex-wrap" role="radiogroup" aria-label={FLOWERS[s.flower].name[locale]}>
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={s.color === c}
                      aria-label={COLOR_NAMES[c]?.[locale] ?? c}
                      title={COLOR_NAMES[c]?.[locale] ?? c}
                      onClick={() => set(i, { color: c })}
                      className="grid size-11 place-items-center rounded-full"
                    >
                      <span className={cn("size-6 rounded-full border border-black/10", s.color === c && "ring-2 ring-ink ring-offset-2 ring-offset-card")} style={{ background: FLOWERS[s.flower].colors[c].mid }} />
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] font-medium text-muted-foreground">{full ? t.full : t.add}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {FLOWER_IDS.map((f) => (
          <button
            key={f}
            type="button"
            disabled={full}
            onClick={() => add(f)}
            data-testid={`add-${f}`}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-1 py-2 text-[11px] leading-tight transition-colors hover:border-ink/40 disabled:opacity-40"
          >
            <Icon id={f} color={Object.keys(FLOWERS[f].colors)[0]} size={44} />
            <span className="text-center">{FLOWERS[f].name[locale]}</span>
          </button>
        ))}
      </div>
    </Field>
  );
}

/** The editor for `seed`: one button that re-deals the arrangement. */
export function ShuffleButton({ id, label, help, value, onChange, locale }: FieldEditorProps<number>) {
  const t = T[locale] ?? T.en;
  return (
    <Field id={id} label={label} help={help}>
      <button
        id={id}
        type="button"
        onClick={() => onChange(((Number(value) || 0) * 7 + 13) % 99991)}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium hover:border-ink/40"
      >
        <Shuffle className="size-4" />
        {t.shuffle}
      </button>
    </Field>
  );
}
