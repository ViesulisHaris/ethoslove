import "server-only";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { ReactElement } from "react";
import { z } from "zod";
import { cleanLanding } from "@/lib/attribution/source";
import { isUndeliverable } from "@/lib/email/send";
import { fixedTurn, visitorTurn, type SupportAnswer } from "./answer";
import { SUPPORT_LIMITS, type SupportModelId } from "./config";
import { looksLikeGiveaway } from "./guard";
import { TOPICS, isStuckTopic, topicTurn } from "./topics";
import { SUPPORT_LINES, spendKey, visitorKey } from "./lines";
import { addUsage, emptyTotals, type Chat, type SupportStore, type TranscriptEntry } from "./store";

/**
 * The help chat's two requests, without the HTTP: the routes (src/app/api/support/*) pass in the
 * real store, model and mailer; the unit tests and the stress test pass in their own.
 */

export type Result = { status: number; json: Record<string, unknown> };

const SPEND_WINDOW = 2 * 86_400;

// A turn is either a typed message (answered by the model) or a topic step (answered from the
// ready-made text in src/lib/support/topics.ts, at no cost).
const chatInput = z
  .object({
    chatId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(SUPPORT_LIMITS.messageChars).optional(),
    topic: z.enum(TOPICS).optional(),
    step: z.enum(["answer", "stuck"]).default("answer"),
    locale: z.enum(["en", "es"]).default("en"),
    currency: z.enum(["eur", "usd", "gbp"]).default("eur"),
    page: z.string().max(300).optional(),
  })
  .refine((v) => (v.message === undefined) !== (v.topic === undefined))
  .refine((v) => v.step === "answer" || (v.topic !== undefined && isStuckTopic(v.topic)));

export type ChatDeps = {
  store: SupportStore | null;
  /** An API key is set (isConfigured.ai). */
  configured: boolean;
  model: SupportModelId;
  answer: (args: { model: SupportModelId; history: Anthropic.MessageParam[]; visitor: Anthropic.MessageParam }) => Promise<SupportAnswer>;
  ip: string;
  capMicros: number;
  now?: () => Date;
  log?: (message: string) => void;
};

