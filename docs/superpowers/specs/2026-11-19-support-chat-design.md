# Help chat on tryethos.io: design

19 Nov 2026. The owner asked for a support bot that "answers questions well about our site only and nothing else, and if they actually can't sort it out only then it goes to our email", and then: "stress test this, and so it doesn't gobble tokens but is cheap and good". Decided in conversation: help guide only (no account lookups yet), chats kept 30 days, our own chat on the Claude API. The owner said to build it and start testing straight away.

## Why

Most support email today is a question the site already answers somewhere (do I pay monthly, where is my gift, the sign-in link expired, can I edit it). A chat that answers on the spot saves the buyer a day's wait and the owner the email. What it can't solve still reaches support@secuora.xyz, with the whole conversation attached.

## Goals

- Correct answers about Ethos only, taken from what the site itself says (prices, FAQ, gifts, rules), in the visitor's language.
- Politely declines anything that isn't about Ethos, and anything it would have to guess.
- Hands off to email only when it can't help or the person asks for a human; never before.
- Cheap: the cheapest model that passes the test set, short answers, a cached guide, hard limits and a daily spending cap.
- Proven before launch: a graded test set of real and adversarial chats, and an abuse test of the limits.

## Non-goals (for now)

- Looking up a customer's orders or gifts (phase 2, only if the hand-offs show it's needed).
- Doing anything: no refunds, no account changes, no sending gifts.
- A live human chat.

## Anti-goals

- An answer the guide doesn't support (a wrong price, a promise, a made-up feature).
- Promising or refusing a refund. The owner decides refunds; the bot explains the rules and hands off.
- Wording that implies something broke on our side (support rule since 1 Nov).
- Becoming a general chatbot, or revealing its instructions.
- Spending past the cap, or a slower site: the chat must not load until it's opened.

## Approaches considered

1. **Our own chat on the Claude Messages API (picked).** Every token is ours to control and measure; it matches the site; chats live in our Supabase; hand-offs go out through Resend like every other email; it runs on the $200 monthly API credit that comes with the owner's Ultra plan (SIA Miglia).
2. A ready-made support widget with AI (Intercom, Crisp, Tidio). Fastest to switch on, but a monthly or per-answer fee, its own look, script and cookies, a knowledge base kept in sync by hand, and no way to cap or test it like this.
3. Anthropic's hosted agents. Built for long, tool-using work and billed by runtime; this bot only answers, so it would cost more for nothing.

## How it works

**Knowledge.** The guide is generated from the same code as /llms.txt (what Ethos is, how gifts work, prices in every currency, the FAQ), plus a compact list of the templates and a hand-written support playbook (sign-in codes, "paid for, not sent yet", editing a live gift, mistyped emails, refunds). So a price or a new gift reaches the bot with the next deploy. The guide sits in the system prompt with a 1-hour cache.

**Topics first (owner, 19 Nov: "the bot should have an introduction and you should choose the niche or specific problem… so we limit how much the bot speaks, and we can use premade messages").** The chat opens with a greeting and seven topics plus "Something else": I paid but can't find my gift, I can't sign in, prices and paying, changing or resending a gift, the gift won't open, refunds, I bought on Etsy. Each answers with ready-made text (messages `support.topics`, prices filled in from the price table in the visitor's currency), written by the server so the chat record and any hand-off show exactly what was read; no model call, no cost, and it keeps working without a key or past the spending cap. After an answer: "That helped", "I still can't…" (to the team, for the topics where the answer may not be enough) or "Ask something else". Only "Something else" and "Ask something else" open the text box the model answers. The button is a small round chat icon, bottom right.

**Nothing given away (owner, 19 Nov).** No codes, discounts, free unlocks, extensions or compensation; asked once, the bot says so and names what is free; "if pressured I'll pass it on to the team", promising nothing. A server-side check (`src/lib/support/guard.ts`) also holds back any reply with a code-shaped string or "I've unlocked/extended…". Freebie test set (43 cases × 3): 128/129.

**Each message.** The browser sends the new message and the chat id; the server keeps the history (a client can't forge earlier turns). The model returns a short reply and whether to offer a hand-off (structured output). Effort low, answers capped. A refusal or anything malformed gets a fixed polite line and the hand-off offer.

**Model.** Picked by the test: Claude Haiku 5.5, Sonnet 5.5 and Opus 5.5 run the same cases; the cheapest that passes wins. Set in one place (`SUPPORT_MODEL` overrides it).

Result, 19 Nov (docs/support/eval): Opus 5.5 passed 66 of 67 (99%) at about half a cent a chat; Sonnet 5.5 61 (91%); Haiku 5.5 48 (72%, 84% before the rules were tightened). Haiku's misses were the costly kind (a blanket 14-day refund promise, offering the team in words without the form, a translation done for an off-topic request), so Opus answers. At a few cents a conversation plus at most one hourly cache fill, a busy month stays far inside the $200 credit, and the daily cap ($5) bounds the worst month at about $155.

**Limits.** A message is at most 600 characters; a chat at most 12 visitor messages, then the hand-off is offered. Per visitor (a salted hash of the IP, never stored with the chat): 20 messages in 10 minutes, 60 a day, 3 hand-offs a day. A global daily cap on spend (default US$5, `SUPPORT_DAILY_CAP_USD`); past it the chat shows the support address instead of answering.

**Hand-off.** When the bot offers it, a small form asks for an email and a yes. The server emails support@secuora.xyz the whole chat with that address as reply-to, so the owner replies from Spacemail as usual.

**Storage.** `support_chats` (one row per chat: messages, page section, locale, model, tokens, cost, hand-off) and `support_counters` (limits and daily spend), both server-only, deleted after 30 days by the daily job. Migration 0020; the owner applies it.

**Where it shows.** A help button on the marketing pages, My gifts and Account, and sign-in; never on the gift pages people receive, and not over the editor. On phones it sits above the sticky "Make yours" bar. The panel's code loads only when it's opened. It says it's an AI assistant.

**Privacy.** The privacy policy (en, es) gets a line: what's typed is sent to Anthropic to answer; chats are kept 30 days; a hand-off emails the chat and the address given to the support team.

## Testing

- Unit tests: the guide, the answer function (mocked API), the routes, limits and the hand-off email.
- Test set (~100 chats): real cases from the support inbox, FAQ questions, off-topic and jailbreak attempts, refund pressure, other languages. Graded by fixed checks plus a judge model against the guide; every failure read by hand. Reports pass rate and cost per chat for each model. Spends a few dollars of the API credit.
- Abuse test against a running server: rapid-fire, long inputs, chats past the limit, the daily cap.

## Rollout (needs the owner)

1. Create an API key in the SIA Miglia organization on platform.claude.com (local tests, then Vercel: `ANTHROPIC_API_KEY`).
2. Apply migration 0020 in Supabase.
3. Check a preview deploy, then push; check the live pages after.

## Left to the builder

Exact wording of the UI strings, the panel's look within the site's design system, the playbook's phrasing (facts checked against the code), and the judge's rubric wording.
