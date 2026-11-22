/**
 * The reference template for group cards exists for development only: it resolves by its slug under
 * `next dev` and nowhere else, and it is in none of the lists the gallery, the sitemap, the app's
 * catalogue or checkout read. Its own files are tested here directly: the manifest, the demo data
 * (six notes holding every edge of the contract) and what the template draws from them.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTRIBUTION_LIMITS, createGiftSchema, type GiftData } from "@/lib/gift/schema";
import { readinessProblems } from "@/lib/gift/publish";
import { planCheckout } from "@/lib/commerce/plan";
import { manifest } from "@/templates/_group-reference/manifest";
import { fieldsSchema } from "@/templates/_group-reference/schema";
import { demoData } from "@/templates/_group-reference/demo-data";
import { Template } from "@/templates/_group-reference/Template";

const SLUG = "group-reference";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function resolvedUnder(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.resetModules();
  const manifests = await import("@/templates/manifests");
  const registry = await import("@/templates/registry");
  const schemas = await import("@/templates/schemas");
  return {
    manifest: manifests.getManifest(SLUG),
    isSlug: manifests.isTemplateSlug(SLUG),
    lists: [manifests.TEMPLATE_SLUGS, manifests.TEMPLATE_MANIFESTS.map((m) => m.slug), registry.LOADER_SLUGS, schemas.SCHEMA_SLUGS, manifests.listManifests().map((m) => m.slug)],
    template: await registry.loadTemplate(SLUG),
    schema: await schemas.loadFieldsSchema(SLUG),
  };
}

describe("where the reference template can be found", () => {
  it("nowhere in a production build", async () => {
    const found = await resolvedUnder("production");
    expect(found.manifest).toBeNull();
    expect(found.template).toBeNull();
    expect(found.schema).toBeNull();
    expect(found.isSlug).toBe(false);
  });

  it("nowhere under the unit tests either", async () => {
    const found = await resolvedUnder("test");
    expect(found.manifest).toBeNull();
    expect(found.template).toBeNull();
    expect(found.schema).toBeNull();
  });

  it("by its slug in development, and still in no list", async () => {
    const found = await resolvedUnder("development");
    expect(found.manifest?.slug).toBe(SLUG);
    expect(found.template?.manifest.slug).toBe(SLUG);
    expect(found.schema).not.toBeNull();
    expect(found.isSlug).toBe(false);
    for (const list of found.lists) expect(list).not.toContain(SLUG);
  });

  it("checkout refuses it: it is not a template anyone can buy", () => {
    const ctx = { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false };
    expect(planCheckout({ product: "single", templateSlugs: [SLUG], currency: "eur" }, ctx)).toMatchObject({ ok: false, error: "wrong_template_count" });
  });
});

describe("the reference template's own files", () => {
  it("declares a group card of up to 25 notes of 140, with photos", () => {
    expect(manifest.slug).toBe(SLUG);
    expect(manifest.tier).toBe("premium");
    expect(manifest.features.group).toEqual({ min: 0, max: 25, noteMax: 140, photos: true });
    expect(manifest.features.group!.max).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.max);
    expect(manifest.features.group!.noteMax).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.note);
    expect(manifest.features.photos).toEqual({ min: 0, max: 8 });
  });

  for (const locale of ["en", "es"] as const) {
    const data = demoData[locale];
    const notes = data.contributions ?? [];

    it(`${locale}: six notes, two with a photo, one of the full 140 and one signed with the full 24`, () => {
      expect(notes).toHaveLength(6);
      expect(notes.filter((item) => item.photo)).toHaveLength(2);
      expect(Math.max(...notes.map((item) => Array.from(item.note).length))).toBe(140);
      expect(Math.max(...notes.map((item) => Array.from(item.name).length))).toBe(24);
      expect(new Set(notes.map((item) => item.key)).size).toBe(6);
    });

    it(`${locale}: is a gift its own schema takes and that is ready to send`, () => {
      expect(createGiftSchema(fieldsSchema).safeParse(data).success).toBe(true);
      expect(readinessProblems(manifest, data as GiftData, fieldsSchema)).toEqual([]);
    });

    it(`${locale}: draws every note, in order, with its name`, () => {
      const html = renderToStaticMarkup(<Template data={data} mode="preview" />);
      const places = notes.map((item) => html.indexOf(escaped(item.note)));
      expect(places.every((at) => at >= 0)).toBe(true);
      expect([...places].sort((a, b) => a - b)).toEqual(places);
      for (const item of notes) expect(html).toContain(escaped(item.name));
      expect(html.match(/data-testid="contribution"/g)).toHaveLength(6);
      expect(html.match(/<img /g)).toHaveLength(2);
    });

    it(`${locale}: every note and every name starts from the side its own script starts from`, () => {
      const html = renderToStaticMarkup(<Template data={data} mode="preview" />);
      expect(html.match(/<blockquote dir="auto"/g)).toHaveLength(6);
      expect(html.match(/<figcaption dir="auto"/g)).toHaveLength(6);
      expect(html).not.toMatch(/<blockquote(?! dir="auto")/);
    });
  }
});

describe("what a note can never do to the gift", () => {
  const hostile = (over: Partial<GiftData>): GiftData<Record<string, never>> => ({ ...demoData.en, ...over }) as GiftData<Record<string, never>>;

  it("its words are plain text: no markup, no rich text, no link", () => {
    const html = renderToStaticMarkup(
      <Template
        data={hostile({
          contributions: [{ key: "hostile001", name: "<b>Mallory</b>", note: '<img src=x onerror="alert(1)"> **bold** *em* https://evil.example [x](https://evil.example)' }],
        })}
        mode="preview"
      />,
    );
    expect(html).not.toContain("<b>Mallory</b>");
    expect(html).toContain("&lt;b&gt;Mallory&lt;/b&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("onerror=\"alert");
    // The sender's own message is rich text; a note is not: its asterisks stay asterisks.
    expect(html).toContain("**bold** *em*");
    expect(html).not.toMatch(/<a [^>]*evil\.example/);
  });

  it("stands with no notes at all, and with the most a gift can hold", () => {
    expect(renderToStaticMarkup(<Template data={hostile({ contributions: undefined })} mode="preview" />)).not.toContain('data-testid="contributions"');
    const full = Array.from({ length: 25 }, (_, i) => ({ key: `full${String(i).padStart(6, "0")}`, name: "W".repeat(24), note: "m".repeat(140) }));
    expect(renderToStaticMarkup(<Template data={hostile({ contributions: full })} mode="preview" />).match(/data-testid="contribution"/g)).toHaveLength(25);
  });

  it("carries no form, no report control and no link out of its own", () => {
    const html = renderToStaticMarkup(<Template data={demoData.en} mode="preview" />);
    expect(html).not.toMatch(/<form|<input|<textarea/);
    const section = html.slice(html.indexOf('data-testid="contributions"'), html.indexOf("</ol>"));
    expect(section).not.toMatch(/<a |<button/);
  });
});

function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
