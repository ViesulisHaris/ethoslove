import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { Watermark } from "@/templates/_shared/Watermark";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";
import { GiftChromeContext } from "@/templates/_shared/gift-chrome";

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
    // Still two buttons and Replay: the keep link took the old second link's place.
    expect(html).not.toContain("Make one for someone else");
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
