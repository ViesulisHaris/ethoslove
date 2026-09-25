"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * The frame the saved-dates sheets share: from the bottom on a phone, where a thumb is, and a small
 * dialog in the middle from `sm` up. A Radix dialog, so focus stays inside, Escape or a tap on the
 * dimmed page closes it, and the page behind is inert. Above the Dates map's dock and an open place
 * (55, 60) and the menu (80); only the tour is higher.
 */
export function BottomSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  closeLabel,
  tone = "paper",
  children,
  testId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A line above the title (the upsell's "Ethos for Two"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  /** Dusk is Ethos for Two's own sky (the upsell); paper is everything else. */
  tone?: "paper" | "dusk";
  children: ReactNode;
  testId?: string;
}) {
  const dusk = tone === "dusk";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[85] bg-forest/40 supports-backdrop-filter:backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-300" />
        <Dialog.Content
          data-testid={testId}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed z-[85] flex max-h-[min(92dvh,760px)] flex-col overflow-y-auto overscroll-contain outline-none",
            "inset-x-0 bottom-0 rounded-t-[28px] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-24px_rgba(20,10,30,0.55)] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300 data-[state=open]:ease-(--ease-out-quint)",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(92vw,440px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:px-7 sm:pt-7 sm:pb-7 sm:shadow-[0_40px_100px_-30px_rgba(20,10,30,0.6)] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
            dusk ? "bg-dusk-sky text-cream" : "bg-paper text-forest",
          )}
        >
          <span aria-hidden="true" className={cn("mx-auto mb-3 block h-1.5 w-11 shrink-0 rounded-full sm:hidden", dusk ? "bg-cream/25" : "bg-forest/20")} />
          <Dialog.Close aria-label={closeLabel} className={cn("absolute top-2 right-2 grid size-11 place-items-center rounded-full transition-colors sm:top-3 sm:right-3", dusk ? "text-moonlight/80 hover:bg-white/10 hover:text-cream" : "text-forest/60 hover:bg-forest/5 hover:text-forest")}>
            <X aria-hidden="true" className="size-5" />
          </Dialog.Close>
          {eyebrow}
          <Dialog.Title className={cn("pr-10 font-display text-[26px] leading-[1.1] text-balance sm:text-[28px]", dusk ? "text-cream" : "text-forest")}>{title}</Dialog.Title>
          {description ? <Dialog.Description className={cn("mt-2 text-[15px] leading-relaxed", dusk ? "text-moonlight/85" : "text-forest/70")}>{description}</Dialog.Description> : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
