"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { CircleCheck, ImagePlus, Loader2, Lock, PenLine, Undo2, X } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { track } from "@/lib/analytics/track";
import { isolated } from "@/lib/group/bidi";
import { KEEP_MS, KEPT_ATTRIBUTE, firstRead, parseNotes, storeNotes, withStored, type KeptNote } from "@/lib/group/kept";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { groupAgeLine, groupEmailConsent, groupNotice, groupPhotoRule } from "@/lib/group/notice";
import { groupReportLink } from "@/lib/group/report";
import { cn } from "@/lib/utils";
import { LINK_GONE } from "./link-gone";
import { INLINE, INLINE_WORD, QUIET, TAKE_BACK, TakeBack, WARN, WriteIn, fill } from "./take-back";

/** In the card's own language, like the keep page: this page sits off a gift, not on the site. Taking a note back is said in take-back.tsx's words. */
const S = {
  en: {
    ...TAKE_BACK.en,
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
    photoLost: "Your photo didn't come back with the page. Add it again.",
    email: "Email me the finished card",
    emailField: "Your email",
    send: "Add my note",
    sending: "Adding…",
    needsScript: "This page needs JavaScript to add your note. Turn it on and reload.",
    privacy: "Privacy",
    newTab: "opens in a new tab",
    report: "Report this page",
    sentTitle: "Your note is with {from}.",
    sentInbox: "Check your inbox to confirm your address.",
    another: "Add another note",
    own: "Make a gift of your own",
    fullTitle: "This card has all the notes it can hold.",
    closedTitle: "{from} has closed this link.",
    expiredTitle: "This link has stopped taking notes.",
    invalid: "Add your name and a note, and tick the box.",
    no_links: "A note can't carry a web address. Take it out and try again.",
    bad_photo: "That photo couldn't be used. Try a JPEG or a PNG.",
    photo_offline: "Your photo couldn't be loaded. Check your connection and pick it again.",
    too_large: "That photo is too big. Try a smaller one.",
    invalid_email: "Check the email address.",
    no_email: "Add your email, or untick the box.",
    limited: "Too many notes from this connection. Try again in an hour.",
  },
  es: {
    ...TAKE_BACK.es,
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
    photoLost: "Tu foto no ha vuelto con la página. Añádela otra vez.",
    email: "Envíame la tarjeta terminada",
    emailField: "Tu correo",
    send: "Añadir mi nota",
    sending: "Añadiendo…",
    needsScript: "Esta página necesita JavaScript para añadir tu nota. Actívalo y vuelve a cargarla.",
    privacy: "Privacidad",
    newTab: "se abre en otra pestaña",
    report: "Denunciar esta página",
    sentTitle: "Tu nota ya la tiene {from}.",
    sentInbox: "Mira tu correo para confirmar tu dirección.",
    another: "Añadir otra nota",
    own: "Haz tu propio regalo",
    fullTitle: "En esta tarjeta ya no caben más notas.",
    closedTitle: "{from} ha cerrado este enlace.",
    expiredTitle: "Este enlace ya no admite notas.",
    invalid: "Pon tu nombre y una nota, y marca la casilla.",
    no_links: "Una nota no puede llevar una dirección web. Quítala y vuelve a intentarlo.",
    bad_photo: "Esa foto no se ha podido usar. Prueba con un JPEG o un PNG.",
    photo_offline: "No se ha podido cargar tu foto. Revisa la conexión y vuelve a elegirla.",
    too_large: "Esa foto pesa demasiado. Prueba con una más pequeña.",
    invalid_email: "Revisa la dirección de correo.",
    no_email: "Pon tu correo o desmarca la casilla.",
    limited: "Demasiadas notas desde esta conexión. Vuelve a probar en una hora.",
  },
} as const satisfies Record<GiftLocale, Record<string, string>>;

type Problem = "invalid" | "no_links" | "bad_photo" | "photo_offline" | "too_large" | "invalid_email" | "no_email" | "limited" | "error";
/** What the page is: taking a note, or one of the ends a link comes to. */
export type ContributeState = "open" | "full" | "closed" | "expired" | "sent";
/**
 * "gone": the link stopped opening anything while the page was open (its sender made a new one).
 * "unfound": the last note this browser held could not be taken back because the server no longer
 * finds it; the page can say nothing of that note any more, least of all whose hands it is in.
 */
type Stage = ContributeState | "done" | "taken" | "gone" | "unfound";

const never = () => () => {};

