"use client";

import { useTranslations } from "next-intl";
import { COVER_IDS, type CoverId, type GiftLocale } from "@/lib/gift/schema";
import { Cover } from "@/templates/_shared/covers/Cover";
import { COVER_LOOKS } from "@/templates/_shared/covers/looks";
import { cn } from "@/lib/utils";

/** Live thumbnails of every cover with their name in it, so the choice is made by eye. */
export function CoverPicker({
  value,
  onChange,
  recipientName,
  locale,
}: {
  value: CoverId;
  onChange: (v: CoverId) => void;
  recipientName: string;
  locale: GiftLocale;
}) {
  const t = useTranslations("editor.covers");
  const name = recipientName.trim() || t("theirName");

  return (
    <div role="radiogroup" aria-label={t("label")} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {COVER_IDS.map((id) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            data-testid={`cover-${id}`}
            className="group flex flex-col items-center gap-1.5 text-center"
          >
            <span
              // isolate: a cover stacks itself at z-60 for the gift page. Without a stacking context
              // of its own here, every thumbnail scrolled over the sticky top bar and the editor's
              // Edit / Preview / Publish controls could not be tapped through them.
              className={cn(
                "relative isolate block aspect-[9/16] w-full overflow-hidden rounded-xl border transition-all [container-type:size]",
                active ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-border group-hover:border-ink/40",
              )}
            >
              {id === "classic" ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(90%_60%_at_50%_20%,#3a2617,#100a06)] px-2 text-[#f6efe3]">
                  <span className="text-[5cqw] tracking-[0.3em] uppercase opacity-60">{t("classicEyebrow")}</span>
                  <span className="font-display mt-[4cqh] text-[16cqw] leading-none italic">{name}</span>
                  <span className="mt-[5cqh] h-px w-[40cqw] bg-[var(--brand-coral)]" />
                </span>
              ) : (
                <Cover look={COVER_LOOKS[id]} recipientName={name} locale={locale} still />
              )}
            </span>
            <span className={cn("text-xs", active ? "font-semibold text-ink" : "text-muted-foreground")}>{t(`names.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
