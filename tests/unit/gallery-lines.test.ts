import { describe, expect, it } from "vitest";
import { GALLERY_LINES, GALLERY_LINE_MAX, galleryLine } from "@/content/gallery-lines";
import { listManifests } from "@/templates/manifests";
import { FILLER } from "./filler";

/**
 * The one line on a gift's card in the gallery. The review of 22 Nov 2026 found the card cutting a
 * gift's tagline off with an ellipsis on 59 of 61 cards; the card now has a line written for it.
 * This holds the table to the catalogue and to the room the card has (the page itself is measured
 * in tests/e2e/gallery.spec.ts).
 */
describe("the gallery card's line", () => {
  const manifests = listManifests();

  it("has one for every gift in the catalogue, and none for a gift that is gone", () => {
    expect(Object.keys(GALLERY_LINES).sort()).toEqual(manifests.map((m) => m.slug).sort());
  });

  for (const locale of ["en", "es"] as const) {
    it(`fits the card in ${locale}: at most ${GALLERY_LINE_MAX} characters, a whole sentence, never an ellipsis`, () => {
      for (const m of manifests) {
        const line = galleryLine(m.slug, m.tagline, locale);
        expect(line.length, `${m.slug}: "${line}"`).toBeLessThanOrEqual(GALLERY_LINE_MAX);
        expect(line, m.slug).toMatch(/[.?]$/);
        expect(line, m.slug).not.toMatch(/…|\.\.\.|!|—/);
        // No word so long that it could not wrap inside the card's narrowest column.
        for (const word of line.split(/\s+/)) expect(word.length, `${m.slug}: "${word}"`).toBeLessThanOrEqual(16);
      }
    });

    it(`reads as a line about that gift in ${locale}, not as filler`, () => {
      const lines = manifests.map((m) => galleryLine(m.slug, m.tagline, locale));
      // No two gifts share a line.
      expect(new Set(lines).size).toBe(lines.length);
      for (const line of lines) for (const phrase of FILLER[locale]) expect(line, `${line} (${phrase})`).not.toMatch(phrase);
    });
  }

  it("never names a recipient's gender in Spanish beyond what the gift's own tagline does", () => {
    for (const m of manifests) {
      const line = GALLERY_LINES[m.slug].es;
      for (const word of [" ella ", " él ", " novia", " novio", " esposa", " marido"]) expect(` ${line.toLowerCase()} `, m.slug).not.toContain(word);
    }
  });
});