/** A photo was picked for this link in this tab: so a page that comes back without it can say so. Nothing of the photo itself. */
const photoKey = (token: string) => `ethos:group-photo:${token}`;
function markPhoto(token: string, picked: boolean) {
  try {
    if (picked) window.sessionStorage.setItem(photoKey(token), "1");
    else window.sessionStorage.removeItem(photoKey(token));
  } catch {
    // No storage: the page then says nothing about a photo that didn't come back.
  }
}
function photoWasPicked(token: string): boolean {
  try {
    return window.sessionStorage.getItem(photoKey(token)) === "1";
  } catch {
    return false;
  }
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
  const gone = LINK_GONE[locale] ?? LINK_GONE.en;
  const prefix = locale === "es" ? "/es" : "";
  // The two names as they are drawn inside a sentence: one written right to left keeps to itself (lib/group/bidi.ts).
  const from = isolated(fromName);
  const forWhom = isolated(forName);
  const [picked, setStage] = useState<Stage>(initial);
  // Notes already added from this browser: coming back to the page shows "Take my note back".
  // Read after hydration (the server knows nothing of it), once; `own` is the list once this visit has changed it.
  // Until then the form is held back for a browser that holds something for this link (lib/group/kept.ts
  // marks the document before the first paint), so nobody watches an empty form where their note was.
  const stored = useSyncExternalStore(never, () => firstRead(token), () => null);
  const hydrated = useSyncExternalStore(never, () => true, () => false);
  useEffect(() => {
    if (hydrated) document.documentElement.removeAttribute(KEPT_ATTRIBUTE);
  }, [hydrated]);
  const kept = useMemo(() => parseNotes(stored), [stored]);
  const [own, setOwn] = useState<KeptNote[] | undefined>(undefined);
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
  const [lostPhoto, setLostPhoto] = useState(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // The words sit by what they are about (the photo button, or the send button at the foot of a
  // phone's screen), which may be off screen when they appear.
  useEffect(() => {
    if (problem) alert.current?.scrollIntoView({ block: "nearest" });
  }, [problem]);

  // When what the person did changes the screen (the note went, the link turned out to be closed, a
  // note was taken back, "Add another note"), the button they pressed is gone with the old screen.
  // The new screen's heading takes the keyboard's focus, so a screen reader says what happened and
  // the next Tab carries on from there, not from the top of the page. Counted, not flagged: two
  // changes in a row are two landings. Never on arriving at the page, which nobody asked to be moved on.
  const [landed, setLanded] = useState(0);
  const land = () => setLanded((n) => n + 1);
  useEffect(() => {
    if (landed > 0) heading.current?.focus();
  }, [landed]);

  // The fields keep their own values, and a browser puts those back when someone leaves the page and
  // returns (Back, a reload, a tab the phone threw away). What this component remembers beside them
  // (the count under the note, whether the address field is open) starts again from nothing, so it
  // is read back off the fields: once the page is live, and again when the browser says it is shown,
  // which is when some browsers restore. Sending reads the box itself, never this copy of it.
  const holdsPhoto = useRef(false);
  useEffect(() => {
    holdsPhoto.current = Boolean(photo);
  }, [photo]);
  const readFields = useCallback(() => {
    const fields = form.current?.elements;
    const note = fields?.namedItem("note");
    const wants = fields?.namedItem("wantsEmail");
    if (note instanceof HTMLTextAreaElement) setCount(note.value.length);
    if (wants instanceof HTMLInputElement) setWantsEmail(wants.checked);
    // The one thing a browser can't put back is the photo, which only ever lived in this page's
    // memory. A form that returns with words in it and without the photo it had says so, once, at
    // the photo button, so nobody sends the note believing the photo is still on it. (A page the
    // browser kept whole comes back with its photo, and has nothing to say.)
    if (!holdsPhoto.current && photoWasPicked(token)) {
      markPhoto(token, false);
      const name = fields?.namedItem("name");
      const hasWords = (note instanceof HTMLTextAreaElement && note.value.length > 0) || (name instanceof HTMLInputElement && name.value.length > 0);
      if (hasWords) setLostPhoto(true);
    }
  }, [token]);
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
    // The editor's own photo step (and its HEIC decoder), fetched only once someone picks a photo.
    // On a phone that has lost its signal that fetch is what fails, and the photo is not to blame:
    // the page says to check the connection, where "try a JPEG" sent people off to convert a JPEG.
    const step = await import("@/lib/editor/image").catch(() => null);
    if (!step) {
      setReading(false);
      return setProblem("photo_offline");
    }
    try {
      const { blob } = await step.processImageFile(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setLostPhoto(false);
      markPhoto(token, true);
    } catch {
      // The decoder for an iPhone's own format is fetched the same way, the first time one is picked.
      setProblem(navigator.onLine === false ? "photo_offline" : "bad_photo");
    } finally {
      setReading(false);
    }
  };

  const dropPhoto = () => {
    setPhoto(null);
    markPhoto(token, false);
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
      setProblem("no_email");
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
      const list = [...withStored(token, notes).filter((note) => now - note.t < KEEP_MS), ...(secret ? [{ s: secret, n: String(fields.get("name") ?? "").trim().slice(0, GROUP_LIMITS.entryName), t: now }] : [])];
      storeNotes(token, list);
      setOwn(list);
      setTookBack(null);
      setNotHere(false);
      setLeftEmail(Boolean(address));
      markPhoto(token, false);
      track("group_note_added", { photo: Boolean(photo), email: Boolean(address) });
      setStage("done");
      return land();
    }
    const error = res ? (((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "") : "";
    // The link's own endings, reached while the note was being written: each is a screen, with its heading read out.
    const ending: Stage | null =
      res?.status === 409 && error === "full"
        ? "full"
        : res?.status === 410
          ? error === "sent"
            ? "sent"
            : error === "expired"
              ? "expired"
              : "closed"
          : // No such link any more: its sender made a new one while this page was open. Trying again can never work, and the page says what will.
            res?.status === 404
            ? "gone"
            : null;
    if (ending) {
      setStage(ending);
      land();
    } else if (res?.status === 429) setProblem("limited");
    else if (res?.status === 413) setProblem("too_large");
    else if (error === "no_links" || error === "bad_photo" || error === "invalid_email" || error === "invalid" || error === "too_large") setProblem(error);
    else setProblem("error");
  };

  const takeBack = async (note: KeptNote) => {
    if (takingBack) return;
    setTakingBack(note.s);
    setProblem(null);
    const res = await fetch("/api/group/withdraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, withdraw: note.s }) }).catch(() => null);
    setTakingBack(null);
    // Only the server's yes means the note is out. A note it can no longer find (404) may be in a
    // card already: the page says to write in, and never that the note was taken back.
    if (res?.ok || res?.status === 404) {
      const left = withStored(token, notes).filter((other) => other.s !== note.s);
      storeNotes(token, left);
      setOwn(left);
      // The button that was pressed leaves with its note: the heading takes the focus, and what happened is said under it.
      land();
      // Where the link still takes notes, the answer is said on the "your note is with…" screen
      // (reached by adding a note just now, or by coming back to the page) while this browser has
      // another note there, and on a screen of its own once none is left. A link that is full,
      // closed or past its last day keeps its own line and says it under that.
      const taking = stage === "open" || stage === "done";
      // Each tap's answer replaces the last one's: two lines about two notes read as one muddle.
      if (!res.ok) {
        // With no note left here, "Your note is with Tom." would be said of a note the server has
        // just said it cannot find, and "Add another note" offered beside it: the page says only
        // what it knows, and where to write.
        if (taking) setStage(left.length === 0 ? "unfound" : "done");
        setTookBack(null);
        return setNotHere(true);
      }
      if (taking) setStage(left.length === 0 ? "taken" : "done");
      setNotHere(false);
      track("group_note_withdrawn");
      setTookBack(!taking || left.length > 0 ? note.n : null);
    } else if (res?.status === 410) {
      // The card went out while this page was open: it says so, like the link itself now does, with
      // the address to write to. Nothing here offers another note, which could only be refused.
      setTooLate(true);
      setStage("sent");
      land();
    } else setProblem("error");
  };

  const again = () => {
    // The notes already added stay kept: each can still be taken back after another is written.
    setOwn(notes);
    setTookBack(null);
    setNotHere(false);
    dropPhoto();
    setLostPhoto(false);
    setCount(0);
    setWantsEmail(false);
    setLeftEmail(false);
    setProblem(null);
    setStage("open");
    land();
  };

  const warn = WARN;
  // A placeholder is each field's only visible label here, so it is held to the same floor as text.
  const field = "w-full border border-white/15 bg-white/8 px-5 text-base text-paper placeholder:text-paper/60 focus:border-coral focus:outline-none";
  const quiet = QUIET;
  // A tick box on the night ground: the browser's own focus ring is near black there, so it gets the page's.
  const box = "size-5 shrink-0 accent-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";
  const inline = INLINE;
  const inlineWord = INLINE_WORD;
  // A screen's heading: where the keyboard's focus lands when the screen changes (never a stop on the way through the page).
  const title = "text-[1.8rem] leading-tight italic [overflow-wrap:anywhere] focus:outline-none";
  const Icon = stage === "open" ? PenLine : stage === "done" ? CircleCheck : stage === "taken" ? Undo2 : Lock;
  const ended = stage === "full" ? t.fullTitle : stage === "closed" ? fill(t.closedTitle, { from }) : stage === "expired" ? t.expiredTitle : stage === "sent" ? t.sentAwayTitle : stage === "taken" ? t.takenTitle : stage === "unfound" ? t.notHereTitle : stage === "gone" ? gone.title : null;
  // A photo that could not be used is said at the photo button, where the person just was.
  const photoProblem = takesPhotos && (problem === "bad_photo" || problem === "too_large" || problem === "photo_offline");

  // What to do once the page can no longer take a note back. Where the headline has already said
  // why (the card was sent; the note is not there), the line is only what to do about it.
  const writeIn = tooLate || notHere ? <WriteIn text={tooLate ? t.tooLate : stage === "unfound" ? t.notHereDo : `${t.notHereTitle} ${t.notHereDo}`} reportRef={reportRef} locale={locale} /> : null;

  const takeBackPart = (
    <TakeBack
      locale={locale}
      notes={notes}
      takingBack={takingBack}
      tookBack={tookBack}
      writeIn={writeIn}
      named={notes.length > 1 || tookBack !== null || notHere}
      over={tooLate}
      problem={problem && stage !== "open" ? t[problem] : null}
      onTakeBack={(note) => void takeBack(note)}
    />
  );

  return (
    <div lang={locale} translate="no" className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 py-12 text-center text-paper" data-testid="contribute" data-stage={stage}>
      <div className="grain-overlay" />
      <LogoMark className="size-10" />
      {/* Drawn by the stylesheet alone, so it is there before the page's script is, and where no script
          ever runs: it arrives once with the page and again with each new screen. With reduced motion
          it is simply there (globals.css cuts every animation short). */}
      <div
        key={stage === "open" ? "open" : "end"}
        className="mt-7 grid size-16 animate-in place-items-center rounded-full bg-white/8 delay-100 duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] fill-mode-both fade-in zoom-in-80"
        data-testid="contribute-mark"
      >
        <Icon aria-hidden="true" className="size-6 text-coral" />
      </div>

      {stage === "open" ? (
        // Not drawn, for a browser that already left a note here, until the page knows to show that instead (lib/group/kept.ts).
        <div className="flex w-full flex-col items-center [[data-group-kept]_&]:hidden" data-testid="contribute-open">
          <h1 ref={heading} tabIndex={-1} className={cn(title, "mt-6 max-w-sm")} style={{ fontFamily: "var(--font-display)" }}>
            {fill(t.title, { for: forWhom })}
          </h1>
          <p className="mt-2 max-w-xs text-sm [overflow-wrap:anywhere] text-paper/70">{fill(t.blurb, { from })}</p>
          {prompt ? (
            <p dir="auto" className="mt-4 max-w-xs text-[1.05rem] leading-snug italic [overflow-wrap:anywhere] text-paper/90" style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-prompt">
              “{prompt}”
            </p>
          ) : null}

          {/* method="post": until the page's script is running, a form with no method is a GET of this
              very address with every field in it, which put a stranger's name, note and email address
              into the browser's history and the server's logs and sent nothing. The send button is not
              live until then either (below), so this is the second lock on the same door. */}
          <form ref={form} method="post" onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-3 text-left" data-testid="contribute-form" noValidate>
            <input
              type="text"
              name="name"
              required
              maxLength={GROUP_LIMITS.entryName}
              autoComplete="given-name"
              autoCapitalize="words"
              dir="auto"
              placeholder={t.name}
              aria-label={t.name}
              onChange={() => problem === "invalid" && setProblem(null)}
              className={cn(field, "h-12 rounded-full")}
              data-testid="contribute-name"
            />
            <div>
              {/* It grows with the note where the browser can do that, and on the narrowest phones starts a
                  line taller: a full note at 320 px was one line longer than its box, and scrolled inside it. */}
              <textarea
                name="note"
                required
                rows={4}
                maxLength={noteMax}
                dir="auto"
                placeholder={t.note}
                aria-label={t.note}
                aria-describedby="note-count"
                onChange={(event) => {
                  setCount(event.target.value.length);
                  if (problem === "invalid" || problem === "no_links") setProblem(null);
                }}
                className={cn(field, "block field-sizing-content min-h-32 resize-none rounded-3xl py-3.5 leading-relaxed max-[359px]:min-h-40")}
                data-testid="contribute-note"
              />
              {/* Under the box, never inside it: a note of five lines on a phone scrolled its words through a count laid over them.
                  Not shown until the page can count: before that it could only say "0" under a note already half written. */}
              <p id="note-count" className={cn("mt-1.5 px-5 text-right text-xs tabular-nums", count >= noteMax ? warn : "text-paper/50", !hydrated && "invisible")} data-testid="contribute-count">
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
                    <button type="button" onClick={dropPhoto} aria-label={t.photoRemove} className="grid size-11 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-white/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral" data-testid="contribute-photo-remove">
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
                  <p ref={alert} role="alert" className={cn("mt-2 px-1 text-sm", warn)} data-testid="contribute-photo-problem">
                    {t[problem]}
                  </p>
                ) : lostPhoto && !photo ? (
                  // Not an error: the browser brought the words back and could not bring the photo.
                  <p role="status" className="mt-2 px-1 text-sm text-paper/80" data-testid="contribute-photo-lost">
                    {t.photoLost}
                  </p>
                ) : null}
                <p className="mt-2 px-1 text-xs text-paper/50">{groupPhotoRule(locale)}</p>
              </div>
            ) : null}

            <div className="mt-1 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-1">
              <label className="peer flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                {/* Its own value, like the fields: a browser that restores the page restores the tick, and the page reads it back. */}
                <input type="checkbox" name="wantsEmail" value="1" onChange={(event) => {
                    setWantsEmail(event.target.checked);
                    if (problem === "no_email") setProblem(null);
                  }} className={box} data-testid="contribute-wants-email" />
                <span className="min-w-0">{t.email}</span>
              </label>
              {/* Always in the page, shown with the tick: an address typed here comes back with the rest of
                  the form. The stylesheet opens it off the box itself, so a tick made before the page's
                  script runs is answered at once; what the page has read of the box opens it too, for
                  the few browsers that can't ask a stylesheet that question. */}
              <div className={cn("pt-1 pb-3", wantsEmail ? "block" : "hidden peer-has-checked:block")} data-testid="contribute-email-part">
                {/* 16 px like the other fields: an iPhone zooms the whole page into any field set smaller, and stays zoomed. */}
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
                  onChange={() => (problem === "invalid_email" || problem === "no_email") && setProblem(null)}
                  className={cn(field, "h-11 rounded-full")}
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

            {/* Not live until the page's script is: before that a tap could only be the browser's own
                submit, which sends nothing anywhere useful (see the form). The fields above take typing
                from the first frame all the same, and keep it. */}
            <button
              type="submit"
              disabled={!hydrated || busy || reading}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow transition-transform hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              data-testid="contribute-submit"
            >
              {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              <span>{busy ? t.sending : t.send}</span>
            </button>
            {/* Where no script will ever run, the button above never comes alive: say why, and what to do. */}
            <noscript>
              <p className="text-center text-sm text-paper/80" data-testid="contribute-needs-script">
                {t.needsScript}
              </p>
            </noscript>
            {problem && !photoProblem ? (
              <p ref={alert} role="alert" className={cn("text-center text-sm", warn)}>
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
          {/* Said aloud as it arrives: the form it replaces took the focus away with it. */}
          <div role="status">
            <h1 ref={heading} tabIndex={-1} className={title} style={{ fontFamily: "var(--font-display)" }}>
              {fill(t.sentTitle, { from })}
            </h1>
            {leftEmail ? <p className="mt-3 text-sm text-paper/70">{t.sentInbox}</p> : null}
          </div>
          {takeBackPart}
          <button type="button" onClick={again} className={cn(quiet, "mt-1")} data-testid="contribute-another">
            {t.another}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex max-w-sm flex-col items-center">
          <div role="status">
            <h1 ref={heading} tabIndex={-1} className={title} style={{ fontFamily: "var(--font-display)" }} data-testid="contribute-ended">
              {ended}
            </h1>
            {stage === "gone" ? <p className="mt-3 text-sm text-paper/70">{gone.ask}</p> : null}
          </div>
          {/* A link that takes no more notes still lets a note be taken back, until the card is sent (the
              secret alone finds the note, so even at a link that was reset); after that, the address to write to. */}
          {stage === "full" || stage === "closed" || stage === "expired" || stage === "gone" ? takeBackPart : stage === "sent" || stage === "unfound" ? writeIn : null}
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
