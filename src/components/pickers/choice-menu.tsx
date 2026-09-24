"use client";

import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/utils";
import { useQuietFocus } from "./quiet-focus";
import {
  CARD,
  CARD_LABEL,
  CARD_MOTION,
  FIELD_CHEVRON,
  FIELD_TRIGGER,
  ITEM,
  ITEM_CHECKED,
  TICK,
  TICK_SLOT,
  TILE,
} from "./styles";

export type Choice<T extends string> = {
  value: T;
  label: string;
  /** One line under the name saying what the choice does. */
  description?: string;
  icon?: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
  /** What is being chosen: the card's small heading, and the first half of the trigger's name ("Sort by: Nearest"). */
  label: string;
  /**
   * "pill": the Dates page's round button, as wide as its words, for a choice over a list.
   * "field": a form's full-width field showing the choice (and its icon); `className` matches it to
   * the fields around it.
   */
  look?: "pill" | "field";
  /** The pill's own icon before the choice (the sort's arrows). A field shows the choice's icon instead. */
  icon?: LucideIcon;
  id?: string;
  className?: string;
  menuClassName?: string;
};

const PILL =
  "group inline-flex h-11 items-center gap-2 rounded-full bg-white pr-3 pl-3.5 text-[13.5px] font-semibold text-forest ring-1 ring-forest/10 transition-[background-color,box-shadow] outline-none hover:bg-forest/5 data-[state=open]:bg-forest/5 lg:h-10 [&:focus-visible:not([data-quiet])]:ring-2 [&:focus-visible:not([data-quiet])]:ring-rose/60";

/**
 * One choice out of a few, in our own menu rather than the browser's select (a grey system list with
 * a tick on a Mac and a wheel on a phone, the one control on a page that looked borrowed). A menu of
 * radio items: arrows, Enter, typing a name's first letters and Escape all work, and a screen reader
 * hears "menu item radio, checked".
 *
 * Not modal: a choice is a glance, and a modal menu would lock the page's scroll (and shift it by a
 * scrollbar) for as long as it's open.
 */
export function ChoiceMenu<T extends string>({
  value,
  choices,
  onChange,
  label,
  look = "pill",
  icon: PillIcon,
  id,
  className,
  menuClassName,
}: Props<T>) {
  const { trigger, triggerProps, contentProps } = useQuietFocus();
  const chosen = choices.find((c) => c.value === value);
  const field = look === "field";
  const ChosenIcon = chosen?.icon;
  const withIcons = choices.some((c) => c.icon);
  const withDescriptions = choices.some((c) => c.description);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        ref={trigger}
        id={id}
        {...triggerProps}
        // A field sits under a label of its own: the name has to say the choice as well, or a
        // screen reader would read only the label. The pill says both with words only it hears.
        aria-label={field ? `${label}: ${chosen?.label ?? ""}` : undefined}
        className={cn(field ? FIELD_TRIGGER : PILL, className)}
      >
        {field ? (
          <>
            {ChosenIcon ? (
              <ChosenIcon aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
            ) : null}
            <span className="min-w-0 truncate">{chosen?.label}</span>
            <ChevronDown aria-hidden="true" className={FIELD_CHEVRON} />
          </>
        ) : (
          <>
            {PillIcon ? (
              <PillIcon aria-hidden="true" className="size-4 shrink-0 text-forest/50" />
            ) : null}
            <span className="sr-only">{label}: </span>
            <span className="whitespace-nowrap">{chosen?.label}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-forest/50 transition-transform duration-250 ease-out-quint group-data-[state=open]:rotate-180"
            />
          </>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          {...contentProps}
          className={cn(
            "z-[70] max-h-(--radix-dropdown-menu-content-available-height) max-w-[calc(100vw-24px)] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overscroll-contain",
            CARD,
            CARD_MOTION,
            field ? "w-(--radix-dropdown-menu-trigger-width) min-w-[260px]" : "w-[312px]",
            menuClassName,
          )}
        >
          <DropdownMenu.Label className={CARD_LABEL}>{label}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={value}
            // Picking what is already chosen would otherwise run the change (and a list's crossfade) for nothing.
            onValueChange={(next) => {
              if (next !== value) onChange(next as T);
            }}
          >
            {choices.map((choice) => {
              const Icon = choice.icon;
              return (
                <DropdownMenu.RadioItem
                  key={choice.value}
                  value={choice.value}
                  textValue={choice.label}
                  className={cn(
                    ITEM,
                    ITEM_CHECKED,
                    withIcons && "px-2.5",
                    withDescriptions && "min-h-[60px]",
                  )}
                >
                  {withIcons ? (
                    <span className={TILE}>
                      {Icon ? <Icon aria-hidden="true" className="size-[18px]" /> : null}
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] leading-tight font-semibold">{choice.label}</span>
                    {choice.description ? (
                      <span className="mt-1 text-[13px] leading-snug text-forest/60">
                        {choice.description}
                      </span>
                    ) : null}
                  </span>
                  <span className={TICK_SLOT}>
                    <DropdownMenu.ItemIndicator className={TICK}>
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
