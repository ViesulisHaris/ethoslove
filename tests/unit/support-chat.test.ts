import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

const { supportSystemPrompt } = await import("@/lib/support/guide");
const { answerSupport, visitorTurn, fixedTurn } = await import("@/lib/support/answer");
const { costMicros, SUPPORT_LIMITS } = await import("@/lib/support/config");
const { handleChat, handleHandoff } = await import("@/lib/support/handlers");
const { memoryStore } = await import("@/lib/support/store");
const { SUPPORT_LINES, spendKey, visitorKey } = await import("@/lib/support/lines");
const { looksLikeGiveaway } = await import("@/lib/support/guard");
type SupportAnswer = import("@/lib/support/answer").SupportAnswer;
type SupportStore = import("@/lib/support/store").SupportStore;
type ChatDeps = import("@/lib/support/handlers").ChatDeps;
type HandoffDeps = import("@/lib/support/handlers").HandoffDeps;

describe("the guide", () => {
  const guide = supportSystemPrompt();

  it("is the same text every time, so the API can cache it", () => {
    expect(supportSystemPrompt()).toBe(guide);
    expect(guide).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });

  it("carries the rules, the prices in every currency, the FAQ and the playbook", () => {
    expect(guide).toContain("and nothing else");
    // Every currency checkout charges in (which ones depends on the environment).
    expect(guide).toMatch(/Make it special: €[\d.]+/);
    expect(guide).toContain("### Refunds?");
    expect(guide).toContain("## Support playbook");
    expect(guide).toContain("Finish and send it");
    expect(guide).toContain("support@secuora.xyz");
  });

  it("stays small enough to be cheap", () => {
    expect(guide.length).toBeLessThan(30_000);
  });
});

describe("costMicros", () => {
  it("prices input, output, cache reads and 1-hour cache writes", () => {
    // 1M of each on Opus 5.5: $4 input + $20 output + $0.20 read + $8 write (2x input).
    const usage = { input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_1h_input_tokens: 1e6, ephemeral_5m_input_tokens: 0 } };
    expect(costMicros("claude-opus-5-5", usage)).toBe(32_200_000);
    expect(costMicros("claude-haiku-5-5", usage)).toBe(810_000);
  });

  it("treats cache writes without a breakdown as 5-minute ones", () => {
    expect(costMicros("claude-sonnet-5-5", { cache_creation_input_tokens: 1e6 })).toBe(2_500_000);
  });
});

function fakeClient(response: Partial<Anthropic.Message> & { parsed_output?: unknown }) {
  const parse = vi.fn().mockResolvedValue({
    content: [],
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 6000, cache_creation_input_tokens: 0, cache_creation: null },
    ...response,
  });
  return { client: { messages: { parse } } as unknown as Anthropic, parse };
}

describe("answerSupport", () => {
  const visitor = visitorTurn("Do I pay monthly?", { currency: "gbp", page: "/pricing" });

  it("asks for a short structured answer over the cached guide, thinking as cheaply as the model allows", async () => {
    const { client, parse } = fakeClient({
      content: [{ type: "text", text: '{"reply":"No.","handoff":false}', citations: null } as Anthropic.TextBlock],
      parsed_output: { reply: "No.", handoff: false },
    });
    const answer = await answerSupport({ client, model: "claude-haiku-5-5", history: [], visitor });
    const params = parse.mock.calls[0][0];
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(params.thinking).toEqual({ type: "disabled" });
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.max_tokens).toBe(SUPPORT_LIMITS.maxTokens);
    expect(params.messages.at(-1).content).toContain("(Visitor's currency: GBP. Page: /pricing.)");
    expect(answer).toMatchObject({ reply: "No.", handoff: false, stop: "end_turn" });
    // Replayed exactly, without the SDK's extra fields.
    expect(answer.assistant).toEqual({ role: "assistant", content: [{ type: "text", text: '{"reply":"No.","handoff":false}' }] });
    expect(answer.usage.costMicros).toBeGreaterThan(0);
  });

  it("keeps thinking blocks, signature and all, for the next turn", async () => {
    const { client, parse } = fakeClient({
      content: [
        { type: "thinking", thinking: "", signature: "sig" } as Anthropic.ThinkingBlock,
        { type: "text", text: '{"reply":"Yes.","handoff":false}', citations: null } as Anthropic.TextBlock,
      ],
      parsed_output: { reply: "Yes.", handoff: false },
    });
    const answer = await answerSupport({ client, model: "claude-opus-5-5", history: [], visitor });
    expect(parse.mock.calls[0][0].thinking).toEqual({ type: "adaptive" });
    expect(answer.assistant?.content).toEqual([
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text: '{"reply":"Yes.","handoff":false}' },
    ]);
  });

  it("turns Sonnet's thinking off with between_tools", async () => {
    const { client, parse } = fakeClient({ content: [], parsed_output: { reply: "Hi.", handoff: false } });
    await answerSupport({ client, model: "claude-sonnet-5-5", history: [], visitor });
    expect(parse.mock.calls[0][0].thinking).toEqual({ type: "between_tools" });
  });

  it("returns nothing usable for a refusal, a cut-off answer or a malformed one", async () => {
    for (const [response, stop] of [
      [{ stop_reason: "refusal" as const, parsed_output: { reply: "x", handoff: false } }, "refusal"],
      [{ stop_reason: "max_tokens" as const, parsed_output: null }, "max_tokens"],
      [{ parsed_output: { reply: "", handoff: "maybe" } }, "bad_output"],
    ] as const) {
      const { client } = fakeClient(response);
      const answer = await answerSupport({ client, model: "claude-haiku-5-5", history: [], visitor });
      expect(answer).toMatchObject({ reply: null, handoff: false, stop, assistant: null });
    }
  });
});

