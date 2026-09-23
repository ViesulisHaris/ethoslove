import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { Watermark } from "@/templates/_shared/Watermark";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";
import { GiftChromeContext } from "@/templates/_shared/gift-chrome";

const gift = (templateSlug: string, locale: "en" | "es" = "en") =>
  ({ templateSlug, locale, senderName: "Mia", recipientName: "Leo", showReactionCta: false }) as unknown as GiftData;

const onGiftPage = (data: GiftData, watermarked = false) =>
  renderToStaticMarkup(
    <GiftChromeContext.Provider value={{ watermarked }}>
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
    expect(html).toContain('href="/es/templates?ref=gift-end"');
    expect(html).toContain("Hazle uno a otra persona");
  });

  it("promises nothing on a free template, or on a gift that was itself sent free (footer on)", () => {
    for (const slug of ["the-letter", "constellations"]) {
      const html = onGiftPage(gift(slug));
      expect(html).toContain("Send one back to Mia");
      expect(html).not.toContain("is free");
    }
    expect(onGiftPage(gift("bouquet"), true)).not.toContain("is free");
  });

  it("offers the gallery to whoever wants to make one for someone else", () => {
    const html = onGiftPage(gift("bouquet"));
    expect(html).toContain('href="/templates?ref=gift-end"');
    expect(html).toContain("Make one for someone else");
  });

  it("keeps demos and previews as they were: no offer, no second link", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift("bouquet")} onMakeOne={() => {}} />);
    expect(html).toContain("Make one for someone you love");
    expect(html).not.toContain("is free");
    expect(html).not.toContain("gift-end");
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
  it("opens the page of the template the gift was made with", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" slug="the-letter" />)).toContain('href="/templates/the-letter?ref=watermark"');
    expect(renderToStaticMarkup(<Watermark locale="es" slug="constellations" />)).toContain('href="/es/templates/constellations?ref=watermark"');
  });

  it("falls back to the gallery when it doesn't know the template", () => {
    expect(renderToStaticMarkup(<Watermark locale="en" />)).toContain('href="/templates?ref=watermark"');
  });

  it("carries the gift's template on the end screen too", () => {
    const html = renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={gift("the-letter")} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
    expect(html).toContain('href="/templates/the-letter?ref=watermark"');
  });
});
