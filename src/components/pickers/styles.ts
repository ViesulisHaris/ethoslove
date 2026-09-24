/**
 * The one look every menu and picker on the site shares, taken from the Dates page's sort menu:
 * a white card with big round corners on a soft lift, a small capitals heading, roomy rows that
 * tint as the pointer or the keyboard reaches them, and the chosen one in rose with a tick badge in
 * a slot of its own. Kept here as class lists so the site's own menus (components/ui) and the
 * pickers draw exactly the same card. The dark variants are for the app shell's dark mode.
 */

export const CARD =
  "rounded-3xl bg-white p-2 text-forest shadow-lift ring-1 ring-forest/10 outline-none dark:bg-popover dark:text-popover-foreground dark:ring-white/10";

/** Opens from the trigger with a small zoom and slide, 200ms; closes the same way back. */
export const CARD_MOTION =
  "duration-200 ease-out-quint data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97";

export const CARD_LABEL =
  "px-3 pt-2 pb-1.5 text-[11.5px] font-semibold tracking-wide text-forest/55 uppercase dark:text-popover-foreground/55";

/** A row: 44px at the least, for a thumb. */
export const ITEM =
  "group/item relative flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-[15px] leading-snug outline-none select-none transition-colors duration-150 data-[highlighted]:bg-forest/[0.045] data-[disabled]:pointer-events-none data-[disabled]:opacity-40 dark:data-[highlighted]:bg-white/[0.07]";

export const ITEM_CHECKED =
  "data-[state=checked]:bg-rose-mist data-[state=checked]:data-[highlighted]:bg-rose-soft dark:data-[state=checked]:bg-rose/15 dark:data-[state=checked]:data-[highlighted]:bg-rose/20";

/** The icon's tile beside a row's words; white with a rose icon on the chosen row. */
export const TILE =
  "grid size-10 shrink-0 place-items-center rounded-xl bg-forest/[0.05] text-forest/65 transition-[background-color,color,box-shadow] duration-150 group-data-[state=checked]/item:bg-white group-data-[state=checked]/item:text-rose-deep group-data-[state=checked]/item:shadow-soft dark:bg-white/[0.06] dark:text-popover-foreground/70";

/** A fixed slot for the tick, so the words don't shift when it moves to another row. */
export const TICK_SLOT = "grid size-6 shrink-0 place-items-center";
export const TICK =
  "grid size-5 place-items-center rounded-full bg-rose-deep text-white duration-200 ease-out-quint animate-in fade-in-0 zoom-in-50";

export const SEPARATOR = "-mx-2 my-1.5 h-px bg-forest/[0.08] dark:bg-white/10";

/**
 * The pickers' own buttons inside a card (a day, an hour, a month): round, 44px, ringed on hover,
 * filled rose when chosen, as the range picker draws its days. `data-chosen` marks the chosen one
 * (the ARIA state that says so to a screen reader sits on the button or its cell).
 */
export const CELL =
  "relative grid h-11 min-w-11 place-items-center rounded-full text-[15px] font-medium text-forest tabular-nums transition-[background-color,color,box-shadow] duration-150 outline-offset-2 hover:shadow-[inset_0_0_0_1.5px_rgba(42,15,31,0.55)] disabled:cursor-default disabled:text-forest/25 disabled:hover:shadow-none data-[chosen]:bg-rose data-[chosen]:font-semibold data-[chosen]:text-white data-[chosen]:shadow-[0_6px_14px_-6px_rgba(214,51,108,0.7)]";

/** A picker card's small capitals heading over a group of cells. */
export const GROUP_LABEL =
  "px-1 pb-2 text-[11.5px] font-semibold tracking-wide text-forest/55 uppercase";

/** A card's footer button: Clear and the like, quiet; Done in the site's rose. */
export const QUIET_BUTTON =
  "h-11 rounded-full px-4 text-[14.5px] font-semibold text-forest/75 underline-offset-4 transition-colors hover:text-forest hover:underline disabled:opacity-35 disabled:hover:no-underline";
export const DONE_BUTTON =
  "btn-rose h-11 rounded-full px-6 text-[15px] font-semibold transition-[filter,transform] hover:brightness-110 active:scale-[0.98]";

/**
 * The fields that open a picker, in the two looks forms here use. "field" is the editor's (the
 * ui/input look: an 8px-round box with the app's border); a form can hand its own classes instead
 * to match the fields around it. 16px on a phone and 14px from md up, as ui/input's text is.
 */
export const FIELD_TRIGGER =
  "group flex h-11 w-full min-w-0 items-center gap-2.5 rounded-lg border border-input bg-transparent px-3 text-left text-base text-foreground md:text-sm transition-[border-color,box-shadow] outline-none hover:border-ink/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-rose/50 data-[state=open]:shadow-[0_0_0_4px_rgba(178,58,94,0.12)] [&:focus-visible:not([data-quiet])]:border-ring [&:focus-visible:not([data-quiet])]:ring-3 [&:focus-visible:not([data-quiet])]:ring-ring/50";

/** The chevron at a field's end, turning while its card is open. */
export const FIELD_CHEVRON =
  "ml-auto size-4 shrink-0 text-forest/45 transition-transform duration-250 ease-out-quint group-data-[state=open]:rotate-180";
