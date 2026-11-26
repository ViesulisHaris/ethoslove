import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { COVER_SHAPE, SCREEN_SHAPE, tallOf } from "@/components/templates/page/cover-in-screen";
import { TEMPLATE_FILM_STARTS, templateFilmStart } from "@/content/template-film-starts";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";

/**
 * The film in the hero's lying phone starts past the demo page's bar that most recordings open on
 * (content/template-film-starts.ts). The numbers are measured from the films; this holds the table
 * to real films and to numbers that can only be an opening, never most of a film.
 */
describe("where a gift's preview film starts", () => {
  it("is given only for a registered template that has a film", () => {
    for (const slug of Object.keys(TEMPLATE_FILM_STARTS)) {
      const manifest = getManifest(slug);
      expect(manifest, `${slug} is not a template`).toBeTruthy();
      const film = manifest!.thumbnail.webm;
      expect(film, `${slug} has no film`).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", film!)), `${slug}: ${film} is not in public/`).toBe(true);
    }
  });

  it("is an opening: a few tenths to a few seconds, in tenths", () => {
    for (const [slug, from] of Object.entries(TEMPLATE_FILM_STARTS)) {
      expect(from, slug).toBeGreaterThanOrEqual(1.2);
      // The shortest film is eight seconds long; the longest opening measured was 4.4 (Snow Globe keeps the bar for four seconds).
      expect(from, slug).toBeLessThanOrEqual(5);
      expect(Math.abs(from * 10 - Math.round(from * 10)), slug).toBeLessThan(1e-9);
    }
  });

  it("is given for every gift that has a film: none opens on the cover that says “turn your sound on”", () => {
    // The review of 21 Nov 2026: most pages opened, muted, on "someone made this for you … turn your
    // sound on" under the play button. Every recording has an opening (scripts/film-starts.mjs
    // measures it), so a gift with a film and no row here would play that opening in the hero.
    for (const m of TEMPLATE_MANIFESTS) {
      if (!m.thumbnail.webm) continue;
      expect(Object.hasOwn(TEMPLATE_FILM_STARTS, m.slug), `${m.slug} has a film and no measured start`).toBe(true);
      // The page's bar or the cover is up for more than a second in every recording.
      expect(templateFilmStart(m.slug), m.slug).toBeGreaterThanOrEqual(1.2);
    }
  });

  it("is 0 for a template nobody measured", () => {
    expect(templateFilmStart("the-letter")).toBeGreaterThan(1);
    expect(templateFilmStart("not-a-template")).toBe(0);
  });

  it("is recorded, with its cover, in the one shape the lying phone lays it into: 13 across, 20 down", async () => {
    // The hero draws each cover and film whole, at the phone screen's width, in a box of this shape
    // (cover-in-screen.tsx, COVER_SHAPE). A recording of another shape would still be whole, but it
    // would sit in that box with a gap beside it; this fails before anyone sees that.
    const [across, down] = COVER_SHAPE;
    for (const m of TEMPLATE_MANIFESTS) {
      const cover = await sharp(join(process.cwd(), "public", m.thumbnail.poster)).metadata();
      expect(cover.width! * down, `${m.slug}: its cover is ${cover.width}×${cover.height}`).toBe(cover.height! * across);
      if (!m.thumbnail.webm) continue;
      // A WebM says its size once, near its start: PixelWidth (0xB0) and PixelHeight (0xBA), two bytes each.
      const head = readFileSync(join(process.cwd(), "public", m.thumbnail.webm)).subarray(0, 8192);
      let size: [number, number] | null = null;
      for (let i = 0; i < head.length - 8 && !size; i++) if (head[i] === 0xb0 && head[i + 1] === 0x82 && head[i + 4] === 0xba && head[i + 5] === 0x82) size = [head.readUInt16BE(i + 2), head.readUInt16BE(i + 6)];
      expect(size, `${m.slug}: its film does not say its size`).not.toBeNull();
      expect(size![0] * down, `${m.slug}: its film is ${size![0]}×${size![1]}`).toBe(size![1] * across);
    }
  });

  it("leaves every film small enough to send to a phone: none over 2 MB", () => {
    // Thirteen were 2.0 to 3.5 MB, and a page fetches its film as soon as the phone in its hero is on screen.
    for (const m of TEMPLATE_MANIFESTS) {
      if (!m.thumbnail.webm) continue;
      expect(statSync(join(process.cwd(), "public", m.thumbnail.webm)).size, m.slug).toBeLessThanOrEqual(2_000_000);
    }
  });

  it("has a tall twin of every cover and film, in a phone screen's own shape, for the drawn phones", async () => {
    // The lying phone and the small phones show these (cover-in-screen.tsx, SCREEN_SHAPE, tallOf): the
    // 13:20 pair sat in the screen's middle with a blurred band above and below (26 Nov 2026).
    const [across, down] = SCREEN_SHAPE;
    for (const m of TEMPLATE_MANIFESTS) {
      const poster = join(process.cwd(), "public", tallOf(m.thumbnail.poster));
      expect(existsSync(poster), `${m.slug}: no ${tallOf(m.thumbnail.poster)}`).toBe(true);
      const cover = await sharp(poster).metadata();
      expect(Math.abs(cover.width! / cover.height! - across / down), `${m.slug}: its tall cover is ${cover.width}×${cover.height}`).toBeLessThan(0.002);
      if (!m.thumbnail.webm) continue;
      const film = join(process.cwd(), "public", tallOf(m.thumbnail.webm));
      expect(existsSync(film), `${m.slug}: no ${tallOf(m.thumbnail.webm)}`).toBe(true);
      expect(statSync(film).size, m.slug).toBeLessThanOrEqual(2_000_000);
    }
    expect(tallOf("/templates/bouquet/poster.jpg")).toBe("/templates/bouquet/poster-tall.jpg");
    expect(tallOf("/templates/bouquet/preview.webm")).toBe("/templates/bouquet/preview-tall.webm");
    expect(tallOf("/art/other.jpg")).toBe("/art/other.jpg");
  });
});
