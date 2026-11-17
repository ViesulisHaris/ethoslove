"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { COVER_IDS, type CoverId, type GiftLocale } from "@/lib/gift/schema";
import { Cover } from "@/templates/_shared/covers/Cover";
import { coverFor } from "@/templates/_shared/covers/follow";
import { thumbLook } from "@/lib/covers/thumbs";
import { cn } from "@/lib/utils";

/** Covers drawn per idle moment: two rows on a phone, so no one step holds up a tap for long. */
const TILES_PER_STEP = 6;

/**
 * Live thumbnails of every cover with their name in it, so the choice is made by eye. Drawn from
 * the small copies of the cut-outs (see thumbLook): a tile is a few dozen pixels across. Each is
 * drawn in the gift's own colours where the cover follows them (see coverFor), and the Classic
 * tile is the template's own first screen when it has one to show (`classic`).
 *
 * Each tile is a whole cover in miniature, and together they were most of the editor's start: about
 * 2,400 elements with their textures and animations, four screens below the first field, all drawn
 * before a name could be typed (16 Nov 2026: 30 s to the first field in WebKit). So the buttons are
 * there from the start, each with an empty frame of the tile's size, and the covers are drawn into
 * them a few at a time while the browser is idle, or all at once as soon as the picker comes within a
 * screen and a half of view. (content-visibility on the drawn tiles was tried too: it moved their
 * stickers and edges by a pixel in Chromium, so they are drawn exactly as before.)
 */
export function CoverPicker({
  value,
  onChange,
  recipientName,
  locale,
  slug,
  fields,
  classic,
}: {
  value: CoverId;
  onChange: (v: CoverId) => void;
  recipientName: string;
  locale: GiftLocale;
  slug: string;
  fields: unknown;
  classic?: (name: string) => ReactNode;
}) {
  const t = useTranslations("editor.covers");
  const name = recipientName.trim() || t("theirName");
  const grid = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    if (drawn >= COVER_IDS.length) return;
    const all = () => setDrawn(COVER_IDS.length);
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) all();
      },
      { rootMargin: "150% 0px" },
    );
    if (grid.current) near.observe(grid.current);
    const more = () => setDrawn((n) => Math.min(COVER_IDS.length, n + TILES_PER_STEP));
    // Safari has no requestIdleCallback: there the first covers wait a second, for the form's first tap.
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(more, { timeout: 2000 }) : window.setTimeout(more, drawn === 0 ? 1000 : 150);
    return () => {
      near.disconnect();
      if (idle) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [drawn]);

  return (
    <div ref={grid} role="radiogroup" aria-label={t("label")} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {COVER_IDS.map((id, i) => {
        const active = id === value;
        const frame = cn(
          "relative block aspect-[9/16] w-full overflow-hidden rounded-xl border transition-all",
          active ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper" : "border-border group-hover:border-ink/40",
        );
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
            {i < drawn ? (
              <span
                // isolate: a cover stacks itself at z-60 for the gift page. Without a stacking context
                // of its own here, every thumbnail scrolled over the sticky top bar and the editor's
                // Edit / Preview / Publish controls could not be tapped through them.
                className={cn(frame, "isolate [container-type:size]")}
              >
                {id === "classic" && classic ? (
                  classic(name)
                ) : id === "classic" ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(90%_60%_at_50%_20%,#3a2617,#100a06)] px-2 text-[#f6efe3]">
                    <span className="text-[5cqw] tracking-[0.3em] uppercase opacity-60">{t("classicEyebrow")}</span>
                    <span className="font-display mt-[4cqh] text-[16cqw] leading-none italic">{name}</span>
                    <span className="mt-[5cqh] h-px w-[40cqw] bg-[var(--brand-coral)]" />
                  </span>
                ) : (
                  <Cover look={thumbLook(coverFor(id, slug, fields))} recipientName={name} locale={locale} still />
                )}
              </span>
            ) : (
              // The tile's place until its cover is drawn: the same frame, empty.
              <span aria-hidden="true" className={cn(frame, "bg-paper-deep/60")} />
            )}
            <span className={cn("text-xs", active ? "font-semibold text-ink" : "text-muted-foreground")}>{t(`names.${id}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
