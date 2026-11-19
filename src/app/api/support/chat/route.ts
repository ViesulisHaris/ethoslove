import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { env, isConfigured } from "@/lib/env";
import { clientIp } from "@/lib/request-ip";
import { answerSupport, fixedTurn, type SupportAnswer } from "@/lib/support/answer";
import { dailyCapMicros, supportModel } from "@/lib/support/config";
import { handleChat } from "@/lib/support/handlers";
import { supportStore } from "@/lib/support/store";

export const runtime = "nodejs";
export const maxDuration = 30;

let client: Anthropic | null = null;

/**
 * SUPPORT_FAKE_MODEL=1, on this computer only (never on Vercel): a canned answer at a made-up price,
 * so the chat's screens, limits and spending cap can be tried and stress-tested without the API.
 */
const fake = process.env.SUPPORT_FAKE_MODEL === "1" && !process.env.VERCEL;

async function fakeAnswer({ visitor }: { visitor: Anthropic.MessageParam }): Promise<SupportAnswer> {
  const text = typeof visitor.content === "string" ? visitor.content : "";
  const handoff = /refund|human|person|team|reembolso|persona/i.test(text);
  const reply = handoff ? "I can pass this to our team, who answer by email: leave your address just below." : "Templates and “Make it special” are paid once (tryethos.io/pricing).";
  return { reply, handoff, stop: "end_turn", assistant: fixedTurn(reply, handoff), usage: { input: 50, output: 40, cacheRead: 6000, cacheWrite: 0, costMicros: 2_000 } };
}

/** One message to the help chat (docs/superpowers/specs/2026-11-19-support-chat-design.md). */
export async function POST(request: Request) {
  // The chat is for this site's pages: a page elsewhere calling it is someone borrowing the model.
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (env.supportAnthropicApiKey) client ??= new Anthropic({ apiKey: env.supportAnthropicApiKey, maxRetries: 1, timeout: 25_000 });
  const result = await handleChat(body, {
    store: supportStore(),
    configured: fake || (Boolean(client) && isConfigured.supportChat),
    model: supportModel(),
    answer: fake ? fakeAnswer : (args) => answerSupport({ client: client!, ...args }),
    ip: clientIp(request.headers),
    capMicros: dailyCapMicros(),
  });
  return NextResponse.json(result.json, { status: result.status, headers: { "cache-control": "no-store" } });
}
