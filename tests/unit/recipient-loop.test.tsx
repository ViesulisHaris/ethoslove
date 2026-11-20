import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const counted: [string, Record<string, unknown> | undefined][] = [];
vi.mock("@/lib/analytics/track", () => ({ track: (name: string, props?: Record<string, unknown>) => void counted.push([name, props]) }));

import { MAKE_OWN_REF, RECIPIENT_REFS, WATERMARK_REF, madeWithEthosHref, recipientVia } from "@/lib/attribution/recipient";
import { countRecipientEditorOpened, countRecipientGiftSent, editorVia } from "@/lib/attribution/recipient-loop";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { REPLY_REF, replyEditorHref } from "@/lib/editor/reply-seed";
import { ReactionSent } from "@/components/gift/reaction-sheet";

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

  it("fires from the send screen once, when a draft first goes out, and where the editor opens", () => {
    const sheet = readFileSync("src/components/editor/publish-sheet.tsx", "utf8");
    expect(sheet).toMatch(/if \(state\.status === "draft"\) countRecipientGiftSent\(.*, slug, premiumKeys\.length > 0\);\s+state\.markPublished\(/);
    expect(sheet.match(/countRecipientGiftSent\(/g)).toHaveLength(1);
    const shell = readFileSync("src/components/editor/editor-shell.tsx", "utf8");
    expect(shell).toMatch(/track\("editor_opened", \{ template: slug \}\);[\s\S]{0,400}countRecipientEditorOpened\(/);
  });
});

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
    expect(badge).toContain('counted ? () => track("watermark_clicked", { template: slug ?? null }) : undefined');
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
  });

  it("in Spanish for a Spanish gift", () => {
    const html = sent("es", () => {});
    expect(html).toContain("Enviado a Mia.");
    expect(html).toContain("Hazle uno a Mia");
  });

  it("stays as it was where there is nothing to send back to", () => {
    const html = sent("en");
    expect(html).toContain("Sent to Mia.");
    expect(html).not.toContain("Send one back");
    expect(html).not.toContain("<button");
  });
});
