import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import { COVER_IDS, type CoverId } from "@/lib/gift/schema";
import { CoverPicker } from "@/components/editor/cover-picker";

const firstDraw = (value: CoverId) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <CoverPicker value={value} onChange={() => {}} recipientName="Ana" locale="en" slug="the-letter" fields={{}} />
    </NextIntlClientProvider>,
  );

describe("cover picker, as the editor first draws it", () => {
  it("has every cover's button, its name and the current choice from the start", () => {
    const html = firstDraw("kisses");
    for (const id of COVER_IDS) expect(html).toContain(`data-testid="cover-${id}"`);
    expect(html.match(/role="radio"/g)).toHaveLength(COVER_IDS.length);
    expect(html).toContain('aria-checked="true" data-testid="cover-kisses"');
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("draws no cover yet: each tile holds its place as an empty frame of the tile's size", () => {
    const html = firstDraw("classic");
    // A drawn tile is a size container for the cover inside it; none is drawn before the page starts.
    expect(html).not.toContain("container-type");
    expect(html.match(/aspect-\[9\/16\]/g)).toHaveLength(COVER_IDS.length);
  });
});
