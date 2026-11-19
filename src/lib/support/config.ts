/**
 * The help chat's knobs: which model answers, what it costs, and the limits that keep it cheap.
 * See docs/superpowers/specs/2026-11-19-support-chat-design.md.
 */

export type SupportModelId = "claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-opus-5-5";

type ModelSpec = {
  /** US dollars per million tokens. Cache writes are 2x input (1-hour TTL); reads as listed. */
  input: number;
  output: number;
  cacheRead: number;
  /**
   * How it thinks. A support answer gains little from reasoning, and every thinking token is billed
   * as output: Haiku 5.5 runs with thinking off, Sonnet 5.5 with thinking only between tool calls
   * (it has none here, so none), and Opus 5.5, which can't turn it off, at low effort.
   */
  thinking: "disabled" | "between_tools" | "adaptive";
};

export const SUPPORT_MODELS: Record<SupportModelId, ModelSpec> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, thinking: "disabled" },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, thinking: "between_tools" },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, thinking: "adaptive" },
};

/**
 * The model that answers in production, picked by the test set (tests/eval/support, reports in
 * docs/support/eval). 19 Nov 2026, 67 chats each: Opus 5.5 passed 66 (99%, about half a cent a chat),
 * Sonnet 5.5 61 (91%), Haiku 5.5 48 (72%; 84% before the rules were tightened). Haiku's misses were
 * the costly kind (wrong refund rules, offering the team in words without the form), so Opus it is.
 */
export const DEFAULT_SUPPORT_MODEL: SupportModelId = "claude-opus-5-5";

export function supportModel(): SupportModelId {
  const fromEnv = process.env.SUPPORT_MODEL;
  return fromEnv && fromEnv in SUPPORT_MODELS ? (fromEnv as SupportModelId) : DEFAULT_SUPPORT_MODEL;
}

export const SUPPORT_LIMITS = {
  /** Characters in one visitor message. */
  messageChars: 600,
  /** Visitor messages in one chat; after this the chat offers the team instead of answering. */
  visitorTurns: 12,
  /** Per visitor (a salted hash of the IP), across chats. */
  perVisitor10Min: 20,
  perVisitorDay: 60,
  handoffsPerVisitorDay: 3,
  /** Room for a short answer, the JSON around it and, on Opus, a little low-effort thinking. */
  maxTokens: 1200,
} as const;

/** Spend allowed per UTC day across every chat, in US dollars (SUPPORT_DAILY_CAP_USD). */
export function dailyCapMicros(): number {
  const usd = Number(process.env.SUPPORT_DAILY_CAP_USD);
  return Math.round((Number.isFinite(usd) && usd > 0 ? usd : 5) * 1_000_000);
}

export type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_1h_input_tokens?: number | null; ephemeral_5m_input_tokens?: number | null } | null;
};

/** What one response cost, in millionths of a dollar, from its usage. */
export function costMicros(model: SupportModelId, usage: UsageLike): number {
  const p = SUPPORT_MODELS[model];
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const write5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? Math.max(0, (usage.cache_creation_input_tokens ?? 0) - write1h);
  const dollars =
    ((usage.input_tokens ?? 0) * p.input +
      write1h * p.input * 2 +
      write5m * p.input * 1.25 +
      (usage.cache_read_input_tokens ?? 0) * p.cacheRead +
      (usage.output_tokens ?? 0) * p.output) /
    1_000_000;
  return Math.round(dollars * 1_000_000);
}
