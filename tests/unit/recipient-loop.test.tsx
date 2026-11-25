import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const counted: [string, Record<string, unknown> | undefined][] = [];
vi.mock("@/lib/analytics/track", () => ({ track: (name: string, props?: Record<string, unknown>) => void counted.push([name, props]) }));

import { MAKE_OWN_REF, RECIPIENT_REFS, WATERMARK_REF, madeWithEthosHref, recipientVia } from "@/lib/attribution/recipient";
import { countRecipientEditorOpened, countRecipientGiftSent, countRecipientStarted, editorVia } from "@/lib/attribution/recipient-loop";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { REPLY_REF, replyEditorHref } from "@/lib/editor/reply-seed";
import { ReactionSent } from "@/components/gift/reaction-sheet";
import nextConfig from "../../next.config";

/**
 * The loop a gift starts: the recipient taps something on it, opens the editor, sends their own.
 * Counted without knowing anyone: these check which arrivals count as a recipient's, what each
 * count carries, and that the step after a reaction is the end screen's own "send one back".
 */
const search = (query: string) => new URLSearchParams(query);
/** A free reply's token, in shape only (the server is what opens one). */
const TOKEN = "A".repeat(64);

beforeEach(() => {
  counted.length = 0;
});

describe("which arrivals are a recipient's", () => {
  it("the four doors out of a gift, and no other tag", () => {
    expect([...RECIPIENT_REFS]).toEqual(["reply", "g", "watermark", "gift-keep"]);
    for (const ref of RECIPIENT_REFS) {
      expect(recipientVia(ref)).toBe(ref);
      // Each travels as an ordinary ?ref=, so a sale that follows is recorded under it too.
      expect(REF_PATTERN.test(ref)).toBe(true);
    }
    for (const ref of ["tt-couple", "ad-us-1", "pinterest", "gift-end", "", null, undefined]) expect(recipientVia(ref)).toBeNull();
    expect(recipientVia(" Watermark ")).toBe("watermark");
  });

  it("uses the tags the rest of the site already sends people with", () => {
    expect(REPLY_REF).toBe("reply");
    expect(replyEditorHref("bouquet", "en")).toBe("/create/bouquet?ref=reply");
    // lib/keep/keep.ts is server code (it reaches the database), so its tag is read, not imported.
    expect(readFileSync("src/lib/keep/keep.ts", "utf8")).toContain('export const KEEP_REF = "gift-keep";');
    expect(MAKE_OWN_REF).toBe("g");
    // Purchases are already recorded under the badge's tag: it has not changed.
    expect(WATERMARK_REF).toBe("watermark");
  });

  it("the page a recipient is sent to: the gift's language, the tag, the template, never the gift", () => {
    expect(madeWithEthosHref("en", MAKE_OWN_REF, "bouquet")).toBe("/made-with-ethos?ref=g&template=bouquet");
    expect(madeWithEthosHref("es", MAKE_OWN_REF, "the-letter")).toBe("/es/made-with-ethos?ref=g&template=the-letter");
    expect(madeWithEthosHref("en", WATERMARK_REF)).toBe("/made-with-ethos?ref=watermark");
    // A demo's badge: the same page, no recipient's tag.
    expect(madeWithEthosHref("en", null, "bouquet")).toBe("/made-with-ethos?template=bouquet");
    expect(madeWithEthosHref("es", null)).toBe("/es/made-with-ethos");
  });
});

describe("which door an editor was opened through", () => {
  it("reads the address first", () => {
    expect(editorVia(search("ref=reply"), undefined)).toBe("reply");
    expect(editorVia(search("ref=g"), undefined)).toBe("g");
    expect(editorVia(search("ref=watermark"), "tt-couple")).toBe("watermark");
    expect(editorVia(search("ref=gift-keep"), undefined)).toBe("gift-keep");
  });

  it("falls back on the tag the tab holds, for someone who went through a demo on the way", () => {
    expect(editorVia(search(""), "watermark")).toBe("watermark");
    expect(editorVia(search("resume=publish"), "g")).toBe("g");
  });

  it("lets a newer tag in the address win over an older one in memory", () => {
    expect(editorVia(search("ref=tt-couple"), "watermark")).toBeNull();
  });

  it("knows a free reply by its token once a sign-in or a payment has loaded the page again", () => {
    expect(editorVia(search(`resume=publish&reply=${TOKEN}`), undefined)).toBe("reply");
    expect(editorVia(search("reply=nope"), undefined)).toBeNull();
  });

  it("is nobody's for everyone else", () => {
    expect(editorVia(search(""), undefined)).toBeNull();
    expect(editorVia(search("ref=tt-couple"), undefined)).toBeNull();
    expect(editorVia(search("ref=not a tag"), undefined)).toBeNull();
  });
});

