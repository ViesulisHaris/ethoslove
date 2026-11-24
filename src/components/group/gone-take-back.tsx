"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";
import { firstRead, parseNotes, storeNotes, tokenInAddress, withStored, type KeptNote } from "@/lib/group/kept";
import { cn } from "@/lib/utils";
import { TAKE_BACK, TakeBack, WriteIn } from "./take-back";

const never = () => () => {};

/**
 * "Take my note back", on the page a link turns into once it opens no card. Someone who added a
 * note, closed the tab and came back after the sender had made a new link was told the link no
 * longer works and nothing else, though their browser still held the key to their note and the
 * server takes a note back by that key alone, whatever became of the link. The privacy policy
 * promises exactly this: from the page it was written on, in the same browser, until the card is
 * sent.
 *
 * Drawn from this browser's own storage and nothing else: the server says the same to every address
 * under /c/ that opens nothing, so for anyone who never wrote a note at this address the page is
 * what it was. The token is read off the address (the page that draws this is never told it), or
 * handed in by the development preview, which lives at another address.
 */
export function GoneTakeBack({ locale, token: given }: { locale: "en" | "es"; token?: string }) {
  const t = TAKE_BACK[locale];
  const token = useSyncExternalStore(never, () => given ?? tokenInAddress(window.location.pathname), () => given ?? null);
  const stored = useSyncExternalStore(never, () => (token ? firstRead(token) : null), () => null);
  const kept = useMemo(() => parseNotes(stored), [stored]);
  const [own, setOwn] = useState<KeptNote[] | undefined>(undefined);
  const notes = own ?? kept;
  const [takingBack, setTakingBack] = useState<string | null>(null);
  const [tookBack, setTookBack] = useState<string | null>(null);
  // What a tap that took nothing back came to: the note is not there, the card has gone out, or the request failed.
  const [ending, setEnding] = useState<"notHere" | "tooLate" | null>(null);
  const [failed, setFailed] = useState(false);
  const part = useRef<HTMLDivElement>(null);

  // The button that was pressed leaves with its note: what happened takes the keyboard's focus, so a
  // screen reader says it and the next Tab carries on from there.
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (landed > 0) part.current?.focus();
  }, [landed]);

  const takeBack = async (note: KeptNote) => {
    if (takingBack || !token) return;
    setTakingBack(note.s);
    setFailed(false);
    const res = await fetch("/api/group/withdraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, withdraw: note.s }) }).catch(() => null);
    setTakingBack(null);
    // Only the server's yes means the note is out; a note it no longer finds is never said to be taken back.
    if (res?.ok || res?.status === 404) {
      const left = withStored(token, notes).filter((other) => other.s !== note.s);
      storeNotes(token, left);
      setOwn(left);
      setTookBack(res.ok ? note.n : null);
      setEnding(res.ok ? null : "notHere");
      if (res.ok) track("group_note_withdrawn");
      setLanded((n) => n + 1);
    } else if (res?.status === 410) {
      // The card went out: nothing can be taken back from a page any more.
      setTookBack(null);
      setEnding("tooLate");
      setLanded((n) => n + 1);
    } else setFailed(true);
  };

  const shown = notes.length > 0 || tookBack !== null || ending !== null;
  return (
    // Nothing of it is in the page for a browser with no note here. (A 404 is drawn by the browser in
    // one go, this part with it, so the lines above it are never seen without it and never jump.)
    <div ref={part} tabIndex={-1} className={cn("max-w-sm flex-col items-center focus:outline-none", shown ? "flex" : "hidden")} data-testid="gone-take-back">
      <TakeBack
        locale={locale}
        notes={notes}
        takingBack={takingBack}
        tookBack={tookBack}
        writeIn={ending ? <WriteIn text={ending === "tooLate" ? `${t.sentAwayTitle} ${t.tooLate}` : `${t.notHereTitle} ${t.notHereDo}`} reportRef={null} locale={locale} /> : null}
        named={notes.length > 1 || tookBack !== null || ending !== null}
        over={ending === "tooLate"}
        problem={failed ? t.error : null}
        onTakeBack={(note) => void takeBack(note)}
      />
    </div>
  );
}
