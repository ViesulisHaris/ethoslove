import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { Watermark } from "@/templates/_shared/Watermark";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";
import { GiftChromeContext } from "@/templates/_shared/gift-chrome";
import { GIFT_CONTROLS } from "@/templates/_shared/watermark-spot";

const gift = (templateSlug: string, locale: "en" | "es" = "en") =>
  ({ templateSlug, locale, senderName: "Mia", recipientName: "Leo", showReactionCta: false }) as unknown as GiftData;

const KEEP = "/g/abc23def4/keep";

const onGiftPage = (data: GiftData, watermarked = false) =>
  renderToStaticMarkup(
    <GiftChromeContext.Provider value={{ watermarked, keepHref: KEEP }}>
      <ReplyModeContext.Provider value>
        <EndScreen data={data} onMakeOne={() => {}} />
      </ReplyModeContext.Provider>
    </GiftChromeContext.Provider>,
  );

describe("the reply offer on a gift's end screen", () => {
  it("tells the recipient of a paid premium gift that the first reply is free", () => {
    const html = onGiftPage(gift("bouquet"));
    expect(html).toContain("Send one back to Mia");
    expect(html).toContain("The first reply is free");
    expect(html).not.toContain("% off");
  });

  it("says it in the gift's own language", () => {
    const html = onGiftPage(gift("bouquet", "es"));
    expect(html).toContain("Hazle uno a Mia");
    expect(html).toContain("La primera respuesta es gratis");
    expect(html).toContain(`href="${KEEP}"`);
    expect(html).toContain("Guardar este regalo");
  });

  it("promises nothing on a free template, or on a gift that was itself sent free (footer on)", () => {
    for (const slug of ["the-letter", "constellations"]) {
      const html = onGiftPage(gift(slug));
      expect(html).toContain("Send one back to Mia");
      expect(html).not.toContain("is free");
    }
    expect(onGiftPage(gift("bouquet"), true)).not.toContain("is free");
  });

  it("offers to keep the gift, on a page of its own: the gift itself still has no form and no price", () => {
    const html = onGiftPage(gift("bouquet"));
    expect(html).toContain(`href="${KEEP}"`);
    expect(html).toContain("Keep this gift");
    expect(html).not.toContain("gift-end");
    expect(html).not.toMatch(/<form|<input|€|\$\d/);
  });

  it("keeps demos and previews as they were: no offer, no second link", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift("bouquet")} onMakeOne={() => {}} />);
    expect(html).toContain("Make one for someone you love");
    expect(html).not.toContain("is free");
    expect(html).not.toContain("gift-end");
    expect(html).not.toContain("Keep this gift");
  });

  it("offers nothing when the template gives the end screen no make-one button", () => {
    const html = renderToStaticMarkup(
      <ReplyModeContext.Provider value>
        <EndScreen data={gift("bouquet")} />
      </ReplyModeContext.Provider>,
    );
    expect(html).not.toContain("is free");
    expect(html).not.toContain("gift-end");
  });
});

/** The end screen's "or make one for someone else", as the markup has it (or null). */
const someoneElse = (html: string) => /<a [^>]*data-testid="make-for-someone-else"[^>]*>[^<]*<\/a>/.exec(html)?.[0] ?? null;

