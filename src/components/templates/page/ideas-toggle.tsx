"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "See more examples": opens every idea card in the grid it points at, so each shows its line to
 * borrow, and closes them again. The cards are native <details> and open one by one without this;
 * the button is only the quick way to read all six.
 */
export function IdeasToggle({ target, show, hide, className }: { target: string; show: string; hide: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={target}
      onClick={() => {
        const next = !open;
        document.getElementById(target)?.querySelectorAll("details").forEach((card) => {
          card.open = next;
        });
        setOpen(next);
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-page-ink/25 px-5 text-sm font-medium text-page-ink transition-[background-color,border-color,scale] duration-200 hover:border-page-ink/45 hover:bg-page-raised active:scale-[0.98]",
        className,
      )}
    >
      {open ? hide : show}
      <ArrowRight aria-hidden="true" className={cn("size-3.5 transition-transform duration-200", open && "-rotate-90")} />
    </button>
  );
}