describe("recipient_editor_opened", () => {
  it("counts the door and the template, and nothing that could name anyone", () => {
    countRecipientEditorOpened(search("ref=reply"), "bouquet");
    countRecipientEditorOpened(search("ref=g"), "the-letter");
    expect(counted).toEqual([
      ["recipient_editor_opened", { via: "reply", template: "bouquet" }],
      ["recipient_editor_opened", { via: "g", template: "the-letter" }],
    ]);
  });

  it("is not counted for a visitor who did not come from a gift", () => {
    countRecipientEditorOpened(search(""), "bouquet");
    countRecipientEditorOpened(search("ref=tt-couple"), "bouquet");
    expect(counted).toEqual([]);
  });

  it("is not counted again when the same gift comes back from signing in or paying", () => {
    countRecipientEditorOpened(search("resume=publish&ref=reply"), "bouquet");
    countRecipientEditorOpened(search(`resume=publish&reply=${TOKEN}`), "bouquet");
    expect(counted).toEqual([]);
  });
});

describe("recipient_gift_sent", () => {
  it("counts the door, the template and whether the gift holds anything paid", () => {
    countRecipientGiftSent(search("ref=watermark"), "the-letter", false);
    countRecipientGiftSent(search("ref=g"), "bouquet", true);
    // Back from paying for nothing: a free reply keeps its token in the address.
    countRecipientGiftSent(search(`resume=publish&reply=${TOKEN}`), "bouquet", false);
    expect(counted).toEqual([
      ["recipient_gift_sent", { via: "watermark", template: "the-letter", paid: false }],
      ["recipient_gift_sent", { via: "g", template: "bouquet", paid: true }],
      ["recipient_gift_sent", { via: "reply", template: "bouquet", paid: false }],
    ]);
  });

  it("is not counted for a gift nobody was sent here to make", () => {
    countRecipientGiftSent(search("resume=publish"), "bouquet", true);
    expect(counted).toEqual([]);
  });

  // NOT PROVEN HERE: that the event fires on a real publish. Publishing needs an account and a
  // database, and a worktree has neither, so no test in this repository watches it happen. What
  // follows only reads the send screen's source: the call is there, once, for a draft, with the
  // gift's template and whether it holds anything paid. It passes for dead code too. Whoever tests
  // a preview deployment publishes one gift from /create/the-letter?ref=reply with the browser's
  // network panel open and looks for `recipient_gift_sent` among Vercel's events
  // (docs/marketing/LOOP-KPI.md). The editor's own count is proven in the browser:
  // tests/e2e/recipient-loop.spec.ts opens the editor through each of the four doors.
  it("is called from the send screen, once, for a draft (read from the source: see the note above)", () => {
    const sheet = readFileSync("src/components/editor/publish-sheet.tsx", "utf8");
    const calls = sheet.match(/^.*countRecipientGiftSent\(.*$/gm)?.filter((line) => !line.trimStart().startsWith("import")) ?? [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('state.status === "draft"');
    expect(calls[0]).toMatch(/countRecipientGiftSent\([^;]*,\s*slug,\s*premiumKeys\.length > 0\)/);
  });
});

describe("where a tap on a gift is said to have come from", () => {
  // A gift's address is private: whoever holds it can open the gift. The page a gift's badge and its
  // "or make one for someone else" open is a marketing page, where analytics run after a yes to
  // cookies, and under the site-wide policy it was handed the gift's whole address as its referrer.
  it("a gift page, and its keep page, send only the site's origin, in both languages", async () => {
    const rules = await nextConfig.headers!();
    const policy = (rule: (typeof rules)[number]) => rule.headers.find((h) => h.key === "Referrer-Policy")?.value;
    const site = rules.findIndex((rule) => rule.source === "/(.*)");
    const gift = rules.findIndex((rule) => /\(g\b[^)]*\)|\/g\//.test(rule.source) && policy(rule) !== undefined);
    expect(policy(rules[site])).toBe("strict-origin-when-cross-origin");
    expect(gift, "a rule for /g/…").toBeGreaterThan(-1);
    expect(policy(rules[gift])).toBe("strict-origin");
    // For the same header the later rule wins, so it has to come after the site's.
    expect(gift).toBeGreaterThan(site);
    // An optional /es, then /g, then anything: the gift, and /g/<id>/keep.
    expect(rules[gift].source).toMatch(/^\/:locale\(es\)\?\/:\w+\(g(\|[a-z-]+)*\)\/:path\*$/);
  });
});

// These read the source, so they only pin where each count is called and what it is handed; they
// would pass for a call that never runs. That each one fires is watched in a browser, on a gift
// played to its end (tests/e2e/recipient-loop.spec.ts): make_own_clicked, watermark_clicked from
// the floating badge and from the end screen's, reply_started from the end screen and from the
// reaction (once for two taps), recipient_editor_opened through all four doors.
describe("the events the gift page sends", () => {
  const source = (file: string) => readFileSync(file, "utf8");

  it("reply_started says where it was tapped: the end screen or the reaction's confirmation", () => {
    const page = source("src/components/gift/gift-experience.tsx");
    expect(page).toContain('track("reply_started", { template: data.templateSlug, from });');
    expect(page).toContain('onMakeOne={() => sendOneBack("end")}');
    expect(page).toContain('onSendOneBack={() => sendOneBack("reaction")}');
    // One handler for both: the same seed, the same token rule, the same link.
    expect(page.match(/saveReplySeed\(/g)).toHaveLength(1);
    expect(page.match(/replyEditorHref\(/g)).toHaveLength(1);
  });

  it("make_own_clicked and watermark_clicked carry the template and never an id", () => {
    expect(source("src/templates/_shared/EndScreen.tsx")).toContain('track("make_own_clicked", { template: data.templateSlug, from: "end" })');
    const badge = source("src/templates/_shared/Watermark.tsx");
    expect(badge).toContain('if (navigator.onLine !== false) track("watermark_clicked", { template: slug ?? null });');
    // A tap with no connection opens the browser's error page in the new tab: not counted (loop-D11).
    expect(source("src/templates/_shared/EndScreen.tsx")).toContain('if (navigator.onLine !== false) track("make_own_clicked"');
    expect(badge).toMatch(/const onClick = counted\s+\? \(\) => \{/);
    // Counted on a real gift page only: the floating badge and the end screen's both know when they are on one.
    expect(source("src/templates/_shared/GiftRenderer.tsx")).toContain("counted={replyMode}");
    expect(source("src/templates/_shared/EndScreen.tsx")).toContain("counted={reply}");
  });

  it("every new event is in the list of events the site may send", () => {
    const names = source("src/lib/analytics/track.ts");
    for (const name of ["watermark_clicked", "make_own_clicked", "recipient_editor_opened", "recipient_gift_sent", "reply_started"]) expect(names).toContain(`| "${name}"`);
  });
});

describe("after a reaction is sent", () => {
  const sent = (locale: "en" | "es", onSendOneBack?: () => void) => renderToStaticMarkup(<ReactionSent emoji="❤️" senderName="Mia" locale={locale} onSendOneBack={onSendOneBack} />);

  it("offers one next step under the confirmation: the end screen's own words", () => {
    const html = sent("en", () => {});
    expect(html.indexOf("Sent to Mia.")).toBeGreaterThan(0);
    expect(html.indexOf("Send one back to Mia")).toBeGreaterThan(html.indexOf("They&#x27;ll see it the next time they open their gifts."));
    expect(html).toContain('data-testid="reaction-reply"');
    // Nothing else: one button, no link, no price, no form.
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toMatch(/<a |<form|<input|€|\$\d|free/);
    // A thumb tall, and its keyboard ring is a light one: the sheet is dark.
    expect(html).toContain("min-h-12");
    expect(html).toContain("focus-visible:outline-white/60");
  });

  it("in Spanish for a Spanish gift", () => {
    const html = sent("es", () => {});
    expect(html).toContain("Enviado a Mia.");
    expect(html).toContain("Hazle uno a Mia");
  });

  it("writes a name with a $ in it as it was typed", () => {
    // String.replace reads "$&" and "$$" in a replacement string as patterns.
    const html = renderToStaticMarkup(<ReactionSent emoji="❤️" senderName="Ca$h $& Co" locale="en" onSendOneBack={() => {}} />);
    expect(html).toContain("Sent to Ca$h $&amp; Co.");
    expect(html).toContain("Send one back to Ca$h $&amp; Co");
    expect(html).not.toContain("{sender}");
  });

  it("is named by its words once sent, and those words are where the focus can go", () => {
    const html = renderToStaticMarkup(<ReactionSent emoji="❤️" senderName="Mia" locale="en" titleId="t1" />);
    expect(html).toMatch(/<p id="t1"[^>]*>Sent to Mia\.<\/p>/);
    expect(html).toContain('tabindex="-1"');
  });

  it("is a named sheet that scrolls inside a short screen", () => {
    const sheet = readFileSync("src/components/gift/reaction-sheet.tsx", "utf8");
    expect(sheet).toContain("aria-labelledby={titleId}");
    expect(sheet).toMatch(/max-h-full[^"]*overflow-y-auto/);
    expect(sheet).toContain('if (e.key === "Escape")');
    expect(sheet).toContain('<p role="status" className="sr-only">');
    expect(sheet).not.toContain('.replace("{sender}", senderName)');
  });

  it("waits for the editor once tapped: busy, and it takes no second tap", () => {
    const button = (busy: boolean) => /<button[^>]*>/.exec(renderToStaticMarkup(<ReactionSent emoji="❤️" senderName="Mia" locale="en" onSendOneBack={() => {}} busy={busy} />))?.[0] ?? "";
    expect(button(true)).toContain('disabled=""');
    expect(button(true)).toContain('aria-busy="true"');
    expect(button(false)).not.toContain("disabled=");
    expect(button(false)).not.toContain("aria-busy");
    const waiting = renderToStaticMarkup(<ReactionSent emoji="❤️" senderName="Mia" locale="en" onSendOneBack={() => {}} busy />);
    expect(waiting).toContain("animate-spin");
    // Still the same words: it is the same button, waiting.
    expect(waiting).toContain("Send one back to Mia");
  });

  it("stays as it was where there is nothing to send back to", () => {
    const html = sent("en");
    expect(html).toContain("Sent to Mia.");
    expect(html).not.toContain("Send one back");
    expect(html).not.toContain("<button");
  });
});

describe("recipient_started", () => {
  const answering = (body: unknown, status = 200) => vi.fn<typeof fetch>(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
  const all: [string, Record<string, unknown> | undefined][] = [];
  const keep = () => void all.push(...counted);

  it("is one true or false, for each door", async () => {
    const expected: Record<string, boolean> = { reply: true, g: true, watermark: true, "gift-keep": false };
    for (const door of RECIPIENT_REFS) {
      counted.length = 0;
      const ask = answering({ within7: false });
      await countRecipientStarted(search(`ref=${door}`), ask);
      expect(counted).toEqual([["recipient_started", { within7: expected[door] }]]);
      expect(ask).not.toHaveBeenCalled();
      keep();
    }
  });

  it("is not counted for a visitor who did not come from a gift, or for a gift coming back from sign-in or payment", async () => {
    for (const query of ["", "ref=tt-couple", "resume=publish&ref=reply", `resume=publish&reply=${TOKEN}`]) {
      const ask = answering({ within7: false });
      await countRecipientStarted(search(query), ask);
      expect(counted).toEqual([]);
      expect(ask).not.toHaveBeenCalled();
    }
  });

  it("asks the server when a sealed token names the gift, and takes its answer", async () => {
    const ask = answering({ within7: false });
    await countRecipientStarted(search(`ref=reply&reply=${TOKEN}`), ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(counted).toEqual([["recipient_started", { within7: false }]]);
    keep();
  });

  it("sends the server the token and nothing else", async () => {
    const ask = answering({ within7: true });
    await countRecipientStarted(search(`ref=reply&reply=${TOKEN}`), ask);
    const [url, init] = ask.mock.calls[0];
    expect(url).toBe("/api/loop/started");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toStrictEqual({ reply: TOKEN });
    keep();
  });

  it("keeps the door's answer when the server can't say", async () => {
    const failing = [
      answering({ within7: null }),
      answering("not json", 500),
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("offline");
      }),
    ];
    for (const ask of failing) {
      counted.length = 0;
      await countRecipientStarted(search(`ref=reply&reply=${TOKEN}`), ask);
      expect(ask).toHaveBeenCalledTimes(1);
      expect(counted).toEqual([["recipient_started", { within7: true }]]);
      keep();
    }
  });

  it("carries no id: the event's data is exactly one boolean", () => {
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const [name, props] of all) {
      expect(name).toBe("recipient_started");
      expect(Object.keys(props ?? {})).toEqual(["within7"]);
      expect(typeof props?.within7).toBe("boolean");
    }
    expect(JSON.stringify(all)).not.toContain(TOKEN);
  });

  it("is wired once, behind a new draft's first change, and is in the list of events", () => {
    const read = (file: string) => readFileSync(file, "utf8");
    const shell = read("src/components/editor/editor-shell.tsx");
    expect(shell.split("countRecipientStarted(")).toHaveLength(2);
    expect(shell).toContain("!ready || !dirty || !fresh");
    expect(read("src/lib/editor/store.ts")).toContain("fresh: !remote && !local");
    expect(read("src/lib/analytics/track.ts")).toContain('| "recipient_started"');
    // Nothing on a gift page sends it.
    for (const dir of ["src/templates", "src/components/gift", "src/app/[currency]/[locale]/(gift)"])
      for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" }))
        if (/\.(ts|tsx)$/.test(file)) expect(read(join(dir, file)), file).not.toContain("recipient_started");
  });
});
