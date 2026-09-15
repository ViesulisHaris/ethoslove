import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env, isConfigured } from "@/lib/env";
import { OCCASIONS } from "@/config/occasions";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/get-user";

export const runtime = "nodejs";
export const maxDuration = 20;

const input = z.object({
  occasion: z.enum(OCCASIONS),
  relationship: z.string().max(120).default(""),
  facts: z.string().min(10).max(1500),
  locale: z.enum(["en", "es"]).default("en"),
  recipientName: z.string().max(40).default(""),
  senderName: z.string().max(40).default(""),
});

const output = z.object({ drafts: z.array(z.string().min(40).max(1200)).length(3) });

const SYSTEM = `You write short personal messages that go inside a digital gift page one person sends to another.
Rules:
- 90–160 words. First person, addressed directly to the recipient by name. Warm, specific, a little playful. Never corporate, never greeting-card generic.
- Use the facts you're given as concrete moments; do not invent facts, places, or events. If a fact is thin, use it lightly rather than embellishing.
- Plain text. You may use **bold** on one short phrase and *italics* on one short phrase. Separate paragraphs with a blank line. No headings, no lists, no emoji.
- Write in the requested language. Match the register to the relationship (partner vs. parent vs. friend).
- Three drafts, each with a genuinely different angle (e.g. one starts mid-memory, one is a list of small things, one is quiet and direct).`;

export async function POST(request: Request) {
  if (!isConfigured.ai) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  // Paid upstream call: signed-in users only, limited per account rather than per (spoofable) IP.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const allowed = await rateLimit(`ai:${user.id}`, { limit: 12, windowSeconds: 3600 });
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { occasion, relationship, facts, locale, recipientName, senderName } = parsed.data;

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { drafts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 } },
            required: ["drafts"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            `Language: ${locale === "es" ? "Spanish (neutral, tú form)" : "English"}`,
            `Occasion: ${occasion}`,
            `Recipient: ${recipientName || "(unknown, avoid using a name)"}`,
            `Sender: ${senderName || "(unknown)"}`,
            `Relationship: ${relationship || "(not given)"}`,
            `Facts, one per line:\n${facts}`,
          ].join("\n"),
        },
      ],
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ error: "refused" }, { status: 422 });
    const result = output.safeParse(response.parsed_output);
    if (!result.success) return NextResponse.json({ error: "bad_output" }, { status: 502 });
    return NextResponse.json({ drafts: result.data.drafts });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "upstream_rate_limited" }, { status: 429 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: `api_${error.status}` }, { status: 502 });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
