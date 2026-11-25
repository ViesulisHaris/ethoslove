import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { briefFaq, briefTemplatePrice } from "@/lib/llms/brief";
import { getManifest } from "@/templates/manifests";

/**
 * What the site says is free, outside /pricing (reports/seoaudit-audit.md, B1 and B2): /llms.txt, the
 * help chat's guide and the /gifts questions follow `sendsFree` and the free note's answer, with the
 * free note on (the live setting) and off.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

const freeAnswer = en.pricing.faq.find((f) => f.id === "free")!.a;

describe("the brief's free answer (/llms.txt, the help chat)", () => {
  it("with the free note on, answers with the note and names no second free template", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const text = briefFaq().join("\n");
    expect(text).toContain(en.pricing.faqFreeNote);
    expect(text).not.toContain(freeAnswer);
    expect(text).not.toMatch(/two full templates/i);
  });

  it("with the free note off, keeps the answer with both free templates", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    const text = briefFaq().join("\n");
    expect(text).toContain(freeAnswer);
    expect(text).not.toContain(en.pricing.faqFreeNote);
  });
});

describe("a template's price line in /llms.txt", () => {
  it("calls Constellations free only while it can be sent free", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    expect(briefTemplatePrice(getManifest("constellations")!)).not.toMatch(/free/i);
    expect(briefTemplatePrice(getManifest("the-letter")!)).toMatch(/^Free as a short note/);
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    expect(briefTemplatePrice(getManifest("constellations")!)).toBe("Free.");
    expect(briefTemplatePrice(getManifest("the-letter")!)).toBe("Free.");
    expect(briefTemplatePrice(getManifest("bouquet")!)).toBe("Premium.");
  });

  it("is what the served /llms.txt prints, with the free note on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const { GET } = await import("@/app/llms.txt/route");
    const text = await GET().text();
    const line = text.split("\n").find((l) => l.startsWith("- [Constellations]"))!;
    expect(line).toBeTruthy();
    expect(line).not.toMatch(/Free\./);
    expect(line).toContain('Paid once ("Make it special"');
  });
});
