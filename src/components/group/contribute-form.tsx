"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { CircleCheck, ImagePlus, Loader2, Lock, PenLine, Undo2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { BRAND } from "@/config/brand";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { track } from "@/lib/analytics/track";
import { KEPT_ATTRIBUTE, notesKey } from "@/lib/group/kept";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { groupAgeLine, groupEmailConsent, groupNotice, groupPhotoRule } from "@/lib/group/notice";
import { groupReportLink, groupWriteInLink } from "@/lib/group/report";
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
    newTab: "opens in a new tab",
    report: "Report this page",
    sentTitle: "Your note is with {from}.",
    sentInbox: "Check your inbox to confirm your address.",
    takeBack: "Take my note back",
    takeBackOf: "Take back the note from {name}",
    takingBack: "Taking it back…",
    another: "Add another note",
    takenTitle: "Your note has been taken back.",
    takenOne: "The note from {name} has been taken back.",
    // Under "This card has been sent.", which the page becomes when a note can no longer be taken back.
    tooLate: "Write to {support} and we'll take your note out.",
    notHere: "That note can't be taken back from here any more. Write to {support} and we'll take it out.",
    own: "Make a gift of your own",
    fullTitle: "This card has all the notes it can hold.",
    closedTitle: "{from} has closed this link.",
    expiredTitle: "This link has stopped taking notes.",
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
    newTab: "se abre en otra pestaña",
    report: "Denunciar esta página",
    sentTitle: "Tu nota ya la tiene {from}.",
    sentInbox: "Mira tu correo para confirmar tu dirección.",
    takeBack: "Retirar mi nota",
    takeBackOf: "Retirar la nota de {name}",
    takingBack: "Retirándola…",
    another: "Añadir otra nota",
    takenTitle: "Tu nota se ha retirado.",
    takenOne: "La nota de {name} se ha retirado.",
    tooLate: "Escribe a {support} y quitamos tu nota.",
    notHere: "Esa nota ya no se puede retirar desde aquí. Escribe a {support} y la quitamos.",
    own: "Haz tu propio regalo",
    fullTitle: "En esta tarjeta ya no caben más notas.",
    closedTitle: "{from} ha cerrado este enlace.",
    expiredTitle: "Este enlace ya no admite notas.",
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
export type ContributeState = "open" | "full" | "closed" | "expired" | "sent";
type Stage = ContributeState | "done" | "taken";

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/**
 * A note added from this browser, as the browser keeps it to be able to take it back: the secret the
 * server handed over (`s`), the name it was signed with (`n`, to tell two notes apart when one phone
 * went round a table) and when (`t`). Kept in this browser's own storage under the link, so closing
 * the tab, or adding a second note, takes away nobody's way to withdraw the first; it never leaves
 * the browser except as the secret, when "Take my note back" is tapped.
 */
type Kept = { s: string; n: string; t: number };
/** Longer than any link can stay open, after which the server has nothing left for a secret to find. */
const KEEP_MS = 120 * 86_400_000;

/** What this browser has stored for the link, as written (null where there is nothing, or storage is off). */
function storedNotes(token: string): string | null {
  try {
    return window.localStorage.getItem(notesKey(token));
  } catch {
    return null;
  }
}
function parseNotes(raw: string | null): Kept[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is Kept => Boolean(item) && typeof item.s === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(item.s) && typeof item.n === "string" && typeof item.t === "number").slice(-GROUP_LIMITS.total);
  } catch {
    return [];
  }
}
function storeNotes(token: string, list: Kept[]) {
  try {
    if (list.length) window.localStorage.setItem(notesKey(token), JSON.stringify(list));
    else window.localStorage.removeItem(notesKey(token));
  } catch {
    // Kept for this visit only, then.
  }
}
const never = () => () => {};

