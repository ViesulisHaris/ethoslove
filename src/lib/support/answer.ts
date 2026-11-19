import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Currency } from "@/lib/pricing/products";
import { SUPPORT_LIMITS, SUPPORT_MODELS, costMicros, type SupportModelId } from "./config";
import { supportSystemPrompt } from "./guide";

/**
 * One answer from the help chat's model. No database and no HTTP here: the route keeps the
 * conversation, the limits and the money; the test set (tests/eval/support) calls this directly.
 */

export type TurnUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; costMicros: number };

export type SupportAnswer = {
  /** What the visitor reads, or null when nothing usable came back (see `stop`). */
  reply: string | null;
  /** The model asks to offer the team. */
  handoff: boolean;
  /** "end_turn" normally; "refusal", "max_tokens" or "bad_output" when `reply` is null. */
  stop: string;
  /**
   * The assistant turn to keep and replay unchanged on the next message; null with `reply`, when the
   * route keeps its own fixed line instead (fixedTurn), so a refused or cut-off answer is never replayed.
   */
  assistant: Anthropic.MessageParam | null;
  usage: TurnUsage;
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    handoff: { type: "boolean" },
  },
  required: ["reply", "handoff"],
  additionalProperties: false,
} as const;

const output = z.object({ reply: z.string().trim().min(1).max(3000), handoff: z.boolean() });

/**
 * The visitor's turn as the model reads it: their words after a line of context that never changes
 * within a chat, so the conversation stays an append-only prefix (cacheable, and safe to replay).
 */
export function visitorTurn(text: string, ctx: { currency: Currency; page: string | null }): Anthropic.MessageParam {
  return {
    role: "user",
    content: `(Visitor's currency: ${ctx.currency.toUpperCase()}. Page: ${ctx.page ?? "unknown"}.)\n\n${text}`,
  };
}

/** An assistant turn the server wrote itself (a fixed line), in the same shape the model answers in. */
export function fixedTurn(reply: string, handoff: boolean): Anthropic.MessageParam {
  return { role: "assistant", content: [{ type: "text", text: JSON.stringify({ reply, handoff }) }] };
}

function thinkingFor(model: SupportModelId): Anthropic.ThinkingConfigParam {
  const mode = SUPPORT_MODELS[model].thinking;
  // "between_tools" (Claude Sonnet 5.5's thinking-off mode) postdates this SDK's types.
  return (mode === "adaptive" ? { type: "adaptive" } : { type: mode }) as Anthropic.ThinkingConfigParam;
}

/**
 * The response's blocks as request params: text and thinking kept exactly (thinking blocks must go
 * back unchanged, signature and all), and nothing the SDK added on its side.
 */
function replayable(content: Anthropic.ContentBlock[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const block of content) {
    if (block.type === "text") blocks.push({ type: "text", text: block.text });
    else if (block.type === "thinking") blocks.push({ type: "thinking", thinking: block.thinking, signature: block.signature });
    else if (block.type === "redacted_thinking") blocks.push({ type: "redacted_thinking", data: block.data });
  }
  return blocks;
}

export async function answerSupport({
  client,
  model,
  history,
  visitor,
}: {
  client: Anthropic;
  model: SupportModelId;
  /** Earlier turns, exactly as stored. */
  history: Anthropic.MessageParam[];
  /** This turn, from visitorTurn(). */
  visitor: Anthropic.MessageParam;
}): Promise<SupportAnswer> {
  const response = await client.messages.parse({
    model,
    max_tokens: SUPPORT_LIMITS.maxTokens,
    // The guide is the same for every chat: one 1-hour cache entry serves them all.
    system: [{ type: "text", text: supportSystemPrompt(), cache_control: { type: "ephemeral", ttl: "1h" } }],
    thinking: thinkingFor(model),
    output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [...history, visitor],
  });

  const usage: TurnUsage = {
    input: response.usage.input_tokens ?? 0,
    output: response.usage.output_tokens ?? 0,
    cacheRead: response.usage.cache_read_input_tokens ?? 0,
    cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    costMicros: costMicros(model, response.usage),
  };

  const parsed = response.stop_reason === "refusal" ? null : output.safeParse(response.parsed_output);
  const ok = parsed?.success ? parsed.data : null;
  const stop = ok ? (response.stop_reason ?? "end_turn") : response.stop_reason === "refusal" || response.stop_reason === "max_tokens" ? response.stop_reason : "bad_output";
  const blocks = replayable(response.content);

  return {
    reply: ok?.reply ?? null,
    handoff: ok?.handoff ?? false,
    stop,
    assistant: ok && blocks.length ? { role: "assistant", content: blocks } : null,
    usage,
  };
}
