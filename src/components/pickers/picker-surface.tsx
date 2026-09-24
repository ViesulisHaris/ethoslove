"use client";

import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, Popover } from "radix-ui";
import { cn } from "@/lib/utils";
import type { useQuietFocus } from "./quiet-focus";
import { CARD, CARD_MOTION } from "./styles";

/** From here up a card under the field; below it (a phone) a sheet from the bottom, as the trips' range picker does. */
const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The field that opens it: a button, which the card or sheet takes as its trigger. */
  trigger: ReactElement;
  /** The card's name for a screen reader, and the sheet's heading. */
  label: string;
  /** The card's width on a wide screen. */
  width: string;
  /** Where the focus lands as it opens: the choice already made, not the first button. */
  onOpenAutoFocus: (event: Event) => void;
  contentProps: ReturnType<typeof useQuietFocus>["contentProps"];
  children: ReactNode;
};

/**
 * Where a picker opens. On a tablet or a computer, a card under its field (it flips above when
 * there is more room there). On a phone, a sheet up from the bottom, in reach of a thumb and with
 * room for 44px targets, where a card squeezed between the field and the keyboard's edge of the
 * screen would have to scroll inside itself. Both close on Escape and a tap outside, and hand the
 * focus back to the field.
 */
export function PickerSurface({
  open,
  onOpenChange,
  trigger,
  label,
  width,
  onOpenAutoFocus,
  contentProps,
  children,
}: Props) {
  const t = useTranslations("pickers");
  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);

  if (wide) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            aria-label={label}
            {...contentProps}
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(
              "z-[70] max-h-(--radix-popover-content-available-height) max-w-[calc(100vw-24px)] origin-(--radix-popover-content-transform-origin) overflow-y-auto overscroll-contain p-3",
              CARD,
              CARD_MOTION,
              width,
            )}
          >
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        {/* Over the phone's floating buttons and the site's own sheets (up to 85), as the range picker's sheet is. */}
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-forest/45 duration-250 ease-out-quint data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          {...contentProps}
          onOpenAutoFocus={onOpenAutoFocus}
          className="fixed inset-x-0 bottom-0 z-[90] max-h-[calc(100dvh-max(12px,env(safe-area-inset-top)))] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] text-forest shadow-[0_-18px_50px_-20px_rgba(42,15,31,0.5)] duration-300 ease-out-quint outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
        >
          <div className="mx-auto flex max-w-[420px] items-center justify-between gap-3 pb-2">
            <Dialog.Title className="min-w-0 truncate pl-1 font-display text-[20px] leading-tight text-forest">
              {label}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("close")}
              className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full bg-forest/[0.06] text-forest transition-colors active:bg-forest/10"
            >
              <X aria-hidden="true" className="size-[18px]" />
            </Dialog.Close>
          </div>
          <div className="mx-auto max-w-[420px]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