/** A sentence with one "{support}" in it, drawn with whatever stands there (the address, as a link). */
function around(text: string, support: ReactNode): ReactNode {
  const [before, after = ""] = text.split("{support}");
  return (
    <>
      {before}
      {support}
      {after}
    </>
  );
}

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
  // Notes already added from this browser: coming back to the page shows "Take my note back".
  // Read after hydration (the server knows nothing of it); `own` is the list once this visit has changed it.
  // Until then the form is held back for a browser that holds something for this link (lib/group/kept.ts
  // marks the document before the first paint), so nobody watches an empty form where their note was.
  const stored = useSyncExternalStore(never, () => storedNotes(token), () => null);
  const hydrated = useSyncExternalStore(never, () => true, () => false);
  useEffect(() => {
    if (hydrated) document.documentElement.removeAttribute(KEPT_ATTRIBUTE);
  }, [hydrated]);
  const kept = useMemo(() => parseNotes(stored), [stored]);
  const [own, setOwn] = useState<Kept[] | undefined>(undefined);
  const notes = own ?? kept;
  const stage: Stage = picked === "open" && own === undefined && kept.length > 0 ? "done" : picked;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [count, setCount] = useState(0);
  const [wantsEmail, setWantsEmail] = useState(false);
  const [leftEmail, setLeftEmail] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [takingBack, setTakingBack] = useState<string | null>(null);
  const [tooLate, setTooLate] = useState(false);
  const [notHere, setNotHere] = useState(false);
  const [tookBack, setTookBack] = useState<string | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // The words sit by what they are about (the photo button, or the send button at the foot of a
  // phone's screen), which may be off screen when they appear.
  useEffect(() => {
    if (problem) alert.current?.scrollIntoView({ block: "nearest" });
  }, [problem]);

  // The fields keep their own values, and a browser puts those back when someone leaves the page and
  // returns (Back, a reload, a tab the phone threw away). What this component remembers beside them
  // (the count under the note, whether the address field is open) starts again from nothing, so it
  // is read back off the fields: once the page is live, and again when the browser says it is shown,
  // which is when some browsers restore. Sending reads the box itself, never this copy of it.
  const readFields = useCallback(() => {
    const fields = form.current?.elements;
    const note = fields?.namedItem("note");
    const wants = fields?.namedItem("wantsEmail");
    if (note instanceof HTMLTextAreaElement) setCount(note.value.length);
    if (wants instanceof HTMLInputElement) setWantsEmail(wants.checked);
  }, []);
  useEffect(() => {
    readFields();
    window.addEventListener("pageshow", readFields);
    return () => window.removeEventListener("pageshow", readFields);
  }, [readFields]);

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
    // The box as it stands on the page decides, not what this component last heard of it.
    const wants = fields.get("wantsEmail") !== null;
    const address = wants ? String(fields.get("email") ?? "").trim() : "";
    // Ticked with no address would be sent as "no email, thanks" while the page shows a tick.
    if (wants && !address) {
      setWantsEmail(true);
      setProblem("invalid_email");
      const empty = event.currentTarget.elements.namedItem("email");
      if (empty instanceof HTMLInputElement) requestAnimationFrame(() => empty.focus());
      return;
    }
    if (address) body.set("email", address);
    if (photo && takesPhotos) body.set("photo", new File([photo.blob], "photo", { type: photo.blob.type || "image/jpeg" }));
    setBusy(true);
    setProblem(null);
    const res = await fetch("/api/group/contribute", { method: "POST", body }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      const data = (await res.json().catch(() => null)) as { withdraw?: string } | null;
      const secret = typeof data?.withdraw === "string" ? data.withdraw : null;
      const now = Date.now();
      const list = [...notes.filter((note) => now - note.t < KEEP_MS), ...(secret ? [{ s: secret, n: String(fields.get("name") ?? "").trim().slice(0, GROUP_LIMITS.entryName), t: now }] : [])];
      storeNotes(token, list);
      setOwn(list);
      setTookBack(null);
      setNotHere(false);
      setLeftEmail(Boolean(address));
      track("group_note_added", { photo: Boolean(photo), email: Boolean(address) });
      setStage("done");
      return;
    }
    const error = res ? (((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "") : "";
    if (res?.status === 409 && error === "full") setStage("full");
    else if (res?.status === 410) setStage(error === "sent" ? "sent" : error === "expired" ? "expired" : "closed");
    else if (res?.status === 429) setProblem("limited");
    else if (res?.status === 413) setProblem("too_large");
    else if (error === "no_links" || error === "bad_photo" || error === "invalid_email" || error === "invalid" || error === "too_large") setProblem(error);
    else setProblem("error");
  };

  const takeBack = async (note: Kept) => {
    if (takingBack) return;
    setTakingBack(note.s);
    setProblem(null);
    const res = await fetch("/api/group/withdraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, withdraw: note.s }) }).catch(() => null);
    setTakingBack(null);
    // Only the server's yes means the note is out. A note it can no longer find (404) may be in a
    // card already: the page says to write in, and never that the note was taken back.
    if (res?.ok || res?.status === 404) {
      const left = notes.filter((other) => other.s !== note.s);
      storeNotes(token, left);
      setOwn(left);
      // Where the link still takes notes, the answer is said on the "your note is with…" screen
      // (reached by adding a note just now, or by coming back to the page), or on its own once no
      // note is left. A link that is full, closed or past its last day keeps its own line and says
      // it under that.
      const taking = stage === "open" || stage === "done";
      if (taking) setStage(res.ok && left.length === 0 ? "taken" : "done");
      if (!res.ok) return setNotHere(true);
      track("group_note_withdrawn");
      if (!taking || left.length > 0) setTookBack(note.n);
    } else if (res?.status === 410) {
      // The card went out while this page was open: it says so, like the link itself now does, with
      // the address to write to. Nothing here offers another note, which could only be refused.
      setTooLate(true);
      setStage("sent");
    } else setProblem("error");
  };

  const again = () => {
    // The notes already added stay kept: each can still be taken back after another is written.
    setOwn(notes);
    setTookBack(null);
    setNotHere(false);
    setPhoto(null);
    setCount(0);
    setWantsEmail(false);
    setLeftEmail(false);
    setProblem(null);
    setStage("open");
  };

  const field = "w-full border border-white/15 bg-white/8 px-5 text-base text-paper placeholder:text-paper/40 focus:border-coral focus:outline-none";
  const quiet = "inline-flex min-h-11 items-center gap-1.5 text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";
  // A tick box on the night ground: the browser's own focus ring is near black there, so it gets the page's.
  const box = "size-5 shrink-0 accent-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";
  // A link inside a sentence: a thumb's worth of room round it that moves no line, and a focus ring drawn round the word itself.
  const inline = "group -mx-1.5 -my-3.5 inline-block px-1.5 py-3.5 hover:text-paper focus-visible:outline-none";
  const inlineWord = "rounded-sm underline underline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-coral";
  const Icon = stage === "open" ? PenLine : stage === "done" ? CircleCheck : stage === "taken" ? Undo2 : Lock;
  const ended = stage === "full" ? t.fullTitle : stage === "closed" ? fill(t.closedTitle, { from: fromName }) : stage === "expired" ? t.expiredTitle : stage === "sent" ? t.sentAwayTitle : stage === "taken" ? t.takenTitle : null;
  // A photo that could not be used is said at the photo button, where the person just was.
  const photoProblem = takesPhotos && (problem === "bad_photo" || problem === "too_large");

  // What to do once the page can no longer take a note back: the address is a link that opens an
  // email with this page's reference in its subject, not a string to select by hand on a phone.
  const writeIn =
    tooLate || notHere ? (
      <p role="alert" className="mt-4 text-sm leading-relaxed [overflow-wrap:anywhere] text-paper/80" data-testid="contribute-write-in">
        {around(
          tooLate ? t.tooLate : t.notHere,
          <a href={groupWriteInLink(reportRef, locale)} className={cn(inline, "text-paper")} data-testid="contribute-write-in-link">
            <span className={inlineWord}>{BRAND.supportEmail}</span>
          </a>,
        )}
      </p>
    ) : null;

  // The notes this browser can still take back, each with its own button (named once there is more
  // than one to tell apart), and what the last tap came to.
  const takeBackPart = (
    <>
      {tookBack !== null ? (
        <p role="status" className="mt-3 text-sm [overflow-wrap:anywhere] text-paper/80" data-testid="contribute-took-back">
          {fill(t.takenOne, { name: tookBack })}
        </p>
      ) : null}
      {writeIn}
      {tooLate ? null : (
        <div className={cn("flex flex-col items-center", notes.length > 0 && "mt-4")}>
          {notes.map((note) => (
            <button key={note.s} type="button" onClick={() => void takeBack(note)} disabled={takingBack !== null} className={cn(quiet, "underline [overflow-wrap:anywhere] disabled:opacity-60")} data-testid="contribute-take-back">
              {takingBack === note.s ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {takingBack === note.s ? t.takingBack : notes.length > 1 || tookBack !== null ? fill(t.takeBackOf, { name: note.n }) : t.takeBack}
            </button>
          ))}
        </div>
      )}
      {problem && stage !== "open" ? (
        <p role="alert" className="mt-2 text-sm text-coral">
          {t[problem]}
        </p>
      ) : null}
    </>
  );

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
        // Not drawn, for a browser that already left a note here, until the page knows to show that instead (lib/group/kept.ts).
        <div className="flex w-full flex-col items-center [[data-group-kept]_&]:hidden" data-testid="contribute-open">
          <h1 className="mt-6 max-w-sm text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }}>
            {fill(t.title, { for: forName })}
          </h1>
          <p className="mt-2 max-w-xs text-sm [overflow-wrap:anywhere] text-paper/70">{fill(t.blurb, { from: fromName })}</p>
          {prompt ? (
            <p className="mt-4 max-w-xs text-[1.05rem] leading-snug italic [overflow-wrap:anywhere] text-paper/90" style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-prompt">
              “{prompt}”
            </p>
          ) : null}

          <form ref={form} onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-3 text-left" data-testid="contribute-form" noValidate>
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
            <div>
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
                className={cn(field, "block min-h-32 resize-none rounded-3xl py-3.5 leading-relaxed")}
                data-testid="contribute-note"
              />
              {/* Under the box, never inside it: a note of five lines on a phone scrolled its words through a count laid over them. */}
              <p id="note-count" className={cn("mt-1.5 px-5 text-right text-xs tabular-nums", count >= noteMax ? "text-coral" : "text-paper/50")} data-testid="contribute-count">
                {fill(t.count, { n: count, max: noteMax })}
              </p>
            </div>

            {takesPhotos ? (
              <div>
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
                {photoProblem && problem ? (
                  <p ref={alert} role="alert" className="mt-2 px-1 text-sm text-coral" data-testid="contribute-photo-problem">
                    {t[problem]}
                  </p>
                ) : null}
                <p className="mt-2 px-1 text-xs text-paper/50">{groupPhotoRule(locale)}</p>
              </div>
            ) : null}

            <div className="mt-1 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                {/* Its own value, like the fields: a browser that restores the page restores the tick, and the page reads it back. */}
                <input type="checkbox" name="wantsEmail" value="1" onChange={(event) => setWantsEmail(event.target.checked)} className={box} data-testid="contribute-wants-email" />
                <span className="min-w-0">{t.email}</span>
              </label>
              {/* Always in the page, shown with the tick: an address typed here comes back with the rest of the form. */}
              <div hidden={!wantsEmail} className="pt-1 pb-3">
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
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-white/10 text-sm">
                <input type="checkbox" name="agree" value="1" required onChange={() => problem === "invalid" && setProblem(null)} className={box} data-testid="contribute-agree" />
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
            {problem && !photoProblem ? (
              <p ref={alert} role="alert" className="text-center text-sm text-coral">
                {t[problem]}
              </p>
            ) : null}
            {/* Word for word what the note stores as agreed to (lib/group/notice.ts). */}
            <p className="mt-1 text-center text-xs leading-relaxed [overflow-wrap:anywhere] text-paper/50">
              {groupNotice(locale, fromName, takesPhotos)}{" "}
              {/* In its own tab: reading it never costs anyone the note they were writing. */}
              <a href={`${prefix}/legal/privacy`} target="_blank" rel="noopener" className={inline} data-testid="contribute-privacy">
                <span className={inlineWord}>{t.privacy}</span>
                <span className="sr-only"> ({t.newTab})</span>
              </a>
            </p>
          </form>
        </div>
      ) : stage === "done" ? (
        <div className="mt-6 flex max-w-sm flex-col items-center" data-testid="contribute-done">
          <h1 className="text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }}>
            {fill(t.sentTitle, { from: fromName })}
          </h1>
          {leftEmail ? <p className="mt-3 text-sm text-paper/70">{t.sentInbox}</p> : null}
          {takeBackPart}
          <button type="button" onClick={again} className={cn(quiet, "mt-1")} data-testid="contribute-another">
            {t.another}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex max-w-sm flex-col items-center">
          <h1 className="text-[1.8rem] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-ended">
            {ended}
          </h1>
          {/* A link that takes no more notes still lets a note be taken back, until the card is sent; after that, the address to write to. */}
          {stage === "full" || stage === "closed" || stage === "expired" ? takeBackPart : stage === "sent" ? writeIn : null}
        </div>
      )}

      {stage !== "open" ? (
        <a href={`${prefix}/templates?ref=group-contribute`} className={cn(quiet, "mt-8")} data-testid="contribute-own">
          {t.own}
        </a>
      ) : null}
      <a href={groupReportLink("page", reportRef, locale)} className="mt-6 inline-flex min-h-11 items-center text-xs text-paper/60 underline-offset-4 hover:text-paper/80 hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral" data-testid="contribute-report">
        {t.report}
      </a>
    </div>
  );
}
