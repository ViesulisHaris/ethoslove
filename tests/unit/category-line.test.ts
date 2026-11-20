import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { briefIntro } from "@/lib/llms/brief";
import { organizationNode } from "@/lib/seo";

/**
 * "Digital cards by Tryethos": the owner's category line (20 Nov 2026), set like a maker's mark in a
 * few chosen places. It is written once, in config/brand.ts, and read from there.
 */
describe("the category line", () => {
  it("is the owner's words, in both languages", () => {
    expect(BRAND.categoryLine).toEqual({ en: "Digital cards by Tryethos", es: "Tarjetas digitales de Tryethos" });
  });

  it("is written in one file only: every place that shows it reads the constant", () => {
    const root = path.join(__dirname, "../..");
    const files = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(path.join(dir, entry.name)) : /\.(tsx?|json)$/.test(entry.name) ? [path.join(dir, entry.name)] : []));
    const holding = [...files(path.join(root, "src")), ...files(path.join(root, "messages"))]
      .filter((file) => /Digital cards by Tryethos|Tarjetas digitales de Tryethos/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file).replaceAll("\\", "/"));
    expect(holding).toEqual(["src/config/brand.ts"]);
  });

  it("never says “digital gift card”, which is a voucher", () => {
    expect(JSON.stringify(BRAND.categoryLine)).not.toMatch(/gift card/i);
  });

  it("is the Organization's slogan for search engines, which also learn the name Tryethos", () => {
    const org = organizationNode();
    expect(org.slogan).toBe("Digital cards by Tryethos");
    expect(org.alternateName).toEqual([BRAND.legalName, "Tryethos"]);
    expect(org.name).toBe("Ethos");
  });

  it("opens the summary that /llms.txt and the help chat start from", () => {
    const [title, blank, summary] = briefIntro();
    expect(title).toBe("# Ethos");
    expect(blank).toBe("");
    expect(summary.startsWith("> Digital cards by Tryethos. Ethos (tryethos.io) is for couples")).toBe(true);
  });
});
