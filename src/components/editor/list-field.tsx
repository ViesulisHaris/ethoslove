"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * One input per item, an add button, Enter for the next row, Backspace on an empty row to drop it.
 * Rows may sit empty while someone is typing; only trimmed, non-empty items reach the gift data.
 */
export function ListField({
  id,
  ariaLabel,
  value,
  onChange,
  minItems = 0,
  maxItems,
  itemMaxLength,
  addLabel,
  placeholder,
  className,
}: {
  id?: string;
  ariaLabel: string;
  value: string[];
  onChange: (next: string[]) => void;
  minItems?: number;
  maxItems?: number;
  itemMaxLength?: number;
  addLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const t = useTranslations("editor.fields");
  const [items, setItems] = useState<string[]>(() => (value.length ? value : [""]));
  const emitted = useRef(JSON.stringify(value));
  const focusAt = useRef<number | null>(null);
  const inputs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Outside changes (a restored draft, a template switch) replace the rows; our own writes do not.
  useEffect(() => {
    const json = JSON.stringify(value);
    if (json === emitted.current) return;
    emitted.current = json;
    setItems(value.length ? value : [""]);
  }, [value]);

  useEffect(() => {
    const i = focusAt.current;
    if (i === null) return;
    focusAt.current = null;
    inputs.current[i]?.focus();
  }, [items]);

  const commit = (next: string[]) => {
    setItems(next);
    const clean = next.map((s) => s.trim()).filter(Boolean);
    emitted.current = JSON.stringify(clean);
    onChange(clean);
  };
  const count = items.filter((s) => s.trim()).length;
  const canAdd = !maxItems || items.length < maxItems;
  const add = (at = items.length) => {
    if (!canAdd) return;
    const next = [...items];
    next.splice(at, 0, "");
    focusAt.current = at;
    commit(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, k) => k !== i);
    focusAt.current = Math.max(0, i - 1);
    commit(next.length ? next : [""]);
  };

  return (
    <div className={cn("grid gap-2.5", className)}>
      <ol className="grid gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
            <Textarea
              rows={1}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              id={i === 0 ? id : undefined}
              value={item}
              maxLength={itemMaxLength}
              placeholder={i === 0 ? placeholder : undefined}
              aria-label={`${ariaLabel} ${i + 1}`}
              data-testid="list-item"
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                commit(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (item.trim()) add(i + 1);
                } else if (e.key === "Backspace" && item === "" && items.length > 1) {
                  e.preventDefault();
                  remove(i);
                }
              }}
              className="min-h-11 resize-none py-2.5 leading-snug"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={items.length <= 1 && item === ""}
              aria-label={t("listRemove")}
              className="relative grid size-9 after:absolute after:-inset-1 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-30"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3 pl-7">
        <button
          type="button"
          onClick={() => add()}
          disabled={!canAdd}
          data-testid="list-add"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-ink/30 px-4 text-[13px] font-medium transition-colors hover:border-ink hover:bg-black/5 disabled:opacity-40"
        >
          <Plus className="size-4" />
          {addLabel ?? t("listAdd")}
        </button>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {count}
          {maxItems ? ` / ${maxItems}` : ""}
          {minItems > count ? ` · ${t("listMin", { n: minItems })}` : ""}
        </span>
      </div>
    </div>
  );
}