const usage = { input: 10, output: 20, cacheRead: 6000, cacheWrite: 0, costMicros: 1500 };
const ok = (reply: string, handoff = false): SupportAnswer => ({ reply, handoff, stop: "end_turn", assistant: fixedTurn(reply, handoff), usage });

describe("handleChat", () => {
  let store: SupportStore;
  let answer: Mock<ChatDeps["answer"]>;
  const now = () => new Date("2026-11-19T12:00:00Z");
  const deps = (): ChatDeps => ({ store, configured: true, model: "claude-haiku-5-5", answer, ip: "203.0.113.7", capMicros: 5_000_000, now, log: () => {} });

  beforeEach(() => {
    store = memoryStore(() => now().getTime());
    answer = vi.fn<ChatDeps["answer"]>().mockResolvedValue(ok("Templates are paid once."));
  });

  it("refuses without a key or a store, and refuses bad input", async () => {
    expect(await handleChat({ message: "hi" }, { ...deps(), configured: false })).toMatchObject({ status: 503, json: { error: "not_configured" } });
    expect(await handleChat({ message: "hi" }, { ...deps(), store: null })).toMatchObject({ status: 503 });
    expect(await handleChat({ message: "   " }, deps())).toMatchObject({ status: 400 });
    expect(await handleChat({ message: "x".repeat(SUPPORT_LIMITS.messageChars + 1) }, deps())).toMatchObject({ status: 400 });
    expect(answer).not.toHaveBeenCalled();
  });

  it("starts a chat, then replays it exactly on the next message", async () => {
    const first = await handleChat({ message: "Do I pay monthly?", locale: "en", currency: "gbp", page: "/pricing?ref=x" }, deps());
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ reply: "Templates are paid once.", handoff: false, turnsLeft: SUPPORT_LIMITS.visitorTurns - 1 });
    const chatId = first.json.chatId as string;
    expect(chatId).toMatch(/^[0-9a-f-]{36}$/);

    await handleChat({ chatId, message: "And Ethos for Two?" }, deps());
    const history = answer.mock.calls[1][0].history as Anthropic.MessageParam[];
    expect(history).toHaveLength(2);
    expect(history[0].content).toContain("(Visitor's currency: GBP. Page: /pricing.)\n\nDo I pay monthly?");

    const chat = await store.load(chatId);
    expect(chat?.transcript.map((e) => e.role)).toEqual(["visitor", "bot", "visitor", "bot"]);
    expect(chat?.visitorTurns).toBe(2);
    expect(chat?.totals.costMicros).toBe(3000);
    expect(chat?.page).toBe("/pricing");
  });

  it("keeps a gift's id out of the page it records", async () => {
    const res = await handleChat({ message: "hi", page: "/g/AbC123xyz" }, deps());
    expect((await store.load(res.json.chatId as string))?.page).toBe("/g");
  });

  it("starts a new chat for an id it doesn't know", async () => {
    const res = await handleChat({ chatId: "5b0c2f1e-8f1d-4a3b-9c2d-1e2f3a4b5c6d", message: "hi" }, deps());
    expect(res.json.chatId).not.toBe("5b0c2f1e-8f1d-4a3b-9c2d-1e2f3a4b5c6d");
  });

  it("limits a visitor to 20 messages in 10 minutes", async () => {
    for (let i = 0; i < SUPPORT_LIMITS.perVisitor10Min; i++) expect((await handleChat({ message: `q${i}` }, deps())).status).toBe(200);
    expect(await handleChat({ message: "one more" }, deps())).toMatchObject({ status: 429, json: { error: "rate_limited" } });
    expect(answer).toHaveBeenCalledTimes(SUPPORT_LIMITS.perVisitor10Min);
    // Someone else is unaffected.
    expect((await handleChat({ message: "hi" }, { ...deps(), ip: "198.51.100.1" })).status).toBe(200);
  });

  it("stops answering once the day's spend reaches the cap, before calling the model", async () => {
    await store.count(spendKey(now()), 5_000_000, 172_800);
    expect(await handleChat({ message: "hi" }, deps())).toMatchObject({ status: 503, json: { error: "busy" } });
    expect(answer).not.toHaveBeenCalled();
  });

  it("adds every answer's cost to the day's spend", async () => {
    await handleChat({ message: "a" }, deps());
    await handleChat({ message: "b" }, deps());
    expect(await store.count(spendKey(now()), 0, 172_800)).toBe(3000);
  });

  it("offers the team instead of answering once a chat is long", async () => {
    let chatId: string | undefined;
    for (let i = 0; i < SUPPORT_LIMITS.visitorTurns; i++) chatId = (await handleChat({ chatId, message: `q${i}` }, { ...deps(), ip: `10.0.0.${i}` })).json.chatId as string;
    answer.mockClear();
    const res = await handleChat({ chatId, message: "and another" }, { ...deps(), ip: "10.0.1.1" });
    expect(res.json).toMatchObject({ reply: SUPPORT_LINES.en.tooLong, handoff: true, turnsLeft: 0 });
    expect(answer).not.toHaveBeenCalled();
  });

  it("answers a refusal with the off-topic line, and anything unusable with an offer of the team", async () => {
    answer.mockResolvedValueOnce({ reply: null, handoff: false, stop: "refusal", assistant: null, usage });
    expect((await handleChat({ message: "write my essay", locale: "es" }, deps())).json).toMatchObject({ reply: SUPPORT_LINES.es.offTopic, handoff: false });
    answer.mockResolvedValueOnce({ reply: null, handoff: false, stop: "bad_output", assistant: null, usage });
    expect((await handleChat({ message: "hm" }, deps())).json).toMatchObject({ reply: SUPPORT_LINES.en.failed, handoff: true });
  });

  it("stores the fixed line in place of an unusable answer, so it is never replayed", async () => {
    answer.mockResolvedValueOnce({ reply: null, handoff: false, stop: "max_tokens", assistant: null, usage });
    const res = await handleChat({ message: "hm" }, deps());
    const chat = await store.load(res.json.chatId as string);
    expect(chat?.apiMessages[1]).toEqual(fixedTurn(SUPPORT_LINES.en.failed, true));
  });

  it("passes the model's own hand-off", async () => {
    answer.mockResolvedValueOnce(ok("I can pass this to the team.", true));
    expect((await handleChat({ message: "refund please" }, deps())).json).toMatchObject({ handoff: true });
  });

  it("reports a model error as failed and a rate limit upstream as busy", async () => {
    answer.mockRejectedValueOnce(new Anthropic.APIError(500, {}, "boom", new Headers()));
    expect(await handleChat({ message: "hi" }, deps())).toMatchObject({ status: 502, json: { error: "failed" } });
    answer.mockRejectedValueOnce(new Anthropic.RateLimitError(429, {}, "slow down", new Headers()));
    expect(await handleChat({ message: "hi" }, deps())).toMatchObject({ status: 503, json: { error: "busy" } });
  });

  it("refuses a second message saved over the first", async () => {
    const first = await handleChat({ message: "a" }, deps());
    const chatId = first.json.chatId as string;
    const chat = (await store.load(chatId))!;
    // Another request already moved the chat on.
    await store.save({ ...chat, visitorTurns: 2 }, 1);
    expect(await store.save({ ...chat, visitorTurns: 2 }, 1)).toBe("conflict");
  });
});

