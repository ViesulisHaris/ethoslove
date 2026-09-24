"use client";

import { useRef } from "react";
import { ArrowUpDown, Check, ChevronDown, Heart, MapPin, Star, Wallet, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/utils";
import { SORTS, type Sort } from "@/lib/dates/rank";

const ICONS: Record<Sort, LucideIcon> = { best: Heart, rated: Star, nearest: MapPin, cheapest: Wallet };

export type SortLabels = { label: string; name: Record<Sort, string>; sub: Record<Sort, string> };

type Props = { value: Sort; labels: SortLabels; onChange: (sort: Sort) => void; className?: string };

/**
 * How the list is ordered: a pill that opens the calendar's card, each order with what it actually
 * does under its name. It was the browser's own select, a grey system list with a tick on a Mac and a
 * wheel on a phone, and the only control on the page that looked borrowed.
 *
 * Not modal: a sort is a glance, and a modal menu would lock the page's scroll (and shift it by a
 * scrollbar) for as long as it's open.
 */
export function SortMenu({ value, labels, onChange, className }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const byPointer = useRef(false);
  // The menu hands focus back to the pill when it closes, which is right for the keyboard. But the
  // browser counts that as focus by script, and Chrome then draws the keyboard ring on the pill after
  // a plain click or tap on an order, where it reads as a stuck highlight. So an order picked by
  // pointer gives focus back quietly; the next key or blur brings the ring back.
  const unquiet = () => {
    if (trigger.current) delete trigger.current.dataset.quiet;
  };
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        ref={trigger}
        onKeyDown={unquiet}
        onBlur={unquiet}
        className={cn(
          "group inline-flex h-11 items-center gap-2 rounded-full bg-white pr-3 pl-3.5 text-[13.5px] font-semibold text-forest ring-1 ring-forest/10 transition-[background-color,box-shadow] outline-none hover:bg-forest/5 data-[state=open]:bg-forest/5 lg:h-10 [&:focus-visible:not([data-quiet])]:ring-2 [&:focus-visible:not([data-quiet])]:ring-rose/60",
          className,
        )}
      >
        <ArrowUpDown aria-hidden="true" className="size-4 shrink-0 text-forest/50" />
        <span className="sr-only">{labels.label}: </span>
        <span className="whitespace-nowrap">{labels.name[value]}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-forest/50 transition-transform duration-250 ease-out-quint group-data-[state=open]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onPointerDown={() => {
            byPointer.current = true;
          }}
          onKeyDown={() => {
            byPointer.current = false;
          }}
          onCloseAutoFocus={(event) => {
            if (!byPointer.current) return;
            byPointer.current = false;
            const pill = trigger.current;
            if (!pill) return;
            event.preventDefault();
            pill.dataset.quiet = "";
            pill.focus({ preventScroll: true });
          }}
          className="z-[70] max-h-(--radix-dropdown-menu-content-available-height) w-[312px] max-w-[calc(100vw-24px)] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overscroll-contain rounded-3xl bg-white p-2 text-forest shadow-lift ring-1 ring-forest/10 outline-none duration-200 ease-out-quint data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-1.5 text-[11.5px] font-semibold tracking-wide text-forest/55 uppercase">{labels.label}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={value}
            // Picking the order already shown would otherwise start the list's crossfade for nothing.
            onValueChange={(next) => {
              if (next !== value) onChange(next as Sort);
            }}
          >
            {SORTS.map((sort) => {
              const Icon = ICONS[sort];
              return (
                <DropdownMenu.RadioItem
                  key={sort}
                  value={sort}
                  textValue={labels.name[sort]}
                  className="group/item flex min-h-[60px] cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 outline-none select-none transition-colors duration-150 data-[highlighted]:bg-forest/[0.045] data-[state=checked]:bg-rose-mist data-[state=checked]:data-[highlighted]:bg-rose-soft"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest/[0.05] text-forest/65 transition-[background-color,color,box-shadow] duration-150 group-data-[state=checked]/item:bg-white group-data-[state=checked]/item:text-rose-deep group-data-[state=checked]/item:shadow-soft">
                    <Icon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] leading-tight font-semibold">{labels.name[sort]}</span>
                    <span className="mt-1 text-[13px] leading-snug text-forest/60">{labels.sub[sort]}</span>
                  </span>
                  {/* A fixed slot, so the words don't shift when the tick moves to another order. */}
                  <span className="grid size-6 shrink-0 place-items-center">
                    <DropdownMenu.ItemIndicator className="grid size-5 place-items-center rounded-full bg-rose-deep text-white duration-200 ease-out-quint animate-in fade-in-0 zoom-in-50">
                      <Check aria-hidden="true" className="size-3" strokeWidth={3.25} />
                    </DropdownMenu.ItemIndicator>
                  </span>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
