"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { Art } from "@/components/templates/page/art";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { LetterWhere } from "@/lib/lifecycle/date-letter-flag";
import { cn } from "@/lib/utils";

/** `blocked` carries its own mail link to support (letter-N4), so it is drawn, not a plain string. */
export type LetterBoxWords = Record<"title" | "line" | "emailLabel" | "send" | "privacy" | "asked" | "another" | "on" | "invalid" | "limited" | "failed", string> & { blocked: ReactNode };
export type LetterBoxState = "empty" | "sending" | "asked" | "on" | "blocked" | "invalid" | "limited" | "failed";

const PLAIN_ADDRESS = /^\S+@\S+\.\S+$/;

/**
 * The date letter's box (lib/lifecycle/date-letter.ts): one e-mail field with its label, one button,
 * one sentence and a link to the privacy text. Until the server says the list exists (GET
 * /api/date-letter, asked when the box nears the screen or has already been scrolled past) the box
 * holds its place, drawn but invisible and inert, so its arrival moves nothing (letter-C12); if the
 * answer is no, it folds to nothing. Signed in, the field holds the account's own address and still
 * has to be pressed. Its words come as props (LetterSlot reads them on the server), so no message
 * namespace is sent to the browser for it. Nothing is kept in the browser.
 *
 * Every state draws in one area of fixed height, so pressing the button never moves the page. Focus
 * stays on the button while it sends (aria-disabled, never disabled: a disabled button drops focus to
 * the page), goes to the line that replaces the form when it is done (read once: letter-T12), and to
 * the field when the address needs another look. Errors are read from one status line that keeps its
 * role; a typed correction clears "Check the email address." at once (letter-T7).
 */
