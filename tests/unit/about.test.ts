import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { ABOUT_ADDRESS, ABOUT_FOUNDED, ABOUT_PROFILES, aboutCopy } from "@/content/about";
import { LEGAL_DOCS, LEGAL_ENTITY } from "@/content/legal";

const text = (doc: { intro: string; sections: { heading: string; paragraphs: string[] }[] }) => [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join("\n");
const said = (locale: "en" | "es") => aboutCopy(locale, { templates: 61, single: "$11.99" });
const body = (locale: "en" | "es") => said(locale).sections.flatMap((s) => s.paragraphs).join("\n");

describe("the About page", () => {
  it("names the company exactly as the legal pages do, in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      const words = body(locale);
      for (const fact of [LEGAL_ENTITY.name, LEGAL_ENTITY.regNo, LEGAL_ENTITY.vat, LEGAL_ENTITY.email]) expect(words, `${locale}: ${fact}`).toContain(fact);
      expect(words, locale).toContain("$11.99");
      expect(words, locale).toContain("61");
      expect(said(locale).metaDescription, locale).toContain(LEGAL_ENTITY.name);
    }
    expect(said("en").registeredOn).toBe(LEGAL_ENTITY.registeredAt);
    expect(ABOUT_FOUNDED).toBe("2026-03-27");
    expect(new Date(`${ABOUT_FOUNDED}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })).toBe(LEGAL_ENTITY.registeredAt);
  });

  it("has the same sections in the same order in both languages", () => {
    expect(said("es").sections.map((s) => s.id)).toEqual(said("en").sections.map((s) => s.id));
    expect(said("es").sections.map((s) => s.paragraphs.length)).toEqual(said("en").sections.map((s) => s.paragraphs.length));
    expect(said("es").sections.map((s) => (s.links ?? []).map((l) => l.href))).toEqual(said("en").sections.map((s) => (s.links ?? []).map((l) => l.href)));
    // /contact lands on this section.
    expect(said("en").sections.map((s) => s.id)).toContain("contact");
  });

  it("promises only what the Terms and the Privacy Policy promise", () => {
    const terms = text(LEGAL_DOCS.terms.en);
    const privacy = text(LEGAL_DOCS.privacy.en);
    // The guarantee, the duplicate refund, the reply time, payments, deletion, photo metadata: each still said there.
    expect(terms).toContain("tell us within 30 days of buying and we'll refund you in full");
    expect(terms).toContain("We also refund a duplicate purchase");
    expect(terms).toContain("we aim to reply within 14 days");
    expect(terms).toContain("Payments are processed by Stripe; we never see or store your full card details.");
    expect(terms).toContain("backup copies expire within 30 days");
    expect(terms).toContain("With an unlock you can add a password");
    expect(privacy).toContain("Photos are resized and re-encoded on your device before upload, which removes their metadata");
    const about = body("en");
    expect(about).toContain("within 30 days of buying");
    expect(about).toContain("we never see or store your full card details");
    expect(about).toContain("backup copies expire within 30 days");
    expect(about).toContain("we aim to reply within 14 days");
  });

  it("gives the address in parts that add up to the registered one", () => {
    for (const part of [ABOUT_ADDRESS.streetAddress, ABOUT_ADDRESS.addressLocality, ABOUT_ADDRESS.addressRegion, ABOUT_ADDRESS.postalCode]) expect(LEGAL_ENTITY.address).toContain(part);
    expect(ABOUT_ADDRESS.addressCountry).toBe("LV");
    expect(LEGAL_ENTITY.address.endsWith(LEGAL_ENTITY.country)).toBe(true);
  });

  it("links only profiles the brand lists as its own", () => {
    const ours = Object.values(BRAND.socials) as string[];
    for (const profile of ABOUT_PROFILES) expect(ours, profile.name).toContain(profile.href);
    expect(ABOUT_PROFILES.map((p) => p.name)).toEqual(["Etsy", "Pinterest", "TikTok", "YouTube"]);
  });
});
