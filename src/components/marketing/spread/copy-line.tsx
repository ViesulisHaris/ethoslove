"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

/**
 * "Copy", beside a card's line to borrow. The card shows a line in handwriting and its "Make this
 * gift" opens an empty editor: on a phone the visitor had to remember the line, or go back for it
 * (the test of 23 Nov 2026). One tap puts it on the clipboard, to paste into the field the card
 * names: the whole line as it was written for that field, where the card shows only its opening
 * (a short note is shown by its first sentence). A run of bubbles is copied one to a row, which
 * is how a Text Thread takes them.
 *
 * Carrying the line into the editor itself is the better answer and belongs to the editor: this
 * is the part a page can do alone. It counts nothing and sends nothing.
 *
 * It is drawn only once the page's script is running: without script a button that copies nothing
 * is not shown. Its own height is a thumb's (44px) and it takes a label's room in the card, so an
 * opened card is no taller for it.
 */
export function CopyLine({
  text,
  label,
  done,
  field,
  className,
}: {
  text: string;
  label: string;
  done: string;
  /** The name of the field the line goes in. Every opened card has a "Copy", so each one says what it copies. */
  field: string;
  className?: string;
}) {
  const ready = useMounted();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // An older browser, or one that keeps the clipboard from a page: the way that needs no permission.
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
      // The field took the focus to be selected, and taking it out of the page dropped the focus to the page's top: the
      // next Tab went to "Skip to content" (the deep test of 23 Nov 2026). It goes back to the button it came from.
      button.current?.focus({ preventScroll: true });
    }
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button
      ref={button}
      type="button"
      aria-label={`${copied ? done : label}: ${field}`}
      hidden={!ready}
      onClick={copy}
      data-testid="idea-copy"
      data-copied={copied ? "" : undefined}
      className={cn("-my-3.5 -mr-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-1 text-page-label text-page-accent outline-offset-0 transition-colors hover:text-page-accent-hover active:opacity-70 motion-reduce:transition-none", className)}
    >
      {copied ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2} /> : <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.8} />}
      {/* Said to a screen reader when it changes: the button's own words are its news. */}
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
