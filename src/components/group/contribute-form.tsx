"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { CircleCheck, ImagePlus, Loader2, Lock, PenLine, Undo2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { BRAND } from "@/config/brand";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { track } from "@/lib/analytics/track";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { groupAgeLine, groupEmailConsent, groupNotice, groupPhotoRule } from "@/lib/group/notice";
import { cn } from "@/lib/utils";

/** In the card's own language, like the keep page: this page sits off a gift, not on the site. */
const S = {
  en: {
    title: "Add your note for {for}",
    blurb: "{from} is putting a group card together.",
    name: "Your name",
    note: "Your note",
    count: "{n} of {max}",
    photo: "Add a photo",
    photoChange: "Change photo",
    photoRemove: "Remove photo",
    photoReading: "Preparing your photo…",
    photoAlt: "The photo you added",
    email: "Email me the finished card",
    emailField: "Your email",
    send: "Add my note",
    sending: "Adding…",
    privacy: "Privacy",
    report: "Report this page",
    sentTitle: "Your note is with {from}.",
    sentInbox: "Check your inbox to confirm your address.",
    takeBack: "Take my note back",
    takingBack: "Taking it back…",
    another: "Add another note",
    takenTitle: "Your note has been taken back.",
    tooLate: "The card has already been sent. Write to {support} and we'll take your note out.",
    own: "Make a gift of your own",
    fullTitle: "This card has all the notes it can hold.",
    closedTitle: "{from} has closed this link.",
    sentAwayTitle: "This card has been sent.",
    invalid: "Add your name and a note, and tick the box.",
    no_links: "A note can't carry a web address. Take it out and try again.",
    bad_photo: "That photo couldn't be used. Try a JPEG or a PNG.",
    too_large: "That photo is too big. Try a smaller one.",
    invalid_email: "Check the email address.",
    limited: "Too many notes from this connection. Try again in an hour.",
    error: "That didn't go through. Try again in a moment.",
  },
  es: {
    title: "Añade tu nota para {for}",
    blurb: "{from} está preparando una tarjeta en grupo.",
    name: "Tu nombre",
    note: "Tu nota",
    count: "{n} de {max}",
    photo: "Añadir una foto",
    photoChange: "Cambiar la foto",
    photoRemove: "Quitar la foto",
    photoReading: "Preparando tu foto…",
    photoAlt: "La foto que has añadido",
    email: "Envíame la tarjeta terminada",
    emailField: "Tu correo",
    send: "Añadir mi nota",
    sending: "Añadiendo…",
    privacy: "Privacidad",
    report: "Denunciar esta página",
    sentTitle: "Tu nota ya la tiene {from}.",
    sentInbox: "Mira tu correo para confirmar tu dirección.",
    takeBack: "Retirar mi nota",
    takingBack: "Retirándola…",
    another: "Añadir otra nota",
    takenTitle: "Tu nota se ha retirado.",
    tooLate: "La tarjeta ya se ha enviado. Escribe a {support} y quitamos tu nota.",
    own: "Haz tu propio regalo",
    fullTitle: "En esta tarjeta ya no caben más notas.",
    closedTitle: "{from} ha cerrado este enlace.",
    sentAwayTitle: "Esta tarjeta ya se ha enviado.",
    invalid: "Pon tu nombre y una nota, y marca la casilla.",
    no_links: "Una nota no puede llevar una dirección web. Quítala y vuelve a intentarlo.",
    bad_photo: "Esa foto no se ha podido usar. Prueba con un JPEG o un PNG.",
    too_large: "Esa foto pesa demasiado. Prueba con una más pequeña.",
    invalid_email: "Revisa la dirección de correo.",
    limited: "Demasiadas notas desde esta conexión. Vuelve a probar en una hora.",
    error: "No se ha podido enviar. Inténtalo en un momento.",
  },
} as const satisfies Record<GiftLocale, Record<string, string>>;

type Problem = "invalid" | "no_links" | "bad_photo" | "too_large" | "invalid_email" | "limited" | "error";
/** What the page is: taking a note, or one of the ends a link comes to. */
export type ContributeState = "open" | "full" | "closed" | "sent";
type Stage = ContributeState | "done" | "taken";

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const withdrawKey = (token: string) => `ethos:group-note:${token}`;
/** The secret this tab kept for a note it added here, or null (and null where storage is off). */
function keptSecret(token: string): string | null {
  try {
    return window.sessionStorage.getItem(withdrawKey(token));
  } catch {
    return null;
  }
}
function forget(token: string) {
  try {
    window.sessionStorage.removeItem(withdrawKey(token));
  } catch {
    // Nothing was kept.
  }
}
const never = () => () => {};

