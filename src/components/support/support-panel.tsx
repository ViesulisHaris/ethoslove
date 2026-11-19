"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { BRAND } from "@/config/brand";
import { TOPICS, isStuckTopic, type TopicId } from "@/lib/support/topic-ids";
import { useCurrency } from "@/lib/pricing/use-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

/**
 * The help chat. It opens with a short introduction and the problems people ask about most; each
 * topic answers with ready-made text from the server, at no cost. Only "Something else" or "Ask
 * something else" opens the box that a model answers, and only "I still can't…" (or the model,
 * when it can't help) brings up the form that emails the team.
 */

type Line = { role: "visitor" | "bot"; text: string };

/** What the panel offers under the conversation. */
type Stage = { kind: "menu" } | { kind: "followUp"; topic: TopicId } | { kind: "ask" } | { kind: "idle" };

type Saved = {
  chatId: string | null;
  lines: Line[];
  stage: Stage;
  /** The last answer offered the team. */
  offer: boolean;
  /** The address the chat was handed to, once it was. */
  handedTo: string | null;
};

const EMPTY: Saved = { chatId: null, lines: [], stage: { kind: "menu" }, offer: false, handedTo: null };
// This tab only: a chat is a short thing, and nobody else on this computer should find it.
const STORAGE_KEY = "ethos:help-chat:v2";
const MAX_CHARS = 600;

function restore(): Saved {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const saved = JSON.parse(raw) as Saved;
    return Array.isArray(saved.lines) && saved.stage && typeof saved.stage.kind === "string" ? { ...EMPTY, ...saved } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(saved: Saved) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Private windows and full storage: the chat still works, it just isn't kept.
  }
}

