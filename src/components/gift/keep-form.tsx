"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bookmark, ChevronDown, Loader2, MailCheck } from "lucide-react";
import { motion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { track } from "@/lib/analytics/track";
import { KEEP_OCCASIONS, keepConsent, senderFirstName, type KeepOccasion } from "@/lib/keep/keep";
import { cn } from "@/lib/utils";

/** In the gift's own language, like the lock screen: the page sits off a gift, not on the site. */
const S = {
  en: {
    title: "Keep this gift",
    blurb: "We'll email you the link so you can open it again any time.",
    email: "Your email",
    nudges: "Want a reminder too? Tick any you'd like",
    birthday: "Remind me before {sender}'s birthday",
    birthdayUnnamed: "Remind me before the sender's birthday",
    anniversary: "Remind me before our anniversary",
    valentines: "Remind me before Valentine's Day",
    month: "Month",
    day: "Day",
    pickDay: "Pick the date, or untick this one.",
    send: "Email me the link",
    sending: "Sending…",
    sentTitle: "Check your inbox.",
    sentBody: "We've sent a link to {email}. Tap it, and the gift's link comes straight after.",
    sentNote: "Nothing in a few minutes? Look in spam. If you once asked us never to email this address, nothing will come.",
    back: "Back to the gift",
    privacy: "Privacy",
    error: "That didn't go through. Try again in a moment.",
    invalid: "Check the email address.",
    limited: "Too many tries from this connection. Try again in an hour.",
    change: "Wrong address? Change it",
  },
  es: {
    title: "Guardar este regalo",
    blurb: "Te enviamos el enlace por correo para que puedas volver a abrirlo cuando quieras.",
    email: "Tu correo",
    nudges: "¿Quieres también un aviso? Marca los que quieras",
    birthday: "Avísame antes del cumpleaños de {sender}",
    birthdayUnnamed: "Avísame antes del cumpleaños de quien te lo regaló",
    anniversary: "Avísame antes de nuestro aniversario",
    valentines: "Avísame antes de San Valentín",
    month: "Mes",
    day: "Día",
    pickDay: "Elige la fecha, o desmárcalo.",
    send: "Envíame el enlace",
    sending: "Enviando…",
    sentTitle: "Mira tu correo.",
    sentBody:
      "Hemos enviado un enlace a {email}. Tócalo y el enlace del regalo llega justo después.",
    sentNote: "¿No llega en unos minutos? Mira en spam. Si alguna vez nos pediste no escribir a esta dirección, no llegará nada.",
    back: "Volver al regalo",
    privacy: "Privacidad",
    error: "No se ha podido enviar. Inténtalo en un momento.",
    invalid: "Revisa la dirección de correo.",
    limited: "Demasiados intentos desde esta conexión. Vuelve a probar en una hora.",
    change: "¿Dirección equivocada? Cámbiala",
  },
} as const satisfies Record<GiftLocale, Record<string, string>>;

type Pick = { on: boolean; month: number | null; day: number | null };
const NONE: Pick = { on: false, month: null, day: null };
/** Valentine's is always the 14th of February: no day to pick. */
const needsDay = (o: KeepOccasion) => o !== "valentines";
/** Days a month can have in some year, so a 29 February birthday can be kept. */
const daysIn = (month: number) => new Date(Date.UTC(2000, month, 0)).getUTCDate();

/**
 * The keep page's form: an address, and, optionally and unticked, the days to be reminded of. Sent,
 * it says to check the inbox, whatever the server did with it (lib/keep/store.ts): the confirmation
 * there is the only thing that goes out until the keeper says yes. The birthday is named as the
 * emails will name it: by the first name the gift is signed with, or as "the sender's" when the
 * signature has none ("Tu amor"); the days are offered whenever the gift is signed at all.
 */
export function KeepForm({
  shortId,
  senderName,
  locale,
}: {
  shortId: string;
  senderName: string;
  locale: GiftLocale;
}) {
  const t = S[locale] ?? S.en;
  const first = senderFirstName(senderName);
  const [email, setEmail] = useState("");
  const [picks, setPicks] = useState<Record<KeepOccasion, Pick>>({
    birthday: NONE,
    anniversary: NONE,
    valentines: NONE,
  });
  const [missing, setMissing] = useState<KeepOccasion | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "invalid" | "limited">(
    "idle",
  );
  const failed = state === "error" || state === "invalid" || state === "limited";
  const problem = useRef<HTMLParagraphElement>(null);
  // The words sit under the button, which can be at the foot of a phone's screen: without this the
  // tap looks like it did nothing.
  useEffect(() => {
    if (failed) problem.current?.scrollIntoView({ block: "nearest" });
  }, [failed]);
  const prefix = locale === "es" ? "/es" : "";
  const months = Array.from({ length: 12 }, (_, i) => {
    const name = new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", {
      month: "long",
      timeZone: "UTC",
    }).format(Date.UTC(2000, i, 1));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  const set = (occasion: KeepOccasion, next: Partial<Pick>) => {
    setPicks((p) => {
      const merged = { ...p[occasion], ...next };
      // A day the new month doesn't have (31 April) is cleared rather than kept wrong.
      if (merged.month && merged.day && merged.day > daysIn(merged.month)) merged.day = null;
      return { ...p, [occasion]: merged };
    });
    if (missing === occasion) setMissing(null);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The address as the field holds it: the field keeps its own value (see the input below), and
    // state has it only for the sent screen and "Change it".
    const typed = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setEmail(typed);
    const chosen = senderName ? KEEP_OCCASIONS.filter((o) => picks[o].on) : [];
    const undated = chosen.find((o) => needsDay(o) && (!picks[o].month || !picks[o].day));
    if (undated) {
      setMissing(undated);
      return;
    }
    setState("sending");
    const reminders = chosen.map((o) =>
      needsDay(o) ? { occasion: o, month: picks[o].month, day: picks[o].day } : { occasion: o },
    );
    const res = await fetch("/api/keep", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shortId, email: typed, reminders }),
    }).catch(() => null);
    if (res?.ok) {
      track("keep_requested", { reminders: reminders.length });
      setState("sent");
    } else setState(res?.status === 429 ? "limited" : res?.status === 400 ? "invalid" : "error");
  };

  const field =
    "h-12 w-full rounded-full border border-white/15 bg-white/8 px-5 text-base text-paper placeholder:text-paper/40 focus:border-coral focus:outline-none";

  return (
    <div
      lang={locale}
      translate="no"
      className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 py-12 text-center text-paper"
    >
      <div className="grain-overlay" />
      <LogoMark className="size-10" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.1 }}
        className="mt-7 grid size-16 place-items-center rounded-full bg-white/8"
      >
        {state === "sent" ? (
          <MailCheck aria-hidden="true" className="size-6 text-coral" />
        ) : (
          <Bookmark aria-hidden="true" className="size-6 text-coral" />
        )}
      </motion.div>

      {state === "sent" ? (
        <div className="mt-6 flex max-w-sm flex-col items-center" data-testid="keep-sent">
          <h1
            className="text-[1.8rem] leading-tight italic"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.sentTitle}
          </h1>
          <p className="mt-3 text-sm [overflow-wrap:anywhere] text-paper/70">
            {t.sentBody.replace("{email}", email.trim())}
          </p>
          <p className="mt-2 text-xs text-paper/50">{t.sentNote}</p>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="mt-4 inline-flex min-h-11 items-center text-sm text-paper/70 underline underline-offset-4 hover:text-paper"
            data-testid="keep-change"
          >
            {t.change}
          </button>
        </div>
      ) : (
        <>
          <h1
            className="mt-6 text-[1.8rem] leading-tight italic"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.title}
          </h1>
          <p className="mt-2 max-w-xs text-sm text-paper/70">{t.blurb}</p>
          <form
            onSubmit={submit}
            className="mt-8 flex w-full max-w-sm flex-col gap-3 text-left"
            data-testid="keep-form"
          >
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              // Uncontrolled: an address typed before the page has finished loading would otherwise be
              // wiped by the first re-render (a ticked box); the submit reads it from the field.
              defaultValue={email}
              onChange={() => {
                if (state === "invalid") setState("idle");
              }}
              placeholder={t.email}
              aria-label={t.email}
              className={cn(field, "text-center")}
              data-testid="keep-email"
            />

            {senderName ? (
              <fieldset className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <legend className="px-1 text-xs text-paper/60">{t.nudges}</legend>
                {KEEP_OCCASIONS.map((o) => {
                  const pick = picks[o];
                  return (
                    <div key={o} className="py-1" data-testid={`keep-${o}`}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={pick.on}
                          onChange={(e) => set(o, { on: e.target.checked })}
                          className="size-5 shrink-0 accent-coral"
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {o === "birthday" && !first ? t.birthdayUnnamed : t[o].replace("{sender}", first)}
                        </span>
                      </label>
                      {pick.on && needsDay(o) ? (
                        <div className="mt-1 mb-2 ml-8 flex gap-2">
                          <Select>
                            <select
                              value={pick.month ?? ""}
                              onChange={(e) =>
                                set(o, { month: e.target.value ? Number(e.target.value) : null })
                              }
                              aria-label={t.month}
                              className={cn(
                                field,
                                "h-11 appearance-none pr-9 pl-4 text-sm",
                                !pick.month && "text-paper/50",
                              )}
                              data-testid={`keep-${o}-month`}
                            >
                              <option value="" className="bg-night text-paper">
                                {t.month}
                              </option>
                              {months.map((name, i) => (
                                <option key={name} value={i + 1} className="bg-night text-paper">
                                  {name}
                                </option>
                              ))}
                            </select>
                          </Select>
                          <Select narrow>
                            <select
                              value={pick.day ?? ""}
                              onChange={(e) =>
                                set(o, { day: e.target.value ? Number(e.target.value) : null })
                              }
                              aria-label={t.day}
                              className={cn(
                                field,
                                "h-11 appearance-none pr-9 pl-4 text-sm",
                                !pick.day && "text-paper/50",
                              )}
                              data-testid={`keep-${o}-day`}
                            >
                              <option value="" className="bg-night text-paper">
                                {t.day}
                              </option>
                              {Array.from(
                                { length: pick.month ? daysIn(pick.month) : 31 },
                                (_, i) => (
                                  <option key={i} value={i + 1} className="bg-night text-paper">
                                    {i + 1}
                                  </option>
                                ),
                              )}
                            </select>
                          </Select>
                        </div>
                      ) : null}
                      {missing === o ? (
                        <p role="alert" className="mb-2 ml-8 text-xs text-coral">
                          {t.pickDay}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
            ) : null}

            <motion.button
              type="submit"
              disabled={state === "sending"}
              whileTap={{ scale: 0.97 }}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow disabled:opacity-60"
              data-testid="keep-submit"
            >
              {state === "sending" ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : null}
              <span>{state === "sending" ? t.sending : t.send}</span>
            </motion.button>
            {failed ? (
              <p ref={problem} role="alert" className="text-center text-sm text-coral">
                {t[state as "error" | "invalid" | "limited"]}
              </p>
            ) : null}
            {/* Word for word what the keep stores as its consent (lib/keep/keep.ts). */}
            <p className="mt-1 text-center text-xs leading-relaxed text-paper/50">
              {keepConsent(locale)}{" "}
              <a
                href={`${prefix}/legal/privacy`}
                className="underline underline-offset-2 hover:text-paper/80"
              >
                {t.privacy}
              </a>
            </p>
          </form>
        </>
      )}

      <a
        href={`/g/${shortId}`}
        className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-sm text-paper/60 underline-offset-4 hover:text-paper hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </a>
    </div>
  );
}

/** A native select (the phone's own wheel), with the arrow its pill drawing took away. */
function Select({ narrow = false, children }: { narrow?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("relative min-w-0", narrow ? "flex-[2]" : "flex-[3]")}>
      {children}
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-paper/60"
      />
    </div>
  );
}
