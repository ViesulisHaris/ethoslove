import { describe, expect, it } from "vitest";
import { createGiftSchema, GIFT_LOCALES } from "@/lib/gift/schema";
import { parseRichText, richTextLength } from "@/lib/gift/rich-text";
import { OCCASIONS } from "@/config/occasions";
import { TEMPLATE_MANIFESTS, TEMPLATE_SLUGS, getManifest, listManifests, loadTemplate } from "@/templates/registry";

describe("template registry", () => {
  it("has unique slugs and a loader per manifest", () => {
    expect(new Set(TEMPLATE_SLUGS).size).toBe(TEMPLATE_SLUGS.length);
    for (const m of TEMPLATE_MANIFESTS) expect(getManifest(m.slug)).toBe(m);
  });

  it("ships exactly two free templates", () => {
    expect(listManifests({ tier: "free" }).map((m) => m.slug).sort()).toEqual(["constellations", "the-letter"]);
  });

  it("filters by occasion", () => {
    expect(listManifests({ occasion: "anniversary" }).length).toBeGreaterThan(0);
  });

  // An occasion tag says "this template suits it", not "this could be stretched to cover it".
  // Tag loosely and every occasion page becomes the whole catalogue reshuffled, which is what
  // these guard against.
  it("no template claims more than five occasions", () => {
    const greedy = TEMPLATE_MANIFESTS.filter((m) => m.occasions.length > 5).map(
      (m) => `${m.slug} (${m.occasions.length}: ${m.occasions.join(", ")})`,
    );
    expect(greedy, `tag only where you would actively recommend it:\n  ${greedy.join("\n  ")}`).toEqual([]);
  });

  it("an occasion page leads with the templates built for it", () => {
    // Position in a manifest's own list is the fit signal, so a page must never open on a
    // template that ranks the occasion lower than one further down the page.
    for (const occasion of OCCASIONS) {
      const ranks = listManifests({ occasion }).map((m) => m.occasions.indexOf(occasion));
      expect([...ranks].sort((a, b) => a - b), `${occasion} is out of fit order`).toEqual(ranks);
    }
  });

  it("every occasion has at least one template, so no occasion page is empty", () => {
    const empty = OCCASIONS.filter((o) => listManifests({ occasion: o }).length === 0);
    expect(empty, `these occasion pages would render nothing: ${empty.join(", ")}`).toEqual([]);
  });

  for (const slug of TEMPLATE_SLUGS) {
    it(`${slug}: demo data validates against its schema in every locale`, async () => {
      const mod = await loadTemplate(slug);
      expect(mod).not.toBeNull();
      const schema = createGiftSchema(mod!.fieldsSchema);
      for (const locale of GIFT_LOCALES) {
        const demo = mod!.demoData[locale];
        const result = schema.safeParse(demo);
        expect(result.success, JSON.stringify(result.success ? null : result.error.issues)).toBe(true);
        expect(demo.locale).toBe(locale);
        expect(demo.templateSlug).toBe(slug);
        expect(demo.photos.length).toBeGreaterThanOrEqual(mod!.manifest.features.photos.min);
        expect(demo.photos.length).toBeLessThanOrEqual(mod!.manifest.features.photos.max);
      }
    });
  }

  it("returns null for unknown templates", async () => {
    expect(await loadTemplate("nope")).toBeNull();
  });
});

describe("rich text", () => {
  it("parses bold, italic, breaks and paragraphs", () => {
    const blocks = parseRichText("Hi **there**,\nhow are *you*?\n\nSecond.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual([
      { text: "Hi " },
      { text: "there", bold: true },
      { text: "," },
      { text: "", br: true },
      { text: "how are " },
      { text: "you", italic: true },
      { text: "?" },
    ]);
    expect(richTextLength(blocks)).toBe("Hi there,".length + 1 + "how are you?".length + "Second.".length);
  });

  it("never emits html", () => {
    const blocks = parseRichText("<script>alert(1)</script> **x**");
    expect(blocks[0][0].text).toBe("<script>alert(1)</script> ");
  });
});

describe("gift schema", () => {
  it("applies defaults and rejects bad colours", async () => {
    const mod = await loadTemplate("the-letter");
    const schema = createGiftSchema(mod!.fieldsSchema);
    const ok = schema.parse({ templateSlug: "the-letter", recipientName: "A", senderName: "B", fields: {} });
    expect(ok.locale).toBe("en");
    expect(ok.accentColor).toBe("#E8604C");
    expect(ok.fields.paper).toBe("cream");
    expect(schema.safeParse({ ...ok, accentColor: "red" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, recipientName: "" }).success).toBe(false);
  });
});
