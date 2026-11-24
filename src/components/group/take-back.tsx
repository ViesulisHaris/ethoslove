"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { isolated } from "@/lib/group/bidi";
import type { KeptNote } from "@/lib/group/kept";
import { groupWriteInLink } from "@/lib/group/report";
import { cn } from "@/lib/utils";

/**
 * "Take my note back", in words and in looks, for the two pages that offer it: the page at a group
 * card's link (contribute-form.tsx) and the one a link turns into once it opens no card
 * (link-gone.tsx with gone-take-back.tsx). One set of each, so the two can't drift apart.
 */
export const TAKE_BACK = {
  en: {
    takeBack: "Take my note back",
    takeBackOf: "Take back the note from {name}",
    takingBack: "Taking it back…",
    takenTitle: "Your note has been taken back.",
    takenOne: "The note from {name} has been taken back.",
    sentAwayTitle: "This card has been sent.",
    // Under "This card has been sent.", which the page becomes when a note can no longer be taken back.
    tooLate: "Write to {support} and we'll take your note out.",
    // The server no longer finds the note this browser holds the key to. A headline when that was the
    // last note here, and one sentence with the next where the page has a headline of its own.
    notHereTitle: "That note can't be taken back from here any more.",
    notHereDo: "Write to {support} and we'll take it out.",
    error: "That didn't go through. Try again in a moment.",
  },
  es: {
    takeBack: "Retirar mi nota",
    // A colon, not "de": people sign as "El abuelo" and "Los García", and "de El abuelo" is not Spanish.
    takeBackOf: "Retirar la nota: {name}",
    takingBack: "Retirándola…",
    takenTitle: "Tu nota se ha retirado.",
    takenOne: "Nota retirada: {name}.",
    sentAwayTitle: "Esta tarjeta ya se ha enviado.",
    tooLate: "Escribe a {support} y quitamos tu nota.",
    notHereTitle: "Esa nota ya no se puede retirar desde aquí.",
    notHereDo: "Escribe a {support} y la quitamos.",
    error: "No se ha podido enviar. Inténtalo en un momento.",
  },
} as const;

export const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

// Coral as it is on the site reads at 4.1 to 1 on the night ground, under what small text needs:
// the lines that tell someone why their note was refused are the last that should be hard to
// read. The same coral, lightened until it passes (6 to 1), for words; the icon keeps the brand's own.
export const WARN = "text-[color-mix(in_oklab,var(--color-coral)_70%,white)]";
export const QUIET = "inline-flex min-h-11 items-center gap-1.5 text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";
// A link inside a sentence: a thumb's worth of room round it that moves no line, and a focus ring drawn round the word itself.
export const INLINE = "group -mx-1.5 -my-3.5 inline-block px-1.5 py-3.5 hover:text-paper focus-visible:outline-none";
export const INLINE_WORD = "rounded-sm underline underline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-coral";

/**
 * What to do once the page can no longer take a note back: a sentence with one "{support}" in it,
 * drawn with the address as a link that opens an email (with the page's reference in its subject,
 * where the page has one), not a string to select by hand on a phone.
 */
export function WriteIn({ text, reportRef, locale }: { text: string; reportRef: string | null; locale: "en" | "es" }) {
  const [before, after = ""] = text.split("{support}");
  return (
    <p role="alert" className="mt-4 text-sm leading-relaxed [overflow-wrap:anywhere] text-paper/80" data-testid="contribute-write-in">
      {before}
      <a href={groupWriteInLink(reportRef, locale)} className={cn(INLINE, "text-paper")} data-testid="contribute-write-in-link">
        <span className={INLINE_WORD}>{BRAND.supportEmail}</span>
      </a>
      {after}
    </p>
  );
}

/**
 * The notes this browser can still take back, each with its own button (named once there is more
 * than one to tell apart, or once something has just been said about another), and what the last
 * tap came to.
 */
export function TakeBack({
  locale,
  notes,
  takingBack,
  tookBack,
  writeIn,
  named,
  over,
  problem,
  onTakeBack,
}: {
  locale: "en" | "es";
  notes: KeptNote[];
  /** The secret of the note being taken back right now. */
  takingBack: string | null;
  /** The name on the note the last tap took back. */
  tookBack: string | null;
  /** The line that sends someone to write in, when the last tap could not take the note back. */
  writeIn: ReactNode;
  named: boolean;
  /** Nothing can be taken back from here any more (the card was sent): no buttons. */
  over: boolean;
  problem: string | null;
  onTakeBack: (note: KeptNote) => void;
}) {
  const t = TAKE_BACK[locale];
  return (
    <>
      {tookBack !== null ? (
        <p role="status" className="mt-3 text-sm [overflow-wrap:anywhere] text-paper/80" data-testid="contribute-took-back">
          {fill(t.takenOne, { name: isolated(tookBack) })}
        </p>
      ) : null}
      {writeIn}
      {over ? null : (
        <div className={cn("flex flex-col items-center", notes.length > 0 && "mt-4")}>
          {notes.map((note) => (
            <button key={note.s} type="button" onClick={() => onTakeBack(note)} disabled={takingBack !== null} className={cn(QUIET, "underline [overflow-wrap:anywhere] disabled:opacity-60")} data-testid="contribute-take-back">
              {takingBack === note.s ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {takingBack === note.s ? t.takingBack : named ? fill(t.takeBackOf, { name: isolated(note.n) }) : t.takeBack}
            </button>
          ))}
        </div>
      )}
      {problem ? (
        <p role="alert" className={cn("mt-2 text-sm", WARN)}>
          {problem}
        </p>
      ) : null}
    </>
  );
}
