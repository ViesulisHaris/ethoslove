import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATE_FILM_STARTS, templateFilmStart } from "@/content/template-film-starts";
import { getManifest } from "@/templates/manifests";

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
      expect(from, slug).toBeGreaterThanOrEqual(0.3);
      // The shortest film is eight seconds long; the longest opening measured was 4.4.
      expect(from, slug).toBeLessThanOrEqual(5);
      expect(Math.abs(from * 10 - Math.round(from * 10)), slug).toBeLessThan(1e-9);
    }
  });

  it("is 0 for a film that starts clean, and for a template nobody measured", () => {
    expect(templateFilmStart("the-letter")).toBeGreaterThan(1);
    expect(templateFilmStart("autumn-reel")).toBe(0);
    expect(templateFilmStart("not-a-template")).toBe(0);
  });
});