const reportLink = (ref: string) =>
  `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`Report group card ${ref}`)}&body=${encodeURIComponent(`Group card: ${ref}\n\nWhat is wrong with it, and why (for example: offensive, someone's personal details, illegal):\n\n\nYour name:\n\nI believe the information in this report is accurate and complete.`)}`;

/**
 * The page at a group card's link: a name, a note and, if they like, one photo and an address to be
 * sent the finished card. No account, no price, nothing to pay. What is typed here is a stranger's
 * words to the server (which cleans them again) and waits for the sender's yes before it reaches
 * the card. The fields keep their own values (uncontrolled), so a name typed before the page has
 * finished loading is not wiped by its first re-render.
 */
export function ContributeForm({
  token,
  state: initial,
  locale,
  fromName,
  forName,
  prompt,
  noteMax,
  takesPhotos,
  reportRef,
}: {
  token: string;
  state: ContributeState;
  locale: GiftLocale;
  fromName: string;
  forName: string;
  prompt: string | null;
  noteMax: number;
  takesPhotos: boolean;
  reportRef: string;
}) {
  const t = S[locale] ?? S.en;
  const prefix = locale === "es" ? "/es" : "";
  const reduce = useReducedMotion();
  const [picked, setStage] = useState<Stage>(initial);
  // A note already added from this tab: after a reload the page comes back to "Take my note back".
  // Read after hydration (the server knows nothing of it); `own` is what this visit has done since.
  const kept = useSyncExternalStore(never, () => keptSecret(token), () => null);
  const [own, setOwn] = useState<string | null | undefined>(undefined);
  const withdraw = own === undefined ? kept : own;
  const stage: Stage = picked === "open" && own === undefined && kept ? "done" : picked;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [count, setCount] = useState(0);
  const [wantsEmail, setWantsEmail] = useState(false);
  const [leftEmail, setLeftEmail] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [takingBack, setTakingBack] = useState(false);
  const [tooLate, setTooLate] = useState(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // The words sit under the button, which can be at the foot of a phone's screen.
  useEffect(() => {
    if (problem) alert.current?.scrollIntoView({ block: "nearest" });
  }, [problem]);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProblem(null);
    setReading(true);
    try {
      // The editor's own photo step (and its HEIC decoder), fetched only once someone picks a photo.
      const { processImageFile } = await import("@/lib/editor/image");
      const { blob } = await processImageFile(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setProblem("bad_photo");
    } finally {
      setReading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || reading) return;
    const fields = new FormData(event.currentTarget);
    const body = new FormData();
    body.set("token", token);
    body.set("name", String(fields.get("name") ?? ""));
    body.set("note", String(fields.get("note") ?? ""));
    if (fields.get("agree")) body.set("agree", "1");
    const address = wantsEmail ? String(fields.get("email") ?? "").trim() : "";
    if (address) body.set("email", address);
    if (photo && takesPhotos) body.set("photo", new File([photo.blob], "photo", { type: photo.blob.type || "image/jpeg" }));
    setBusy(true);
    setProblem(null);
    const res = await fetch("/api/group/contribute", { method: "POST", body }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      const data = (await res.json().catch(() => null)) as { withdraw?: string } | null;
      const secret = typeof data?.withdraw === "string" ? data.withdraw : null;
      try {
        if (secret) window.sessionStorage.setItem(withdrawKey(token), secret);
      } catch {
        // Kept for this visit only, then.
      }
      setOwn(secret);
      setLeftEmail(Boolean(address));
      track("group_note_added", { photo: Boolean(photo), email: Boolean(address) });
      setStage("done");
      return;
    }
    const error = res ? (((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "") : "";
    if (res?.status === 409 && error === "full") setStage("full");
    else if (res?.status === 410) setStage(error === "sent" ? "sent" : "closed");
    else if (res?.status === 429) setProblem("limited");
    else if (res?.status === 413) setProblem("too_large");
    else if (error === "no_links" || error === "bad_photo" || error === "invalid_email" || error === "invalid" || error === "too_large") setProblem(error);
    else setProblem("error");
  };

  const takeBack = async () => {
    if (!withdraw || takingBack) return;
    setTakingBack(true);
    const res = await fetch("/api/group/withdraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, withdraw }) }).catch(() => null);
    setTakingBack(false);
    if (res?.ok || res?.status === 404) {
      forget(token);
      setOwn(null);
      track("group_note_withdrawn");
      setStage("taken");
    } else if (res?.status === 410) setTooLate(true);
    else setProblem("error");
  };

  const again = () => {
    forget(token);
    setOwn(null);
    setPhoto(null);
    setCount(0);
    setWantsEmail(false);
    setLeftEmail(false);
    setProblem(null);
    setStage("open");
  };

  const field = "w-full border border-white/15 bg-white/8 px-5 text-base text-paper placeholder:text-paper/40 focus:border-coral focus:outline-none";
  const quiet = "inline-flex min-h-11 items-center gap-1.5 text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";
  const Icon = stage === "open" ? PenLine : stage === "done" ? CircleCheck : stage === "taken" ? Undo2 : Lock;
  const ended = stage === "full" ? t.fullTitle : stage === "closed" ? fill(t.closedTitle, { from: fromName }) : stage === "sent" ? t.sentAwayTitle : stage === "taken" ? t.takenTitle : null;

  return (
    <div lang={locale} translate="no" className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 py-12 text-center text-paper" data-testid="contribute" data-stage={stage}>
      <div className="grain-overlay" />
      <LogoMark className="size-10" />
      <motion.div
        key={stage === "open" ? "open" : "end"}
        // The same first frame on the server and in the browser; with reduced motion it simply arrives.
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 16, delay: 0.1 }}
        className="mt-7 grid size-16 place-items-center rounded-full bg-white/8"
      >
        <Icon aria-hidden="true" className="size-6 text-coral" />
      </motion.div>

      {stage === "open" ? (
        <>
          <h1 className="mt-6 max-w-sm text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }}>
            {fill(t.title, { for: forName })}
          </h1>
          <p className="mt-2 max-w-xs text-sm [overflow-wrap:anywhere] text-paper/70">{fill(t.blurb, { from: fromName })}</p>
          {prompt ? (
            <p className="mt-4 max-w-xs text-[1.05rem] leading-snug italic [overflow-wrap:anywhere] text-paper/90" style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-prompt">
              “{prompt}”
            </p>
          ) : null}

          <form onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-3 text-left" data-testid="contribute-form" noValidate>
            <input
              type="text"
              name="name"
              required
              maxLength={GROUP_LIMITS.entryName}
              autoComplete="given-name"
              autoCapitalize="words"
              placeholder={t.name}
              aria-label={t.name}
              onChange={() => problem === "invalid" && setProblem(null)}
              className={cn(field, "h-12 rounded-full")}
              data-testid="contribute-name"
            />
            <div className="relative">
              <textarea
                name="note"
                required
                rows={4}
                maxLength={noteMax}
                placeholder={t.note}
                aria-label={t.note}
                aria-describedby="note-count"
                onChange={(event) => {
                  setCount(event.target.value.length);
                  if (problem === "invalid" || problem === "no_links") setProblem(null);
                }}
                className={cn(field, "block min-h-32 resize-none rounded-3xl pt-3.5 pb-8 leading-relaxed")}
                data-testid="contribute-note"
              />
              <span id="note-count" className={cn("pointer-events-none absolute right-5 bottom-2.5 text-xs tabular-nums", count >= noteMax ? "text-coral" : "text-paper/50")} data-testid="contribute-count">
                {fill(t.count, { n: count, max: noteMax })}
              </span>
            </div>

            {takesPhotos ? (
              <div className="mt-1">
                <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="contribute-photo-input" />
                {photo ? (
                  <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-2.5" data-testid="contribute-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a picture still on this phone */}
                    <img src={photo.url} alt={t.photoAlt} className="size-16 shrink-0 rounded-2xl object-cover" />
                    <button type="button" onClick={() => picker.current?.click()} className={cn(quiet, "min-w-0 flex-1 justify-start")}>
                      {t.photoChange}
                    </button>
                    <button type="button" onClick={() => setPhoto(null)} aria-label={t.photoRemove} className="grid size-11 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-white/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral" data-testid="contribute-photo-remove">
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => picker.current?.click()}
                    disabled={reading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/25 text-sm text-paper/80 hover:border-white/50 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-60"
                    data-testid="contribute-photo-add"
                  >
                    {reading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-4" />}
                    <span>{reading ? t.photoReading : t.photo}</span>
                  </button>
                )}
                <p className="mt-2 px-1 text-xs text-paper/50">{groupPhotoRule(locale)}</p>
              </div>
            ) : null}

            <div className="mt-1 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={wantsEmail} onChange={(event) => setWantsEmail(event.target.checked)} className="size-5 shrink-0 accent-coral" data-testid="contribute-wants-email" />
                <span className="min-w-0">{t.email}</span>
              </label>
              {wantsEmail ? (
                <div className="pt-1 pb-3">
                  <input
                    type="email"
                    name="email"
                    maxLength={254}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={t.emailField}
                    aria-label={t.emailField}
                    aria-describedby="email-consent"
                    onChange={() => problem === "invalid_email" && setProblem(null)}
                    className={cn(field, "h-11 rounded-full text-[15px]")}
                    data-testid="contribute-email"
                  />
                  {/* Word for word what is stored with the address (lib/group/notice.ts). */}
                  <p id="email-consent" className="mt-2 px-1 text-xs leading-relaxed text-paper/50">
                    {groupEmailConsent(locale)}
                  </p>
                </div>
              ) : null}
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-white/10 text-sm">
                <input type="checkbox" name="agree" value="1" required onChange={() => problem === "invalid" && setProblem(null)} className="size-5 shrink-0 accent-coral" data-testid="contribute-agree" />
                <span className="min-w-0">{groupAgeLine(locale)}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={busy || reading}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow transition-transform hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              data-testid="contribute-submit"
            >
              {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              <span>{busy ? t.sending : t.send}</span>
            </button>
            {problem ? (
              <p ref={alert} role="alert" className="text-center text-sm text-coral">
                {t[problem]}
              </p>
            ) : null}
            {/* Word for word what the note stores as agreed to (lib/group/notice.ts). */}
            <p className="mt-1 text-center text-xs leading-relaxed [overflow-wrap:anywhere] text-paper/50">
              {groupNotice(locale, fromName)}{" "}
              <a href={`${prefix}/legal/privacy`} className="underline underline-offset-2 hover:text-paper/80">
                {t.privacy}
              </a>
            </p>
          </form>
        </>
      ) : stage === "done" ? (
        <div className="mt-6 flex max-w-sm flex-col items-center" data-testid="contribute-done">
          <h1 className="text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }}>
            {fill(t.sentTitle, { from: fromName })}
          </h1>
          {leftEmail ? <p className="mt-3 text-sm text-paper/70">{t.sentInbox}</p> : null}
          {tooLate ? (
            <p role="alert" className="mt-4 text-sm [overflow-wrap:anywhere] text-paper/80">
              {fill(t.tooLate, { support: BRAND.supportEmail })}
            </p>
          ) : withdraw ? (
            <button type="button" onClick={takeBack} disabled={takingBack} className={cn(quiet, "mt-4 underline disabled:opacity-60")} data-testid="contribute-take-back">
              {takingBack ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {takingBack ? t.takingBack : t.takeBack}
            </button>
          ) : null}
          {problem ? (
            <p role="alert" className="mt-2 text-sm text-coral">
              {t[problem]}
            </p>
          ) : null}
          <button type="button" onClick={again} className={cn(quiet, "mt-1")} data-testid="contribute-another">
            {t.another}
          </button>
        </div>
      ) : (
        <h1 className="mt-6 max-w-sm text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-ended">
          {ended}
        </h1>
      )}

      {stage !== "open" ? (
        <a href={`${prefix}/templates?ref=group-contribute`} className={cn(quiet, "mt-8")} data-testid="contribute-own">
          {t.own}
        </a>
      ) : null}
      <a href={reportLink(reportRef)} className="mt-6 inline-flex min-h-11 items-center text-xs text-paper/40 underline-offset-4 hover:text-paper/70 hover:underline" data-testid="contribute-report">
        {t.report}
      </a>
    </div>
  );
}
