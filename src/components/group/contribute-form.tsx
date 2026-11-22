"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { CircleCheck, ImagePlus, Loader2, Lock, PenLine, Undo2, X } from "lucide-react";
import { BRAND } from "@/config/brand";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { track } from "@/lib/analytics/track";
import { isolated } from "@/lib/group/bidi";
import { KEPT_ATTRIBUTE, notesKey } from "@/lib/group/kept";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { groupAgeLine, groupEmailConsent, groupNotice, groupPhotoRule } from "@/lib/group/notice";
import { groupReportLink, groupWriteInLink } from "@/lib/group/report";
import { cn } from "@/lib/utils";
import { LINK_GONE } from "./link-gone";

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
    photo_offline: "Your photo couldn't be loaded. Check your connection and pick it again.",
    too_large: "That photo is too big. Try a smaller one.",
    invalid_email: "Check the email address.",
    no_email: "Add your email, or untick the box.",
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
    takeBack: "Retirar mi nota",
    // A colon, not "de": people sign as "El abuelo" and "Los García", and "de El abuelo" is not Spanish.
    takeBackOf: "Retirar la nota: {name}",
    takingBack: "Retirándola…",
    another: "Añadir otra nota",
    takenTitle: "Tu nota se ha retirado.",
    takenOne: "Nota retirada: {name}.",
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
    photo_offline: "No se ha podido cargar tu foto. Revisa la conexión y vuelve a elegirla.",
    too_large: "Esa foto pesa demasiado. Prueba con una más pequeña.",
    invalid_email: "Revisa la dirección de correo.",
    no_email: "Pon tu correo o desmarca la casilla.",
    limited: "Demasiadas notas desde esta conexión. Vuelve a probar en una hora.",
    error: "No se ha podido enviar. Inténtalo en un momento.",
  },
} as const satisfies Record<GiftLocale, Record<string, string>>;

type Problem = "invalid" | "no_links" | "bad_photo" | "photo_offline" | "too_large" | "invalid_email" | "no_email" | "limited" | "error";
/** What the page is: taking a note, or one of the ends a link comes to. */
export type ContributeState = "open" | "full" | "closed" | "expired" | "sent";
/** "gone": the link stopped opening anything while the page was open (its sender made a new one). */
type Stage = ContributeState | "done" | "taken" | "gone";

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

/**
 * What this browser held for the link when the page came alive, read once and never again. Read on
 * every render, a second tab's form vanished at its next keystroke once the first tab had sent a
 * note: the half-written note was gone and the screen claimed a note that tab never sent. A page
 * changes screens when its own person does something, not when another tab does.
 */
const READ = new Map<string, string | null>();
function firstRead(token: string): string | null {
  if (!READ.has(token)) READ.set(token, storedNotes(token));
  return READ.get(token) ?? null;
}

/**
 * The notes to write back: what the browser holds now (another tab may have added one, or taken one
 * back, since this page read it) together with what this page knows of, each once. Without the
 * fresh look, the tab that sent second wrote the list back without the first tab's note, and that
 * note could no longer be taken back from anywhere.
 */
function withStored(token: string, known: Kept[]): Kept[] {
  const held = parseNotes(storedNotes(token));
  const seen = new Set(held.map((note) => note.s));
  return [...held, ...known.filter((note) => !seen.has(note.s))].sort((a, b) => a.t - b.t);
}

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

  const takeBack = async (note: Kept) => {
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

  // Coral as it is on the site reads at 4.1 to 1 on the night ground, under what small text needs:
  // the lines that tell someone why their note was refused are the last that should be hard to
  // read. The same coral, lightened until it passes (6 to 1), for words; the icon keeps the brand's own.
  const warn = "text-[color-mix(in_oklab,var(--color-coral)_70%,white)]";
  // A placeholder is each field's only visible label here, so it is held to the same floor as text.
  const field = "w-full border border-white/15 bg-white/8 px-5 text-base text-paper placeholder:text-paper/60 focus:border-coral focus:outline-none";
  const quiet = "inline-flex min-h-11 items-center gap-1.5 text-sm text-paper/70 underline-offset-4 hover:text-paper hover:underline focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";
  // A tick box on the night ground: the browser's own focus ring is near black there, so it gets the page's.
  const box = "size-5 shrink-0 accent-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";
  // A link inside a sentence: a thumb's worth of room round it that moves no line, and a focus ring drawn round the word itself.
  const inline = "group -mx-1.5 -my-3.5 inline-block px-1.5 py-3.5 hover:text-paper focus-visible:outline-none";
  const inlineWord = "rounded-sm underline underline-offset-2 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-coral";
  // A screen's heading: where the keyboard's focus lands when the screen changes (never a stop on the way through the page).
  const title = "text-[1.8rem] leading-tight italic [overflow-wrap:anywhere] focus:outline-none";
  const Icon = stage === "open" ? PenLine : stage === "done" ? CircleCheck : stage === "taken" ? Undo2 : Lock;
  const ended = stage === "full" ? t.fullTitle : stage === "closed" ? fill(t.closedTitle, { from }) : stage === "expired" ? t.expiredTitle : stage === "sent" ? t.sentAwayTitle : stage === "taken" ? t.takenTitle : stage === "gone" ? gone.title : null;
  // A photo that could not be used is said at the photo button, where the person just was.
  const photoProblem = takesPhotos && (problem === "bad_photo" || problem === "too_large" || problem === "photo_offline");

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
          {fill(t.takenOne, { name: isolated(tookBack) })}
        </p>
      ) : null}
      {writeIn}
      {tooLate ? null : (
        <div className={cn("flex flex-col items-center", notes.length > 0 && "mt-4")}>
          {notes.map((note) => (
            <button key={note.s} type="button" onClick={() => void takeBack(note)} disabled={takingBack !== null} className={cn(quiet, "underline [overflow-wrap:anywhere] disabled:opacity-60")} data-testid="contribute-take-back">
              {takingBack === note.s ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {takingBack === note.s ? t.takingBack : notes.length > 1 || tookBack !== null ? fill(t.takeBackOf, { name: isolated(note.n) }) : t.takeBack}
            </button>
          ))}
        </div>
      )}
      {problem && stage !== "open" ? (
        <p role="alert" className={cn("mt-2 text-sm", warn)}>
          {t[problem]}
        </p>
      ) : null}
    </>
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
          {stage === "full" || stage === "closed" || stage === "expired" || stage === "gone" ? takeBackPart : stage === "sent" ? writeIn : null}
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
