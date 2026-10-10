import { describe, expect, it } from "vitest";
import { composeQrSvg, qrDesignQuery, qrLayout, readQrDesign, QR_FRAMES, QR_LABEL_MAX } from "@/lib/qr/compose";
import { qrPalette } from "@/lib/qr/palette";

const CODE = `<?xml version="1.0" standalone="no"?>\r\n<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect x="0" y="0" width="10" height="10" fill="#000"/></svg>`;

describe("the QR card drawing", () => {
  it("puts the code inside the card for every frame, with or without a line under it", () => {
    for (const frame of QR_FRAMES) {
      for (const withLabel of [false, true]) {
        const L = qrLayout(frame, withLabel);
        expect(L.x).toBeGreaterThanOrEqual(0);
        expect(L.x + L.size).toBeLessThanOrEqual(1000);
        expect(L.y + L.size, `${frame} ${withLabel}`).toBeLessThan(withLabel ? L.labelY - L.labelSize / 2 : 1000);
      }
    }
  });

  it("draws the frame, the code and the line as one SVG, in the code's own coordinates", () => {
    const svg = composeQrSvg({ qrSvg: CODE, frame: "heart", background: "#1A1614", palette: qrPalette("#E8604C", "#1A1614"), label: "for Maya ♡", labelFill: "#ffffff" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('viewBox="0 0 600 600"');
    expect(svg).toContain('<path transform="scale(10)"');
    expect(svg).toContain(">for Maya ♡</text>");
    // A dark background gets the light panel behind the code.
    expect(svg.match(/<rect /g)?.length).toBeGreaterThanOrEqual(2);
    expect(svg).not.toContain("<?xml");
  });

  it("keeps a line typed with markup as text", () => {
    const svg = composeQrSvg({ qrSvg: CODE, frame: "none", background: "#FAF7F2", palette: qrPalette("#E8604C", "#FAF7F2"), label: `<script>"&'`, labelFill: "#000" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&quot;&amp;&apos;");
  });

  it("carries the designer's choices to the print card and reads back only what is allowed", () => {
    const design = { dots: "classy" as const, colour: "#2F6B4F", gradient: true, centre: "photo" as const, photo: "p1", size: "l" as const, label: "for Maya" };
    const back = readQrDesign(Object.fromEntries(new URLSearchParams(qrDesignQuery(design))), "#E8604C");
    expect(back).toEqual(design);
    const junk = readQrDesign({ dots: "x", colour: "javascript:alert(1)", centre: "svg", size: "xl", label: "a".repeat(200), gradient: "yes" }, "#E8604C");
    expect(junk).toEqual({ dots: "rounded", colour: "#E8604C", gradient: false, centre: "logo", photo: "", size: "m", label: "a".repeat(QR_LABEL_MAX) });
  });
});