export function LetterBox({
  where,
  locale,
  variant,
  ground,
  words: w,
  preview,
}: {
  where: LetterWhere;
  locale: "en" | "es";
  variant: "card" | "band";
  /** The card only: the paper it stands on, edge to edge, where the page's last band is not the page's own paper (Long distance ends on blush). */
  ground?: "blush";
  words: LetterBoxWords;
  /** Development only: draws this state at once and asks the server nothing. */
  preview?: { state: LetterBoxState; email?: string };
}) {
  // "wait": held in place, unseen, until the server answers; "no": the list isn't there, nothing drawn.
  const [drawn, setDrawn] = useState<"wait" | "yes" | "no">(preview ? "yes" : "wait");
  const [state, setState] = useState<LetterBoxState>(preview?.state ?? "empty");
  const [prefill, setPrefill] = useState(preview?.email ?? "");
  // A new form after "Use another address": a fresh, empty field.
  const [formKey, setFormKey] = useState(0);
  const slot = useRef<HTMLElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const doneLine = useRef<HTMLParagraphElement>(null);
  const busy = state === "sending";
  const done = state === "asked" || state === "on" || state === "blocked";
  const doneWords = state === "on" ? w.on : state === "blocked" ? w.blocked : w.asked;
  const problem = state === "invalid" || state === "limited" || state === "failed";

  // After a press, focus follows the answer: the line that replaced the form, or the field. Never on
  // load (a signed-in reader already on the list is not pulled down the page).
  const pressed = useRef(false);
  useEffect(() => {
    if (!pressed.current || state === "sending") return;
    pressed.current = false;
    if (state === "asked" || state === "on" || state === "blocked") doneLine.current?.focus();
    else if (state === "invalid") field.current?.focus();
  }, [state]);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    const ask = async () => {
      try {
        const res = await fetch("/api/date-letter", { cache: "no-store" });
        const json = res.ok ? ((await res.json()) as { available?: boolean; email?: string | null; state?: string }) : null;
        if (cancelled) return;
        if (json?.available !== true) return setDrawn("no");
        setPrefill(json.email ?? "");
        setState(json.state === "on" ? "on" : "empty");
        setDrawn("yes");
      } catch {
        // No box: nothing is lost by not drawing it.
        if (!cancelled) setDrawn("no");
      }
    };
    const el = slot.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void ask();
      return () => {
        cancelled = true;
      };
    }
    const seen = new IntersectionObserver(
      (entries) => {
        // Near the screen, or already above it (a reader who flicked past before the page woke: letter-T8).
        if (!entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) return;
        seen.disconnect();
        void ask();
      },
      { rootMargin: "800px 0px" },
    );
    seen.observe(el);
    return () => {
      cancelled = true;
      seen.disconnect();
    };
  }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    pressed.current = true;
    const typed = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!typed || !PLAIN_ADDRESS.test(typed)) {
      setState("invalid");
      pressed.current = false;
      field.current?.focus();
      return;
    }
    setPrefill(typed);
    setState("sending");
    if (preview) return;
    let next: LetterBoxState = "failed";
    try {
      const res = await fetch("/api/date-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: typed, locale, path: window.location.pathname }),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { state?: string };
        track("letter_asked", { where });
        next = json.state === "on" ? "on" : json.state === "blocked" ? "blocked" : "asked";
      } else if (res.status === 400) next = "invalid";
      else if (res.status === 429) next = "limited";
    } catch {
      next = "failed";
    }
    setState(next);
  }


  function another() {
    setPrefill("");
    setFormKey((k) => k + 1);
    setState("empty");
    requestAnimationFrame(() => field.current?.focus());
  }

  if (drawn === "no") return <div data-letter-slot />;
  const waiting = drawn === "wait";

  const band = variant === "band";
  const statusLine = state === "invalid" ? w.invalid : state === "limited" ? w.limited : state === "failed" ? w.failed : "";

  const body = (
    <>
      <h2 id={waiting ? undefined : `letter-title-${where}`} className={cn("font-display text-[1.625rem] leading-tight italic", band ? "text-page-ink" : "max-w-[calc(100%-7rem)] text-ink sm:max-w-[calc(100%-8rem)]")}>
        {w.title}
      </h2>
      <p className={cn("mt-2 text-[0.9375rem] leading-relaxed", band ? "text-page-body" : "text-ink-soft")}>{w.line}</p>
      {/* One area of fixed height holds the label and form (or the line that replaced them) and the one
          status line under it: label, two rows of 48 px and a line on a phone (two lines under 360 px, where
          an error can wrap); label, one row and a line from 640 px. A line that replaced the form sits in
          the middle of it (letter-T6). */}
      <div className={cn("mt-5 flex min-h-[11.875rem] flex-col min-[360px]:min-h-[10.375rem] sm:min-h-[6.625rem]", done && "justify-center")}>
        {done ? (
          <div className="flex flex-col items-start gap-1">
            <p
              ref={doneLine}
              tabIndex={-1}
              className={cn("flex items-start gap-2 text-[0.9375rem] leading-relaxed outline-none", band ? "text-page-ink" : "text-ink")}
              data-testid="letter-done"
            >
              <MailCheck aria-hidden className="mt-0.5 size-[1.125rem] shrink-0" />
              {/* One flex item, so a line with a link in it flows as one sentence. */}
              <span>{doneWords}</span>
            </p>
            {state === "asked" || state === "blocked" ? (
              <button
                type="button"
                onClick={another}
                className={cn(
                  "-ml-1 inline-flex min-h-11 items-center rounded-md px-1 text-sm underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70",
                  band ? "text-page-body hover:text-page-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                {w.another}
              </button>
            ) : null}
          </div>
        ) : (
          <form key={formKey} noValidate onSubmit={submit}>
            <label htmlFor={`letter-email-${where}`} className={cn("mb-1.5 block text-sm leading-5 font-medium", band ? "text-page-ink" : "text-ink")}>
              {w.emailLabel}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={field}
                id={`letter-email-${where}`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={prefill}
                readOnly={busy}
                onInput={() => {
                  if (state === "invalid") setState("empty");
                }}
                aria-invalid={state === "invalid" || undefined}
                aria-describedby={problem ? `letter-status-${where}` : undefined}
                data-testid="letter-email"
                className={cn(
                  "h-12 w-full min-w-0 shrink-0 rounded-full border px-5 sm:w-auto sm:flex-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive read-only:opacity-80",
                  band ? "border-page-line bg-page-ground text-page-ink" : "border-line bg-paper text-ink",
                )}
              />
              <button
                type="submit"
                aria-disabled={busy || undefined}
                data-testid="letter-send"
                className="btn-rose inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-semibold outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-disabled:translate-y-0 aria-disabled:cursor-wait aria-disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {w.send}
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowRight aria-hidden className="size-4" />}
              </button>
            </div>
          </form>
        )}
        {/* Always a status region (its role never changes after mount); an error inside it is an alert. */}
        <p id={`letter-status-${where}`} role="status" data-testid="letter-status" className={cn("mt-2 text-sm leading-6", !done && "min-h-12 min-[360px]:min-h-6", band ? "text-page-ink" : "text-ink")}>
          {problem ? <span role="alert">{statusLine}</span> : null}
        </p>
      </div>
      <Link
        href="/legal/privacy#date-letter"
        className={cn(
          "-mb-2 inline-flex min-h-11 items-center rounded-md text-sm underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50",
          band ? "text-page-body hover:text-page-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {w.privacy}
      </Link>
    </>
  );

  // Held in place while the server is asked: the same box, unseen and out of reach, so nothing moves when it shows.
  const hold = waiting ? ({ "aria-hidden": true, inert: true, "data-letter-wait": "" } as const) : {};
  const named = waiting ? {} : { "data-testid": "letter-box", "aria-labelledby": `letter-title-${where}` };
  if (band) {
    return (
      <div
        ref={slot as RefObject<HTMLDivElement>}
        data-letter-slot
        {...named}
        {...(waiting ? {} : { role: "region" })}
        {...hold}
        className={cn("mt-8 border-t border-page-line pt-6", waiting && "invisible")}
      >
        {body}
      </div>
    );
  }
  const card = (
    <section ref={slot} data-letter-slot {...named} {...hold} className={cn("container-x py-10 lg:py-14", waiting && "invisible")}>
      <div className="relative mx-auto max-w-[34rem] rounded-[28px] border border-line bg-card px-6 pt-7 pb-6 shadow-soft sm:px-8 sm:pt-8">
        <Art id="lily-side" flowers={DEFAULT_PAGE_THEME.flowers} shown="150px" className="pointer-events-none absolute -top-14 right-1 w-[132px] rotate-[-8deg] select-none sm:w-[150px]" />
        {body}
      </div>
    </section>
  );
  // The band of paper stays while the box is asked for (its place is held), and goes with it when there is no list.
  return ground === "blush" ? <div className="bg-blush-paper">{card}</div> : card;
}
