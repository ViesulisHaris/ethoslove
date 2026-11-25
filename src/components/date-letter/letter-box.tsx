"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { Art } from "@/components/templates/page/art";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { LetterWhere } from "@/lib/lifecycle/date-letter-flag";
import { cn } from "@/lib/utils";

export type LetterBoxWords = Record<"title" | "line" | "emailLabel" | "send" | "privacy" | "asked" | "another" | "on" | "invalid" | "limited" | "failed", string>;
export type LetterBoxState = "empty" | "sending" | "asked" | "on" | "invalid" | "limited" | "failed";

const PLAIN_ADDRESS = /^\S+@\S+\.\S+$/;

/**
 * The date letter's box (lib/lifecycle/date-letter.ts): one e-mail field, one button, one sentence and
 * a link to the privacy text. Drawn nothing until it nears the screen and the server says the list
 * exists (GET /api/date-letter answers `available: true`); signed in, the field holds the account's
 * own address and still has to be pressed. Its words come as props (LetterSlot reads them on the
 * server), so no message namespace is sent to the browser for it. Nothing is kept in the browser.
 *
 * Every state draws in one area of fixed height, so pressing the button never moves the page. Focus
 * stays on the button while it sends (aria-disabled, never disabled: a disabled button drops focus to
 * the page), goes to the line that replaces the form when it is done, and to the field when the
 * address needs another look.
 */
export function LetterBox({
  where,
  locale,
  variant,
  words: w,
  preview,
}: {
  where: LetterWhere;
  locale: "en" | "es";
  variant: "card" | "band";
  words: LetterBoxWords;
  /** Development only: draws this state at once and asks the server nothing. */
  preview?: { state: LetterBoxState; email?: string };
}) {
  const [drawn, setDrawn] = useState(Boolean(preview));
  const [state, setState] = useState<LetterBoxState>(preview?.state ?? "empty");
  const [prefill, setPrefill] = useState(preview?.email ?? "");
  // A new form after "Use another address": a fresh, empty field.
  const [formKey, setFormKey] = useState(0);
  const slot = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const busy = state === "sending";
  const done = state === "asked" || state === "on";
  const problem = state === "invalid" || state === "limited" || state === "failed";

  // After a press, focus follows the answer: the line that replaced the form, or the field. Never on
  // load (a signed-in reader already on the list is not pulled down the page).
  const pressed = useRef(false);
  useEffect(() => {
    if (!pressed.current || state === "sending") return;
    pressed.current = false;
    if (state === "asked" || state === "on") status.current?.focus();
    else if (state === "invalid") field.current?.focus();
  }, [state]);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    const ask = async () => {
      try {
        const res = await fetch("/api/date-letter", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { available?: boolean; email?: string | null; state?: string };
        if (cancelled || json.available !== true) return;
        setPrefill(json.email ?? "");
        setState(json.state === "on" ? "on" : "empty");
        setDrawn(true);
      } catch {
        // No box: nothing is lost by not drawing it.
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
        if (!entries.some((e) => e.isIntersecting)) return;
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
        next = json.state === "on" ? "on" : "asked";
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

  if (!drawn) return <div data-letter-slot ref={slot} />;

  const band = variant === "band";
  const statusLine = state === "invalid" ? w.invalid : state === "limited" ? w.limited : state === "failed" ? w.failed : "";

  const body = (
    <>
      <h2 id={`letter-title-${where}`} className={cn("font-display text-[1.625rem] leading-tight italic", band ? "text-page-ink" : "max-w-[calc(100%-7rem)] text-ink sm:max-w-[calc(100%-8rem)]")}>
        {w.title}
      </h2>
      <p className={cn("mt-2 text-[0.9375rem] leading-relaxed", band ? "text-page-body" : "text-ink-soft")}>{w.line}</p>
      <div className="mt-5 min-h-[6.75rem] sm:min-h-12">
        {done ? (
          <div className="flex flex-col items-start gap-1">
            <p className={cn("flex items-start gap-2 text-[0.9375rem] leading-relaxed", band ? "text-page-ink" : "text-ink")} data-testid="letter-done">
              <MailCheck aria-hidden className="mt-0.5 size-[1.125rem] shrink-0" />
              {state === "on" ? w.on : w.asked}
            </p>
            {state === "asked" ? (
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
          <form key={formKey} noValidate onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={field}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={w.emailLabel}
              placeholder={w.emailLabel}
              defaultValue={prefill}
              readOnly={busy}
              aria-invalid={state === "invalid" || undefined}
              aria-describedby={problem ? `letter-status-${where}` : undefined}
              data-testid="letter-email"
              className={cn(
                "h-12 w-full min-w-0 shrink-0 rounded-full border px-5 sm:w-auto sm:flex-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive read-only:opacity-80",
                band ? "border-page-line bg-page-ground text-page-ink placeholder:text-page-body/70" : "border-line bg-paper text-ink placeholder:text-ink-soft/70",
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
          </form>
        )}
      </div>
      <p
        ref={status}
        id={`letter-status-${where}`}
        tabIndex={-1}
        role={problem ? "alert" : "status"}
        data-testid="letter-status"
        className={cn("mt-2 min-h-6 text-sm leading-6 outline-none", band ? "text-page-ink" : "text-ink")}
      >
        {statusLine}
        {/* The line that replaced the form, read out where focus lands; shown once, above. */}
        {done ? <span className="sr-only">{state === "on" ? w.on : w.asked}</span> : null}
      </p>
      <Link
        href="/legal/privacy"
        className={cn(
          "-mb-2 inline-flex min-h-11 items-center rounded-md text-sm underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50",
          band ? "text-page-body hover:text-page-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {w.privacy}
      </Link>
    </>
  );

  if (band) {
    return (
      <div data-letter-slot data-testid="letter-box" role="region" aria-labelledby={`letter-title-${where}`} className="mt-8 border-t border-page-line pt-6">
        {body}
      </div>
    );
  }
  return (
    <section data-letter-slot data-testid="letter-box" aria-labelledby={`letter-title-${where}`} className="container-x py-10 lg:py-14">
      <div className="relative mx-auto max-w-[34rem] rounded-[28px] border border-line bg-card px-6 pt-7 pb-6 shadow-soft sm:px-8 sm:pt-8">
        <Art id="lily-side" flowers={DEFAULT_PAGE_THEME.flowers} shown="150px" className="pointer-events-none absolute -top-14 right-1 w-[132px] rotate-[-8deg] select-none sm:w-[150px]" />
        {body}
      </div>
    </section>
  );
}
