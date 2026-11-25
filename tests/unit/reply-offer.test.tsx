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

describe("the end screen set closer, for a gift that ends on a card", () => {
  // String the Lights and Gingerbread House end on a card far smaller than a screen. The end as every
  // other gift draws it was two screens of that card: on an ordinary phone it arrived with the new
  // link, "Keep this gift" and "Watch again" out of sight.
  const end = (compact: boolean, locale: "en" | "es" = "en", watermarked = false) =>
    renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked, keepHref: KEEP }}>
        <ReplyModeContext.Provider value>
          <EndScreen data={{ ...gift("string-the-lights", locale), showReactionCta: true } as GiftData} tone="light" compact={compact} onReact={() => {}} onMakeOne={() => {}} onReplay={() => {}} />
        </ReplyModeContext.Provider>
      </GiftChromeContext.Provider>,
    );
  const root = (html: string) => /^<div[^>]*>/.exec(html)?.[0] ?? "";
  const row = /<div class="flex flex-wrap items-center justify-center gap-x-5"><a [^>]*data-testid="keep-gift"[^>]*>.*?<\/a><button[^>]*>.*?<\/button><\/div>/;

  it("takes no side margins of its own (the card has them), so a button's words stay on one line", () => {
    expect(root(end(true))).not.toContain("px-6");
    expect(root(end(false))).toContain("px-6");
  });

  it("puts Keep this gift and Watch again in one row, which wraps where the two don't fit", () => {
    expect(end(true)).toMatch(row);
    expect(end(true, "es")).toMatch(row);
    // Everywhere else they stay one under the other, straight in the column of buttons.
    expect(end(false)).not.toContain("flex-wrap");
    expect(end(false)).toMatch(/<\/a><a [^>]*data-testid="keep-gift"[^>]*>.*?<\/a><button/);
  });

  it("has a smaller heart and rows that sit nearer, and every control is still a thumb tall", () => {
    const html = end(true);
    expect(html).toContain("size-12");
    expect(html).not.toContain("size-20");
    expect(html).toContain("mt-4 gap-2");
    expect(end(false)).toContain("size-20");
    expect(end(false)).toContain("mt-8 gap-3");
    // The two buttons 48px, the three text controls 44px.
    expect(html.match(/min-h-12/g)).toHaveLength(2);
    expect(/<a [^>]*data-testid="make-for-someone-else"/.exec(html)?.[0]).toContain("min-h-11");
    expect(/<a [^>]*data-testid="keep-gift"/.exec(html)?.[0]).toContain("min-h-11");
    expect(/<button[^>]*>(?:(?!<\/button>).)*Watch again/.exec(html)?.[0]).toContain("h-11");
  });

  it("leaves its heart out where the gift has a mark of its own over it, and only there", () => {
    const withHeart = (heart: boolean | undefined) =>
      renderToStaticMarkup(<EndScreen data={gift("string-the-lights")} tone="light" compact heart={heart} onMakeOne={() => {}} />);
    expect(withHeart(undefined)).toContain("lucide-heart");
    expect(withHeart(true)).toContain("lucide-heart");
    expect(withHeart(false)).not.toContain("lucide-heart");
    // The words that end the gift then start the end, with no gap over them.
    expect(/<p class="([^"]*)"[^>]*>The end\. For now\.<\/p>/.exec(withHeart(false))?.[1]).not.toMatch(/\bmt-/);
    expect(/<p class="([^"]*)"[^>]*>The end\. For now\.<\/p>/.exec(withHeart(true))?.[1]).toContain("mt-3");
    expect(renderToStaticMarkup(<EndScreen data={gift("bouquet")} onMakeOne={() => {}} />)).toContain("lucide-heart");
  });

  it("says and links the same things, in the same order, as the end everywhere else", () => {
    const words = (html: string) => html.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");
    const hrefs = (html: string) => html.match(/href="[^"]*"/g);
    for (const locale of ["en", "es"] as const)
      for (const watermarked of [false, true]) {
        expect(words(end(true, locale, watermarked))).toBe(words(end(false, locale, watermarked)));
        expect(hrefs(end(true, locale, watermarked))).toEqual(hrefs(end(false, locale, watermarked)));
      }
  });

  it("is what the two gifts that end on a card ask for, and nobody else", () => {
    for (const slug of ["string-the-lights", "gingerbread-house"]) {
      const template = readFileSync(`src/templates/${slug}/Template.tsx`, "utf8");
      expect(template, slug).toMatch(/<EndScroll give="calc\([\d.]+\*var\(--u\)\)">/);
      expect(template, slug).toMatch(/<StepExtra step=\{step\} data=\{data\} tone="light" compact /);
    }
    // String the Lights sets its sign over the end, and that is the end's mark there: no heart under it.
    expect(readFileSync("src/templates/string-the-lights/Template.tsx", "utf8")).toContain('tone="light" compact heart={false} ');
    expect(readFileSync("src/templates/gingerbread-house/Template.tsx", "utf8")).not.toContain("heart={false}");
    // The end as the other 59 gifts draw it is untouched unless a gift asks.
    expect(readFileSync("src/templates/_shared/EndScreen.tsx", "utf8")).toContain("compact = false,");
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

  it("stands in a row of its own, so the free line stays the button's and is not read on into it", () => {
    // "The first reply is free / or make one for someone else" read as one sentence when the two
    // shared the button's tight group. The group closes after the free line; the link follows it.
    for (const locale of ["en", "es"] as const) {
      const html = onGiftPage(gift("bouquet", locale));
      expect(html).toMatch(/(The first reply is free|La primera respuesta es gratis)<\/p><\/div><a [^>]*data-testid="make-for-someone-else"/);
    }
    // And on a gift with no free line, the same row: straight after the button's group.
    expect(onGiftPage(gift("the-letter"), true)).toMatch(/<\/button><\/div><a [^>]*data-testid="make-for-someone-else"/);
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

describe("Send one back, once it has been tapped", () => {
  const button = (html: string) => /<button[^>]*>(?:(?!<\/button>).)*Send one back to Mia(?:(?!<\/button>).)*<\/button>/.exec(html)?.[0] ?? "";
  const end = (makeOnePending: boolean) =>
    renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: false, keepHref: KEEP, makeOnePending }}>
        <ReplyModeContext.Provider value>
          <EndScreen data={gift("bouquet")} onMakeOne={() => {}} />
        </ReplyModeContext.Provider>
      </GiftChromeContext.Provider>,
    );

  it("waits for the editor: busy, and it takes no second tap", () => {
    const busy = button(end(true));
    expect(busy).toMatch(/^<button[^>]* disabled=""/);
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain("animate-spin");
    // A turning mark that stands still for someone who asked for less motion.
    expect(busy).toContain("motion-reduce:animate-none");
  });

  it("is an ordinary button until then, and on demos, which never wait", () => {
    for (const html of [end(false), renderToStaticMarkup(<EndScreen data={gift("bouquet")} onMakeOne={() => {}} />)]) {
      const idle = /<button[^>]*>/.exec(html)?.[0] ?? "";
      expect(idle).not.toContain("disabled=");
      expect(idle).not.toContain("aria-busy");
      expect(html).not.toContain("animate-spin");
    }
  });
});

describe("the maker's mark at the foot of a free gift", () => {
  // A real gift page: the badge's tap is counted there, and only there does its link carry the tag.
  const endOf = (locale: "en" | "es", tone: "light" | "dark" = "dark") =>
    renderToStaticMarkup(
      <ReplyModeContext.Provider value>
        <GiftChromeContext.Provider value={{ watermarked: true }}>
          <EndScreen data={gift("the-letter", locale)} tone={tone} onMakeOne={() => {}} />
        </GiftChromeContext.Provider>
      </ReplyModeContext.Provider>,
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

  it("takes the end screen's tone, so it is quiet on a paper end screen and on a dark one, and still readable", () => {
    // 10px type: black at 60% is about 5:1 on paper or white. At 50% it was 3.9:1, under what small text needs.
    expect(mark(endOf("en", "light"))).toContain("text-black/60");
    expect(mark(endOf("en", "light"))).not.toContain("text-black/50");
    expect(mark(endOf("en", "dark"))).toContain("text-white/55");
  });

  it("darkens its pill on a light end screen, so the badge's own words read on paper", () => {
    // White at 85% on black at 40% over The Letter's paper measured 2.8:1 (the deep tester's loop-D9).
    expect(mark(endOf("en", "light"))).toContain("bg-black/65 text-white");
    expect(mark(endOf("en", "light"))).not.toContain("bg-black/40");
    // A dark end screen keeps the pill it had.
    expect(mark(endOf("en", "dark"))).toContain("bg-black/40 text-white/85");
  });

  it("shows its keyboard ring on a dark end screen, where the site's dark ring is lost, as the link above it does", () => {
    const light = /focus-visible:outline-white\/60/;
    expect(mark(endOf("en", "dark"))).toMatch(light);
    expect(mark(endOf("en", "light"))).not.toMatch(light);
    const link = (tone: "light" | "dark") =>
      someoneElse(
        renderToStaticMarkup(
          <ReplyModeContext.Provider value>
            <EndScreen data={gift("bouquet")} tone={tone} onMakeOne={() => {}} />
          </ReplyModeContext.Provider>,
        ),
      );
    expect(link("dark")).toMatch(light);
    expect(link("light")).not.toMatch(light);
    // On its own box: the default ring stands 3px off, into the button above.
    expect(link("light")).toContain("focus-visible:outline-offset-0");
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
    expect(renderToStaticMarkup(<Watermark locale="en" slug="the-letter" counted />)).toContain('href="/made-with-ethos?ref=watermark&amp;template=the-letter"');
    expect(renderToStaticMarkup(<Watermark locale="es" slug="constellations" counted />)).toContain('href="/es/made-with-ethos?ref=watermark&amp;template=constellations"');
  });

  it("goes there without a template when it doesn't know it", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" counted />)).toContain('href="/made-with-ethos?ref=watermark"');
  });

  it("carries the gift's template on the end screen too", () => {
    const html = renderToStaticMarkup(
      <ReplyModeContext.Provider value>
        <GiftChromeContext.Provider value={{ watermarked: true }}>
          <EndScreen data={gift("the-letter")} onMakeOne={() => {}} />
        </GiftChromeContext.Provider>
      </ReplyModeContext.Provider>,
    );
    expect(html).toContain('href="/made-with-ethos?ref=watermark&amp;template=the-letter"');
  });

  // loop2-C1: a demo visitor who tapped the badge was counted as a recipient who started their own.
  it("on a demo, opens the same page with no recipient's tag, floating or on the end screen", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" slug="the-letter" />)).toContain('href="/made-with-ethos?template=the-letter"');
    expect(renderToStaticMarkup(<Watermark locale="es" slug="constellations" />)).toContain('href="/es/made-with-ethos?template=constellations"');
    expect(renderToStaticMarkup(<Watermark locale="en" />)).toContain('href="/made-with-ethos"');
    const demoEnd = renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={gift("the-letter")} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
    expect(demoEnd).toContain('href="/made-with-ethos?template=the-letter"');
    expect(demoEnd).not.toMatch(/(\?|&amp;)ref=/);
  });

  it("is tagged on a gift page only: the renderer counts it where it is in reply mode, which every real gift is", () => {
    expect(readFileSync("src/templates/_shared/GiftRenderer.tsx", "utf8")).toContain("<Watermark locale={resolved.locale} slug={slug} counted={replyMode} />");
    expect(readFileSync("src/components/gift/gift-experience.tsx", "utf8")).toMatch(/<GiftRenderer[\s\S]*?\n\s+replyMode\r?\n/);
  });
});