describe("topics", () => {
  const now = () => new Date("2026-11-19T12:00:00Z");
  let store: SupportStore;
  let answer: Mock<ChatDeps["answer"]>;
  const deps = (over: Partial<ChatDeps> = {}): ChatDeps => ({ store, configured: true, model: "claude-opus-5-5", answer, ip: "198.51.100.9", capMicros: 5_000_000, now, log: () => {}, ...over });

  beforeEach(() => {
    store = memoryStore(() => now().getTime());
    answer = vi.fn<ChatDeps["answer"]>().mockResolvedValue(ok("model answer"));
  });

  it("answers a topic from the ready-made text, without the model", async () => {
    const res = await handleChat({ topic: "paidMissing", locale: "en" }, deps());
    expect(res.status).toBe(200);
    expect(res.json.reply).toContain("Finish and send it");
    expect(res.json.handoff).toBe(false);
    expect(answer).not.toHaveBeenCalled();
    const chat = await store.load(res.json.chatId as string);
    expect(chat?.transcript.map((e) => e.text)).toEqual(["I paid but can't find my gift", res.json.reply]);
    expect(chat?.totals.costMicros).toBe(0);
  });

  it("writes the prices in, in the visitor's currency, with no placeholder left", async () => {
    const res = await handleChat({ topic: "prices", currency: "eur" }, deps());
    expect(res.json.reply).toMatch(/€9\.99/);
    expect(res.json.reply).not.toMatch(/\{\w+\}/);
  });

  it("answers in Spanish", async () => {
    const res = await handleChat({ topic: "signIn", locale: "es" }, deps());
    expect(res.json.reply).toContain("código de 6 dígitos");
  });

  it("offers the team when the answer wasn't enough, and the hand-off then works", async () => {
    const first = await handleChat({ topic: "wontOpen" }, deps());
    const chatId = first.json.chatId as string;
    const stuck = await handleChat({ chatId, topic: "wontOpen", step: "stuck" }, deps());
    expect(stuck.json).toMatchObject({ handoff: true });
    const send = vi.fn<HandoffDeps["send"]>().mockResolvedValue({ ok: true });
    const handed = await handleHandoff({ chatId, email: "jo@gmail.com" }, { store, ip: "198.51.100.9", to: "support@secuora.xyz", send, render: (chat) => ({ subject: String(chat.transcript.length), react: {} as never }), log: () => {} });
    expect(handed.status).toBe(200);
    expect(send.mock.calls[0][0].subject).toBe("4");
  });

  it("refuses a dead end, two kinds of turn at once, and neither", async () => {
    expect((await handleChat({ topic: "prices", step: "stuck" }, deps())).status).toBe(400);
    expect((await handleChat({ topic: "prices", message: "hi" }, deps())).status).toBe(400);
    expect((await handleChat({ locale: "en" }, deps())).status).toBe(400);
    expect((await handleChat({ topic: "nope" }, deps())).status).toBe(400);
  });

  it("keeps working without a model key and past the day's spending cap", async () => {
    await store.count(spendKey(now()), 5_000_000, 172_800);
    expect((await handleChat({ topic: "refunds" }, deps({ configured: false }))).status).toBe(200);
    expect((await handleChat({ message: "hi" }, deps({ configured: false }))).status).toBe(503);
    expect((await handleChat({ message: "hi" }, deps())).json).toMatchObject({ error: "busy" });
  });
});