/** The bot's text with this site's addresses made into links; nothing else is turned into markup. */
function withLinks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(?:https?:\/\/)?(?:www\.)?tryethos\.io(\/[^\s),;!?]*[^\s),;!?.:])?/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <a key={at} href={`https://${BRAND.domain}${match[1] ?? ""}`} className="font-medium underline underline-offset-2">
        {match[0].replace(/^https?:\/\//, "")}
      </a>,
    );
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type ChatBody = { message: string } | { topic: TopicId; step?: "answer" | "stuck" };

export function SupportPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("support");
  const locale = useLocale() === "es" ? "es" : "en";
  const currency = useCurrency();
  const titleId = useId();
  // The panel only ever renders in the browser (loaded with ssr: false), so this tab's chat can be
  // read straight away.
  const [saved, setSaved] = useState<Saved>(restore);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"rate" | "down" | null>(null);
  const [email, setEmail] = useState("");
  const [handoffState, setHandoffState] = useState<"idle" | "sending" | "invalid" | "failed">("idle");
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && saved.stage.kind === "ask") input.current?.focus();
  }, [open, saved.stage.kind]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [saved.lines.length, busy, saved.offer, saved.handedTo, saved.stage.kind]);

  const update = (next: Saved) => {
    setSaved(next);
    persist(next);
  };

  /** Sends one turn; the visitor's words show at once, the answer when it comes. */
  async function send(body: ChatBody, shown: string, after: (handoff: boolean) => Stage) {
    if (busy) return;
    const before = saved;
    const asked: Saved = { ...before, lines: [...before.lines, { role: "visitor", text: shown }], offer: false, stage: { kind: "idle" } };
    update(asked);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: before.chatId ?? undefined, locale, currency, page: window.location.pathname, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as { chatId?: string; reply?: string; handoff?: boolean };
      if (res.ok && data.reply && data.chatId) {
        const handoff = Boolean(data.handoff);
        update({ ...asked, chatId: data.chatId, lines: [...asked.lines, { role: "bot", text: data.reply }], offer: handoff, stage: after(handoff) });
        return;
      }
      update(before);
      if ("message" in body) setDraft(body.message);
      setNotice(res.status === 429 ? "rate" : "down");
    } catch {
      update(before);
      if ("message" in body) setDraft(body.message);
      setNotice("down");
    } finally {
      setBusy(false);
    }
  }

  const chooseTopic = (topic: TopicId) => void send({ topic }, t(`topics.${topic}.label`), () => ({ kind: "followUp", topic }));

  const stuck = (topic: TopicId) => {
    if (!isStuckTopic(topic)) return;
    void send({ topic, step: "stuck" }, t(`topics.${topic}.stuck`), () => ({ kind: "idle" }));
  };

  // These two stay in the browser: nothing to answer, nothing worth keeping.
  // Moving on closes the team's form: it belongs to the answer that offered it.
  const helped = () =>
    update({ ...saved, lines: [...saved.lines, { role: "visitor", text: t("followDone") }, { role: "bot", text: t("doneReply") }], stage: { kind: "menu" }, offer: false });
  const startAsking = () => update({ ...saved, lines: [...saved.lines, { role: "bot", text: t("askReply") }], stage: { kind: "ask" }, offer: false });
  const backToTopics = () => update({ ...saved, stage: { kind: "menu" }, offer: false });

  function ask(text: string) {
    const message = text.trim().slice(0, MAX_CHARS);
    if (!message) return;
    setDraft("");
    void send({ message }, message, () => ({ kind: "ask" }));
  }

  async function handOff(event: FormEvent) {
    event.preventDefault();
    if (!saved.chatId || handoffState === "sending") return;
    setHandoffState("sending");
    try {
      const res = await fetch("/api/support/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: saved.chatId, email }),
      });
      if (res.ok) {
        update({ ...saved, offer: false, handedTo: email.trim().toLowerCase(), stage: { kind: "idle" } });
        setHandoffState("idle");
      } else setHandoffState(res.status === 400 ? "invalid" : "failed");
    } catch {
      setHandoffState("failed");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  }

  if (!open) return null;

  const { stage } = saved;
  const choice = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
  const quiet = "rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-app-hide
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[min(85dvh,640px)] flex-col overflow-hidden rounded-t-2xl border border-border bg-background text-foreground shadow-lift sm:inset-x-auto sm:right-4 sm:bottom-4 sm:h-[min(600px,calc(100dvh-2rem))] sm:w-[380px] sm:rounded-2xl md:right-6 md:bottom-6"
    >
      <header className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-lg leading-tight">
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        {saved.lines.length > 0 ? (
          <Button variant="ghost" size="icon" aria-label={t("restart")} title={t("restart")} onClick={() => update(EMPTY)}>
            <RotateCcw />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" aria-label={t("close")} onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <Bubble role="bot">{t("greeting")}</Bubble>
        {saved.lines.map((line, i) => (
          <Bubble key={i} role={line.role}>
            {line.role === "bot" ? withLinks(line.text) : line.text}
          </Bubble>
        ))}
        {busy ? (
          <p className="text-sm text-muted-foreground motion-safe:animate-pulse" role="status">
            {t("writing")}
          </p>
        ) : null}

        {!busy && stage.kind === "menu" ? (
          <div className="space-y-2 pt-1">
            {TOPICS.map((topic) => (
              <button key={topic} type="button" className={choice} onClick={() => chooseTopic(topic)}>
                {t(`topics.${topic}.label`)}
              </button>
            ))}
            <button type="button" className={choice} onClick={startAsking}>
              {t("topics.other.label")}
            </button>
          </div>
        ) : null}

        {!busy && stage.kind === "followUp" ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={quiet} onClick={helped}>
              {t("followDone")}
            </button>
            {isStuckTopic(stage.topic) ? (
              <button type="button" className={quiet} onClick={() => stuck(stage.topic)}>
                {t(`topics.${stage.topic}.stuck`)}
              </button>
            ) : null}
            <button type="button" className={quiet} onClick={startAsking}>
              {t("followAsk")}
            </button>
          </div>
        ) : null}

        {saved.offer && !saved.handedTo && saved.chatId ? (
          <form onSubmit={handOff} className="space-y-2 rounded-xl border border-coral/30 bg-coral/5 p-3">
            <p className="text-sm font-medium">{t("handoffTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("handoffBody")}</p>
            <label className="block text-sm" htmlFor={`${titleId}-email`}>
              {t("emailLabel")}
            </label>
            <div className="flex gap-2">
              <Input
                id={`${titleId}-email`}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (handoffState === "invalid") setHandoffState("idle");
                }}
                aria-invalid={handoffState === "invalid"}
                className="h-10 flex-1"
              />
              <Button type="submit" className="h-10 rounded-full px-4" disabled={handoffState === "sending"}>
                {handoffState === "sending" ? t("handoffSending") : t("handoffSend")}
              </Button>
            </div>
            {handoffState === "invalid" ? <p className="text-sm text-destructive">{t("errorEmailInvalid")}</p> : null}
            {handoffState === "failed" ? <p className="text-sm text-destructive">{t("errorHandoff", { email: BRAND.supportEmail })}</p> : null}
          </form>
        ) : null}
        {saved.handedTo ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm" role="status">
            {t("handoffDone", { email: saved.handedTo })}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm text-destructive" role="alert">
            {t(notice === "rate" ? "errorRate" : "errorDown", { email: BRAND.supportEmail })}
          </p>
        ) : null}
        {!busy && (stage.kind === "ask" || stage.kind === "idle") ? (
          <button type="button" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={backToTopics}>
            {t("backToTopics")}
          </button>
        ) : null}
        <div ref={end} />
      </div>

      {stage.kind === "ask" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
          className="border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_CHARS}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
            <Button type="submit" size="icon-lg" className="size-10 rounded-full" disabled={busy || !draft.trim()} aria-label={t("send")}>
              <ArrowUp />
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t("disclaimer")}</p>
        </form>
      ) : null}
    </div>
  );
}

function Bubble({ role, children }: { role: Line["role"]; children: ReactNode }) {
  return (
    <p
      className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
        role === "visitor" ? "ml-auto rounded-br-md bg-primary text-primary-foreground" : "mr-auto rounded-bl-md bg-muted text-foreground",
      )}
    >
      {children}
    </p>
  );
}