export async function handleChat(body: unknown, deps: ChatDeps): Promise<Result> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((m: string) => console.error(m));
  if (!deps.store) return { status: 503, json: { error: "not_configured" } };
  const parsed = chatInput.safeParse(body);
  if (!parsed.success) return { status: 400, json: { error: "invalid_input" } };
  const { message, topic, step, locale, currency, page } = parsed.data;
  // Topics need no model, so they keep working without a key and past the day's spending cap.
  if (message !== undefined && !deps.configured) return { status: 503, json: { error: "not_configured" } };
  const store = deps.store;
  const lines = SUPPORT_LINES[locale];
  const visitor = visitorKey(deps.ip);

  try {
    // Limits first: a visitor over them costs one database round trip, never a model call.
    const [burst, day] = await Promise.all([store.count(`v:${visitor}:10m`, 1, 600), store.count(`v:${visitor}:day`, 1, 86_400)]);
    if (burst > SUPPORT_LIMITS.perVisitor10Min || day > SUPPORT_LIMITS.perVisitorDay) return { status: 429, json: { error: "rate_limited" } };
    if (message !== undefined) {
      const spent = await store.count(spendKey(now()), 0, SPEND_WINDOW);
      if (spent >= deps.capMicros) return { status: 503, json: { error: "busy" } };
    }

    // A chat id the store doesn't know (deleted after 30 days, or made up) starts a new chat.
    const known = parsed.data.chatId ? await store.load(parsed.data.chatId) : null;
    const chat: Chat = known ?? {
      id: randomUUID(),
      locale,
      currency,
      page: page ? (cleanLanding(page.split(/[?#]/)[0]) ?? null) : null,
      model: deps.model,
      apiMessages: [],
      transcript: [],
      visitorTurns: 0,
      totals: emptyTotals(),
      handoffAt: null,
    };

    if (chat.visitorTurns >= SUPPORT_LIMITS.visitorTurns) {
      return { status: 200, json: { chatId: chat.id, reply: lines.tooLong, handoff: true, turnsLeft: 0 } };
    }

    const prevTurns = chat.visitorTurns;

    if (topic !== undefined) {
      const scripted = topicTurn(topic, step, locale, chat.currency);
      const at = now().toISOString();
      const next: Chat = {
        ...chat,
        apiMessages: [...chat.apiMessages, visitorTurn(scripted.visitor, { currency: chat.currency, page: chat.page }), fixedTurn(scripted.reply, scripted.handoff)],
        transcript: [...chat.transcript, { role: "visitor", text: scripted.visitor, at }, { role: "bot", text: scripted.reply, at }],
        visitorTurns: prevTurns + 1,
      };
      if ((await store.save(next, prevTurns)) === "conflict") return { status: 409, json: { error: "conflict" } };
      return { status: 200, json: { chatId: next.id, reply: scripted.reply, handoff: scripted.handoff, turnsLeft: SUPPORT_LIMITS.visitorTurns - next.visitorTurns } };
    }

    // Not a topic, so a typed message (the input check allows exactly one of the two).
    const typed = message ?? "";
    const turn = visitorTurn(typed, { currency: chat.currency, page: chat.page });
    const answer = await deps.answer({ model: deps.model, history: chat.apiMessages, visitor: turn });
    await store.count(spendKey(now()), answer.usage.costMicros, SPEND_WINDOW);

    // An answer that can't be used: a refusal is almost always a question that isn't about Ethos;
    // anything else (cut off, malformed, or seeming to give something away) offers the team.
    const givesAway = Boolean(answer.reply && looksLikeGiveaway(answer.reply));
    const usable = answer.reply && !givesAway ? answer.reply : null;
    const reply = usable ?? (answer.stop === "refusal" ? lines.offTopic : lines.failed);
    const handoff = usable ? answer.handoff : answer.stop !== "refusal";
    if (givesAway) log(`[support] reply held back, it looked like a giveaway, in chat ${chat.id}`);
    else if (!answer.reply) log(`[support] model answer unusable (${answer.stop}) in chat ${chat.id}`);

    const at = now().toISOString();
    const transcript: TranscriptEntry[] = [...chat.transcript, { role: "visitor", text: typed, at }, { role: "bot", text: reply, at }];
    const next: Chat = {
      ...chat,
      model: deps.model,
      // A held-back reply is replaced in the history too, so the model never builds on it.
      apiMessages: [...chat.apiMessages, turn, usable && answer.assistant ? answer.assistant : fixedTurn(reply, handoff)],
      transcript,
      visitorTurns: prevTurns + 1,
      totals: addUsage(chat.totals, answer.usage),
    };
    if ((await store.save(next, prevTurns)) === "conflict") return { status: 409, json: { error: "conflict" } };
    return { status: 200, json: { chatId: next.id, reply, handoff, turnsLeft: SUPPORT_LIMITS.visitorTurns - next.visitorTurns } };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { status: 503, json: { error: "busy" } };
    if (error instanceof Anthropic.APIError) {
      log(`[support] model error ${error.status}: ${error.message}`);
      return { status: 502, json: { error: "failed" } };
    }
    log(`[support] chat failed: ${(error as Error).message}`);
    return { status: 503, json: { error: "unavailable" } };
  }
}

const handoffInput = z.object({
  chatId: z.string().uuid(),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export type HandoffDeps = {
  store: SupportStore | null;
  ip: string;
  to: string;
  send: (args: { to: string; subject: string; react: ReactElement; replyTo: string; idempotencyKey: string }) => Promise<{ ok: boolean; error?: string }>;
  render: (chat: Chat, email: string) => { subject: string; react: ReactElement };
  log?: (message: string) => void;
};

export async function handleHandoff(body: unknown, deps: HandoffDeps): Promise<Result> {
  const log = deps.log ?? ((m: string) => console.error(m));
  if (!deps.store) return { status: 503, json: { error: "not_configured" } };
  const parsed = handoffInput.safeParse(body);
  if (!parsed.success) return { status: 400, json: { error: "invalid_input" } };
  const { chatId, email } = parsed.data;
  if (isUndeliverable(email)) return { status: 400, json: { error: "invalid_input" } };
  const store = deps.store;

  try {
    const sent = await store.count(`h:${visitorKey(deps.ip)}:day`, 1, 86_400);
    if (sent > SUPPORT_LIMITS.handoffsPerVisitorDay) return { status: 429, json: { error: "rate_limited" } };
    const chat = await store.load(chatId);
    if (!chat || chat.visitorTurns === 0) return { status: 404, json: { error: "not_found" } };

    await store.handoff(chat.id, email);
    const { subject, react } = deps.render(chat, email);
    // Once per chat and length: a double tap sends one email, a later question in the same chat another.
    const result = await deps.send({ to: deps.to, subject, react, replyTo: email, idempotencyKey: `support-handoff:${chat.id}:${chat.visitorTurns}` });
    if (!result.ok) {
      log(`[support] hand-off email failed for chat ${chat.id}: ${result.error ?? "unknown"}`);
      return { status: 502, json: { error: "email_failed" } };
    }
    return { status: 200, json: { ok: true } };
  } catch (error) {
    log(`[support] hand-off failed: ${(error as Error).message}`);
    return { status: 503, json: { error: "unavailable" } };
  }
}
