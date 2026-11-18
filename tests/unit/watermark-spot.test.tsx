import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BADGE_AIR, coversControl, GIFT_CONTROLS, type Box } from "@/templates/_shared/watermark-spot";
import { Watermark } from "@/templates/_shared/Watermark";

const box = (x: number, y: number, w: number, h: number): Box => ({ left: x, top: y, right: x + w, bottom: y + h });

// Measured on an iPhone 15 (393 px, WebKit) in the editor's "Play from the start", 17 Nov 2026.
const gift = box(0, 57, 393, 537);
const badge = box(132, 554, 129, 29);

describe("the floating badge and the gift's controls", () => {
  it("is in the way of Sticker Bomb's “Read the card”, which it all but hid", () => {
    expect(coversControl(badge, box(130, 554, 133, 27), gift)).toBe(true);
  });

  it("is in the way of The Council's skip link, and of “All rise” just above it", () => {
    expect(coversControl(badge, box(149, 563, 95, 18), gift)).toBe(true);
    // Its foot dipped 6 px into the badge: the label stayed readable, the button didn't look whole.
    expect(coversControl(badge, box(153, 533, 87, 27), gift)).toBe(true);
  });

  it(`keeps ${BADGE_AIR} px of room around itself, and no more`, () => {
    const above = (gap: number) => box(140, badge.top - gap - 20, 100, 20);
    expect(coversControl(badge, above(BADGE_AIR - 1), gift)).toBe(true);
    expect(coversControl(badge, above(BADGE_AIR + 1), gift)).toBe(false);
  });

  it("leaves controls elsewhere alone: the sound button, a button higher up", () => {
    expect(coversControl(badge, box(341, 69, 40, 40), gift)).toBe(false);
    expect(coversControl(badge, box(120, 300, 150, 44), gift)).toBe(false);
  });

  it("doesn't count a “tap anywhere” page or a big photo, which it can't hide", () => {
    expect(coversControl(badge, gift, gift)).toBe(false);
    expect(coversControl(badge, box(40, 300, 313, 290), gift)).toBe(false);
  });

  it("does count a big surface when it would sit on the middle of it", () => {
    expect(coversControl(badge, box(0, 489, 393, 160), gift)).toBe(true);
  });

  it("ignores what isn't laid out", () => {
    expect(coversControl(badge, box(150, 560, 0, 0), gift)).toBe(false);
  });

  it("knows links and buttons by any of their names", () => {
    for (const kind of ["a[href]", "button", '[role="button"]', "input", '[tabindex]:not([tabindex="-1"])']) expect(GIFT_CONTROLS).toContain(kind);
  });
});

describe("the badge itself", () => {
  it("floats out of sight until it has looked under itself, so it never shows over a button for a frame", () => {
    const html = renderToStaticMarkup(<Watermark locale="en" slug="sticker-bomb" />);
    expect(html).toContain("Made with Ethos");
    expect(html).toContain("invisible");
  });

  it("in the end screen's flow, is simply there", () => {
    const html = renderToStaticMarkup(<Watermark locale="en" slug="sticker-bomb" inline />);
    expect(html).toContain("Made with Ethos");
    expect(html).not.toContain("invisible");
  });
});
