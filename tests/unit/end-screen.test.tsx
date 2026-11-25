import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";
import { GiftChromeContext } from "@/templates/_shared/gift-chrome";

const data = { locale: "en", senderName: "Mia", recipientName: "Leo", showReactionCta: false } as unknown as GiftData;

describe("end screen make-one button", () => {
  it("offers to send one back to the sender on a real gift", () => {
    const html = renderToStaticMarkup(
      <ReplyModeContext.Provider value>
        <EndScreen data={data} onMakeOne={() => {}} />
      </ReplyModeContext.Provider>,
    );
    expect(html).toContain("Send one back to Mia");
  });

  it("keeps the general invitation on demos", () => {
    expect(renderToStaticMarkup(<EndScreen data={data} onMakeOne={() => {}} />)).toContain("Make one for someone you love");
  });
});

describe("end screen's closing line", () => {
  // The live site's end: "The end. For now." at 1.6rem on a tight line (32px). Ordered so that tailwind-merge kept
  // the size and dropped leading-tight, it stood on a 38.4px line and every end that scrolls grew 6 to 7px (the
  // final pass, 25 Nov 2026). A card's closer end keeps the same tight line at its own size.
  const closing = (html: string) => /<p class="([^"]*)"[^>]*>The end\. For now\.<\/p>/.exec(html)?.[1].split(" ") ?? [];
  it("is set on a tight line, as on the live site, at both sizes", () => {
    for (const compact of [false, true]) {
      const classes = closing(renderToStaticMarkup(<EndScreen data={data} compact={compact} onMakeOne={() => {}} />));
      expect(classes, `compact ${compact}`).toContain("leading-tight");
      expect(classes, `compact ${compact}`).toContain(compact ? "text-[1.45rem]" : "text-[1.6rem]");
    }
  });
});

describe("end screen and the free-tier badge", () => {
  it("carries the badge itself on a watermarked gift, so the floating one can step aside", () => {
    const html = renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={data} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
    expect(html).toContain("Made with Ethos");
    // In the flow, under the buttons — not floating over them.
    expect(html).not.toContain("absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))]");
  });

  it("leaves it out when the gift isn't watermarked", () => {
    expect(renderToStaticMarkup(<EndScreen data={data} onMakeOne={() => {}} />)).not.toContain("Made with Ethos");
  });
});

describe("end screen on a group card", () => {
  const note = { key: "abcdefghij", name: "Mum", note: "Forty is nothing. Ring me." };
  const card = { ...data, templateSlug: "group-reference", contributions: [note] } as unknown as GiftData;
  const hrefOf = (html: string) => /<a href="(mailto:[^"]+)"[^>]*data-testid="report-note"/.exec(html)?.[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&") ?? "";

  it("no gift without notes from a group has a Report link: every gift sent so far is unchanged", () => {
    for (const gift of [data, { ...data, contributions: [] } as unknown as GiftData]) {
      const html = renderToStaticMarkup(
        <ReplyModeContext.Provider value>
          <EndScreen data={gift} onMakeOne={() => {}} onReplay={() => {}} />
        </ReplyModeContext.Provider>,
      );
      expect(html).not.toContain("report-note");
      expect(html).not.toContain("mailto:");
    }
  });

  it("a card with notes carries one small Report link, an email to a person", () => {
    const html = renderToStaticMarkup(<EndScreen data={card} tone="light" onMakeOne={() => {}} />);
    expect(html.match(/data-testid="report-note"/g)).toHaveLength(1);
    expect(html).toContain("Report a note");
    const href = hrefOf(html);
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain("The card's link:");
    expect(decodeURIComponent(href)).toContain("The name on the note:");
  });

  it("its address carries nothing of the gift: no id, no link, no name, no words from a note", () => {
    const loud = { ...card, senderName: "Tom", recipientName: "Nora", shortId: "card234ab", contributions: [{ ...note, name: "Okonkwo" }] } as unknown as GiftData;
    const href = decodeURIComponent(hrefOf(renderToStaticMarkup(<EndScreen data={loud} onMakeOne={() => {}} />)));
    for (const secret of ["Tom", "Nora", "Okonkwo", "Forty", "abcdefghij", "card234ab", "group-reference", "/g/"]) expect(href).not.toContain(secret);
  });

  it("speaks the gift's language", () => {
    const html = renderToStaticMarkup(<EndScreen data={{ ...card, locale: "es" } as GiftData} onMakeOne={() => {}} />);
    expect(html).toContain("Avisar de una nota");
    expect(html).not.toContain("Denunciar");
    expect(decodeURIComponent(hrefOf(html))).toContain("El enlace de la tarjeta:");
  });

  it("adds no button, form, price or script to the screen", () => {
    const without = renderToStaticMarkup(<EndScreen data={data} onMakeOne={() => {}} onReplay={() => {}} />);
    const withNotes = renderToStaticMarkup(<EndScreen data={card} onMakeOne={() => {}} onReplay={() => {}} />);
    const count = (html: string, tag: string) => html.split(`<${tag}`).length - 1;
    for (const tag of ["button", "form", "input", "script", "img"]) expect(count(withNotes, tag), tag).toBe(count(without, tag));
    expect(count(withNotes, "a")).toBe(count(without, "a") + 1);
    expect(withNotes).not.toMatch(/[$€£]\s?\d/);
  });
});
