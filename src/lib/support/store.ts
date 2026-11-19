import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { isConfigured } from "@/lib/env";
import type { Currency } from "@/lib/pricing/products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { TurnUsage } from "./answer";

/**
 * Where the help chat keeps its conversations and counters: Supabase in production (migration
 * 0020), a map in this process in development and tests, so the chat can be tried and stress-tested
 * locally without the live database.
 */

export type TranscriptEntry = { role: "visitor" | "bot"; text: string; at: string };

export type Chat = {
  id: string;
  locale: "en" | "es";
  currency: Currency;
  page: string | null;
  model: string;
  apiMessages: Anthropic.MessageParam[];
  transcript: TranscriptEntry[];
  visitorTurns: number;
  totals: TurnUsage;
  handoffAt: string | null;
};

export interface SupportStore {
  /** The chat, or null when it doesn't exist (never started, or deleted after 30 days). */
  load(id: string): Promise<Chat | null>;
  /**
   * Writes the chat after a turn: a new chat (prevTurns 0) is inserted; an old one is updated only
   * while it still has prevTurns visitor turns, so two messages sent at once can't overwrite each other.
   */
  save(chat: Chat, prevTurns: number): Promise<"ok" | "conflict">;
  /** Adds to a counter in its window and returns the total (add 0 to read it). */
  count(key: string, add: number, windowSeconds: number): Promise<number>;
  /** Marks the chat handed off to this address; false when it doesn't exist. */
  handoff(id: string, email: string): Promise<boolean>;
}

const ZERO: TurnUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costMicros: 0 };
export const emptyTotals = (): TurnUsage => ({ ...ZERO });

export function addUsage(a: TurnUsage, b: TurnUsage): TurnUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    costMicros: a.costMicros + b.costMicros,
  };
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

function supabaseStore(): SupportStore | null {
  const db = getSupabaseAdminClient();
  if (!db) return null;
  return {
    async load(id) {
      const { data, error } = await db
        .from("support_chats")
        .select("id, locale, currency, page, model, api_messages, transcript, visitor_turns, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micros, handoff_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`support_chats load: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        locale: data.locale === "es" ? "es" : "en",
        currency: data.currency as Currency,
        page: data.page,
        model: data.model,
        apiMessages: (data.api_messages ?? []) as unknown as Anthropic.MessageParam[],
        transcript: (data.transcript ?? []) as unknown as TranscriptEntry[],
        visitorTurns: data.visitor_turns,
        totals: {
          input: Number(data.input_tokens),
          output: Number(data.output_tokens),
          cacheRead: Number(data.cache_read_tokens),
          cacheWrite: Number(data.cache_write_tokens),
          costMicros: Number(data.cost_micros),
        },
        handoffAt: data.handoff_at,
      };
    },

    async save(chat, prevTurns) {
      const fields = {
        model: chat.model,
        api_messages: chat.apiMessages as unknown as Json,
        transcript: chat.transcript as unknown as Json,
        visitor_turns: chat.visitorTurns,
        input_tokens: chat.totals.input,
        output_tokens: chat.totals.output,
        cache_read_tokens: chat.totals.cacheRead,
        cache_write_tokens: chat.totals.cacheWrite,
        cost_micros: chat.totals.costMicros,
        updated_at: new Date().toISOString(),
      };
      if (prevTurns === 0) {
        const { error } = await db.from("support_chats").insert({ id: chat.id, locale: chat.locale, currency: chat.currency, page: chat.page, ...fields });
        if (error) {
          if (error.code === "23505") return "conflict";
          throw new Error(`support_chats insert: ${error.message}`);
        }
        return "ok";
      }
      const { data, error } = await db.from("support_chats").update(fields).eq("id", chat.id).eq("visitor_turns", prevTurns).select("id");
      if (error) throw new Error(`support_chats update: ${error.message}`);
      return data && data.length ? "ok" : "conflict";
    },

    async count(key, add, windowSeconds) {
      const { data, error } = await db.rpc("support_count", { p_key: key, p_add: add, p_window_seconds: windowSeconds });
      if (error) throw new Error(`support_count: ${error.message}`);
      return Number(data ?? 0);
    },

    async handoff(id, email) {
      const { data, error } = await db
        .from("support_chats")
        .update({ handoff_at: new Date().toISOString(), handoff_email: email, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw new Error(`support_chats handoff: ${error.message}`);
      return Boolean(data && data.length);
    },
  };
}

// ---------------------------------------------------------------------------
// In this process (development and tests)
// ---------------------------------------------------------------------------

export function memoryStore(now: () => number = Date.now): SupportStore {
  const chats = new Map<string, Chat>();
  const counters = new Map<string, { start: number; total: number }>();
  return {
    async load(id) {
      const chat = chats.get(id);
      return chat ? structuredClone(chat) : null;
    },
    async save(chat, prevTurns) {
      const existing = chats.get(chat.id);
      if (prevTurns === 0 ? existing : !existing || existing.visitorTurns !== prevTurns) return "conflict";
      chats.set(chat.id, structuredClone(chat));
      return "ok";
    },
    async count(key, add, windowSeconds) {
      const t = now();
      const entry = counters.get(key);
      if (!entry || entry.start <= t - windowSeconds * 1000) {
        counters.set(key, { start: t, total: Math.max(0, add) });
        return Math.max(0, add);
      }
      entry.total += Math.max(0, add);
      return entry.total;
    },
    async handoff(id) {
      const chat = chats.get(id);
      if (!chat) return false;
      chat.handoffAt = new Date(now()).toISOString();
      return true;
    },
  };
}

let devStore: SupportStore | null = null;

/**
 * The store this server uses, or null when it has none (production without the service key).
 * SUPPORT_MEMORY_STORE=1 keeps chats in memory on a local production build, for the stress test.
 */
export function supportStore(): SupportStore | null {
  if (isConfigured.supabaseAdmin && process.env.SUPPORT_MEMORY_STORE !== "1") return supabaseStore();
  if (process.env.NODE_ENV === "production" && process.env.SUPPORT_MEMORY_STORE !== "1") return null;
  devStore ??= memoryStore();
  return devStore;
}
