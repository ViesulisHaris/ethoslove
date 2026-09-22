"use client";

import type { ReactNode } from "react";
import { PlayingCard, type BackTone } from "./cards";
import { ScreenTop } from "./screen-top";

/** The phone changes hands: one face-down card and a button for the next person. */
export function Handover({ eyebrow, title, note, button, onGo, back = "rose" }: { eyebrow: string; title: string; note?: string; button: string; onGo: () => void; back?: BackTone }) {
  return (
    <section className="container-narrow py-12 text-center sm:py-16">
      <ScreenTop />
      <p className="text-eyebrow text-blush">{eyebrow}</p>
      <PlayingCard faceDown back={back} className="mx-auto mt-6 aspect-[5/7] w-44 rotate-[-4deg] sm:w-52" />
      <h1 className="mt-8 display-md text-cream">{title}</h1>
      {note ? <p className="mt-2 text-[15px] text-cream/60">{note}</p> : null}
      <button type="button" onClick={onGo} className="btn-rose mt-7 h-12 rounded-full px-8 text-[15px] font-semibold">
        {button}
      </button>
    </section>
  );
}

export function Waiting({ text, peerGone }: { text: string; peerGone?: ReactNode }) {
  return (
    <section className="container-narrow py-16 text-center" aria-live="polite">
      <ScreenTop />
      {peerGone}
      <PlayingCard faceDown back="lilac" className="mx-auto aspect-[5/7] w-40 animate-pulse rotate-[3deg]" />
      <p className="mt-8 font-display text-[26px] text-cream">{text}</p>
    </section>
  );
}