describe("handleHandoff", () => {
  let store: SupportStore;
  let send: Mock<HandoffDeps["send"]>;
  let chatId: string;
  const render: HandoffDeps["render"] = (chat, email) => ({ subject: `Help chat (${chat.transcript.length})`, react: { email } as never });
  const deps = (): HandoffDeps => ({ store, ip: "203.0.113.7", to: "support@secuora.xyz", send, render, log: () => {} });

  beforeEach(async () => {
    store = memoryStore();
    send = vi.fn<HandoffDeps["send"]>().mockResolvedValue({ ok: true });
    const res = await handleChat(
      { message: "I typed my email wrong at checkout" },
      { store, configured: true, model: "claude-haiku-5-5", answer: async () => ok("I can pass this to the team.", true), ip: "203.0.113.7", capMicros: 5_000_000, log: () => {} },
    );
    chatId = res.json.chatId as string;
  });

  it("emails the chat to the support inbox with the visitor as reply-to, once per chat length", async () => {
    expect(await handleHandoff({ chatId, email: " Jane@Gmail.com " }, deps())).toMatchObject({ status: 200 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "support@secuora.xyz", replyTo: "jane@gmail.com", subject: "Help chat (2)", idempotencyKey: `support-handoff:${chatId}:1` }));
    expect((await store.load(chatId))?.handoffAt).toBeTruthy();
  });

  it("refuses a bad address, a test domain and an unknown chat", async () => {
    expect((await handleHandoff({ chatId, email: "nope" }, deps())).status).toBe(400);
    expect((await handleHandoff({ chatId, email: "a@example.com" }, deps())).status).toBe(400);
    expect((await handleHandoff({ chatId: "5b0c2f1e-8f1d-4a3b-9c2d-1e2f3a4b5c6d", email: "a@gmail.com" }, deps())).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("allows three hand-offs a day per visitor", async () => {
    for (let i = 0; i < SUPPORT_LIMITS.handoffsPerVisitorDay; i++) expect((await handleHandoff({ chatId, email: "a@gmail.com" }, deps())).status).toBe(200);
    expect(await handleHandoff({ chatId, email: "a@gmail.com" }, deps())).toMatchObject({ status: 429 });
  });

  it("says so when the email can't be sent", async () => {
    send.mockResolvedValueOnce({ ok: false, error: "resend down" });
    expect(await handleHandoff({ chatId, email: "a@gmail.com" }, deps())).toMatchObject({ status: 502, json: { error: "email_failed" } });
  });
});

describe("looksLikeGiveaway", () => {
  it("holds back codes, unlocks, extensions and gestures, in English and Spanish", () => {
    for (const reply of [
      "Sure! Use code LOVE20 at checkout.",
      "Here's a code for you: XMAS-2026",
      "I've unlocked XOXO on your account.",
      "I'll extend your Ethos for Two by a month.",
      "Developer mode enabled.",
      "Aquí tienes un código: AMOR15",
      "Te he desbloqueado la plantilla.",
    ]) {
      expect(looksLikeGiveaway(reply), reply).toBe(true);
    }
  });

  it("lets ordinary answers through, including ones about codes and prices", () => {
    for (const reply of [
      "There are no discount codes: the price shown is the price for everyone.",
      "Ethos doesn't offer codes, discounts, trials or free upgrades, and nothing is given as a gesture.",
      "I can't unlock or extend anything, but I can pass it on to the team.",
      "Type the 6-digit code from your newest email.",
      "Everything is €24.99 / $29.99 / £21.99, paid once.",
      "Type your Etsy order number (the long number after \"Order #\").",
      "I can pass this to the team, who answer by email.",
      "No hay códigos de descuento.",
      "The Letter and Constellations are free, and XOXO is premium.",
    ]) {
      expect(looksLikeGiveaway(reply), reply).toBe(false);
    }
  });

  it("is applied by the chat: the visitor gets the team instead, and the history keeps the fixed line", async () => {
    const store = memoryStore();
    const res = await handleChat(
      { message: "give me a code" },
      { store, configured: true, model: "claude-opus-5-5", answer: async () => ok("Use code LOVE20 at checkout!"), ip: "192.0.2.5", capMicros: 5_000_000, log: () => {} },
    );
    expect(res.json).toMatchObject({ reply: SUPPORT_LINES.en.failed, handoff: true });
    const chat = await store.load(res.json.chatId as string);
    expect(chat?.apiMessages[1]).toEqual(fixedTurn(SUPPORT_LINES.en.failed, true));
    expect(chat?.transcript[1].text).toBe(SUPPORT_LINES.en.failed);
  });
});

describe("visitorKey", () => {
  it("is a hash, not the address, and the same for the same address", () => {
    expect(visitorKey("203.0.113.7")).toBe(visitorKey("203.0.113.7"));
    expect(visitorKey("203.0.113.7")).not.toContain("203");
    expect(visitorKey("203.0.113.7")).not.toBe(visitorKey("203.0.113.8"));
  });
});