describe("or make one for someone else, on a gift's end screen", () => {
  it("is on a real gift, paid or free: a text link to the page made for a recipient, their template first", () => {
    for (const [slug, watermarked] of [["bouquet", false], ["the-letter", true], ["bouquet", true]] as const) {
      const link = someoneElse(onGiftPage(gift(slug), watermarked));
      expect(link, `${slug}, footer ${watermarked ? "on" : "off"}`).not.toBeNull();
      expect(link).toContain(">or make one for someone else<");
      expect(link).toContain(`href="/made-with-ethos?ref=g&amp;template=${slug}"`);
      // A new tab: the gift stays open behind it.
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener"');
    }
  });

  it("says it in Spanish, under /es, for a Spanish gift", () => {
    const link = someoneElse(onGiftPage(gift("bouquet", "es")));
    expect(link).toContain(">o hazle uno a otra persona<");
    expect(link).toContain('href="/es/made-with-ethos?ref=g&amp;template=bouquet"');
  });

  it("comes after Send one back and its free line, before Keep this gift, and is a link, not a third button", () => {
    const html = onGiftPage(gift("bouquet"));
    const at = (text: string) => html.indexOf(text);
    expect(at("Send one back to Mia")).toBeGreaterThan(0);
    expect(at("Send one back to Mia")).toBeLessThan(at("The first reply is free"));
    expect(at("The first reply is free")).toBeLessThan(at("or make one for someone else"));
    expect(at("or make one for someone else")).toBeLessThan(at("Keep this gift"));
    // No reaction asked for here, so "Send one back" is the only button; the rest are links.
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toMatch(/<form|<input|€|\$\d/);
  });

  it("never carries the gift: its address holds the template and nothing else", () => {
    const link = someoneElse(onGiftPage(gift("bouquet")));
    expect(link).not.toContain("abc23def4");
    expect(link).not.toContain("/g/");
  });

  it("is not on demos, in the editor's preview, or where the template has no make-one button", () => {
    expect(someoneElse(renderToStaticMarkup(<EndScreen data={gift("bouquet")} onMakeOne={() => {}} />))).toBeNull();
    expect(
      someoneElse(
        renderToStaticMarkup(
          <ReplyModeContext.Provider value>
            <EndScreen data={gift("bouquet")} />
          </ReplyModeContext.Provider>,
        ),
      ),
    ).toBeNull();
  });

  it("is hidden inside the iPhone app the way Keep this gift is", () => {
    const html = onGiftPage(gift("bouquet"));
    expect(someoneElse(html)).toContain("data-app-hide");
    expect(/<a [^>]*data-testid="keep-gift"/.exec(html)?.[0]).toContain("data-app-hide");
    expect(readFileSync("src/app/globals.css", "utf8")).toMatch(/html\[data-app\] \[data-app-hide\] \{\s*display: none/);
  });

  it("is a control the floating badge stands down for", () => {
    // The badge looks under itself for GIFT_CONTROLS; a link with an address is one of them.
    expect(GIFT_CONTROLS.split(", ")).toContain("a[href]");
    expect(someoneElse(onGiftPage(gift("bouquet")))).toMatch(/^<a [^>]*href="/);
  });
});

describe("the maker's mark at the foot of a free gift", () => {
  const endOf = (locale: "en" | "es", tone: "light" | "dark" = "dark") =>
    renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={gift("the-letter", locale)} tone={tone} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
  const mark = (html: string) => /<a [^>]*href="[^"]*made-with-ethos\?ref=watermark[^"]*"[^>]*>.*?<\/a>/.exec(html)?.[0] ?? "";

  it("reads as two lines in one link: the badge, then what Ethos makes", () => {
    const link = mark(endOf("en"));
    expect(link.indexOf("Made with Ethos")).toBeGreaterThan(0);
    expect(link.indexOf("Digital cards by Tryethos")).toBeGreaterThan(link.indexOf("Made with Ethos"));
    // One link, a thumb tall.
    expect(endOf("en").match(/made-with-ethos\?ref=watermark/g)).toHaveLength(1);
    expect(link).toContain("min-h-11");
  });

  it("in Spanish for a Spanish gift, from the one place the line is kept", () => {
    expect(mark(endOf("es"))).toContain("Tarjetas digitales de Tryethos");
    expect(BRAND.categoryLine).toEqual({ en: "Digital cards by Tryethos", es: "Tarjetas digitales de Tryethos" });
  });

  it("takes the end screen's tone, so it is quiet on a paper end screen and on a dark one", () => {
    expect(mark(endOf("en", "light"))).toContain("text-black/50");
    expect(mark(endOf("en", "dark"))).toContain("text-white/55");
  });

  it("leaves the floating badge the one line it was", () => {
    const floating = renderToStaticMarkup(<Watermark locale="en" slug="the-letter" />);
    expect(floating).toContain("Made with Ethos");
    expect(floating).not.toContain("Digital cards");
    expect(floating).toContain("absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2");
  });

  it("is not on a paid gift, which carries no badge", () => {
    const html = onGiftPage(gift("bouquet"));
    expect(html).not.toContain("Made with Ethos");
    expect(html).not.toContain("Digital cards");
  });
});

describe("the free-tier badge", () => {
  it("opens the page made for whoever taps it, with the template the gift was made with", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" slug="the-letter" />)).toContain('href="/made-with-ethos?ref=watermark&amp;template=the-letter"');
    expect(renderToStaticMarkup(<Watermark locale="es" slug="constellations" />)).toContain('href="/es/made-with-ethos?ref=watermark&amp;template=constellations"');
  });

  it("goes there without a template when it doesn't know it", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" />)).toContain('href="/made-with-ethos?ref=watermark"');
  });

  it("carries the gift's template on the end screen too", () => {
    const html = renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={gift("the-letter")} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
    expect(html).toContain('href="/made-with-ethos?ref=watermark&amp;template=the-letter"');
  });
});
