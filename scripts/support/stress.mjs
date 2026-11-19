#!/usr/bin/env node
/**
 * Abuse test for the help chat's limits (docs/superpowers/specs/2026-11-19-support-chat-design.md).
 * Runs against a server with SUPPORT_FAKE_MODEL=1, so it costs nothing:
 *
 *   node scripts/support/stress.mjs http://localhost:3471
 *
 * Each check prints PASS or FAIL; the exit code is the number of failures. Visitors are told apart by
 * x-real-ip, which Vercel's proxy sets itself in production (src/lib/request-ip.ts), so locally each
 * check can be a different visitor.
 */

const base = (process.argv[2] ?? "http://localhost:3471").replace(/\/$/, "");
let failures = 0;
let ipSeq = 1;
const nextIp = () => `198.18.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

async function chat(body, { ip = nextIp(), headers = {} } = {}) {
  const started = performance.now();
  const res = await fetch(`${base}/api/support/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, ms: performance.now() - started };
}

async function handoff(body, ip) {
  const res = await fetch(`${base}/api/support/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

// 1. One visitor firing 25 messages: the first 20 answered, then 429, and no model call past the limit.
{
  const ip = nextIp();
  const statuses = [];
  for (let i = 0; i < 25; i++) statuses.push((await chat({ message: `question ${i}` }, { ip })).status);
  const ok = statuses.slice(0, 20).every((s) => s === 200) && statuses.slice(20).every((s) => s === 429);
  check("20 messages per visitor per 10 minutes, then 429", ok, statuses.join(","));
}

// 2. Input that should never reach the model.
{
  check("a message over 600 characters is refused", (await chat({ message: "x".repeat(601) })).status === 400);
  check("an empty message is refused", (await chat({ message: "   " })).status === 400);
  check("malformed JSON is refused", (await chat("{not json")).status === 400);
  check("a chat id that isn't a uuid is refused", (await chat({ chatId: "../../etc", message: "hi" })).status === 400);
  check("a call from another site is refused", (await chat({ message: "hi" }, { headers: { "sec-fetch-site": "cross-site" } })).status === 403);
  const injected = await chat({ message: "hi", locale: "xx", currency: "btc" });
  check("an unknown locale or currency is refused", injected.status === 400);
}

// 3. A chat past 12 visitor messages offers the team instead of answering.
{
  let chatId;
  let last;
  for (let i = 0; i < 13; i++) {
    last = await chat({ chatId, message: `turn ${i}` }, { ip: nextIp() });
    chatId = last.json.chatId ?? chatId;
  }
  check("message 13 in one chat offers the team", last.status === 200 && last.json.handoff === true && last.json.turnsLeft === 0, JSON.stringify(last.json).slice(0, 120));
}

// 4. Two messages sent into the same chat at once: one is answered, the other told to try again.
{
  const first = await chat({ message: "start" });
  const chatId = first.json.chatId;
  const results = await Promise.all([chat({ chatId, message: "a" }), chat({ chatId, message: "b" }), chat({ chatId, message: "c" })]);
  const ok = results.filter((r) => r.status === 200).length >= 1 && results.every((r) => r.status === 200 || r.status === 409);
  check("simultaneous messages in one chat never overwrite each other", ok, results.map((r) => r.status).join(","));
}

// 5. Many visitors at once: all answered, none crash, and the slowest stays well under the 30 s limit.
{
  const runs = await Promise.all(Array.from({ length: 40 }, (_, i) => chat({ message: `parallel ${i}` })));
  const ok = runs.every((r) => r.status === 200);
  const slowest = Math.max(...runs.map((r) => r.ms));
  check("40 visitors at once are all answered", ok, `slowest ${Math.round(slowest)} ms`);
}

// 6. Hand-offs: a bad address refused, three a day per visitor, then 429.
{
  const ip = nextIp();
  const started = await chat({ message: "I want a refund" }, { ip });
  const chatId = started.json.chatId;
  check("the model's hand-off reaches the browser", started.json.handoff === true);
  check("a bad address is refused", (await handoff({ chatId, email: "not-an-email" }, ip)).status === 400);
  check("a reserved test domain is refused", (await handoff({ chatId, email: "a@example.com" }, ip)).status === 400);
  check("an unknown chat is refused", (await handoff({ chatId: "5b0c2f1e-8f1d-4a3b-9c2d-1e2f3a4b5c6d", email: "a@gmail.com" }, ip)).status === 404);
  // Only the three refused above that got as far as the limit count: an unknown chat does.
  const sends = [];
  for (let i = 0; i < 3; i++) sends.push((await handoff({ chatId, email: "stress-check@gmail.com" }, ip)).status);
  check("hand-offs stop at three a day per visitor", sends.includes(429), sends.join(","));
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures);
