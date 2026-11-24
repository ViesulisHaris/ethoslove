import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";

/** The first fix round on the preview (docs/marketing/growth-build/reports/view-fix-1-brief.md). */

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

describe("choose-7: the English site copy is American, as “mom” is", () => {
  // The four words the walk met: "Mums keep everything" under "Digital gifts for Mom", "Her favourite flowers", "colours", "cosy".
  const british = (text: string) => /\b(mums?|favourites?|colours?|watercolours?|cosy)\b/i.test(text);

  /** Every string value of a messages file, with where it is. */
  function values(node: unknown, at = ""): [string, string][] {
    if (typeof node === "string") return [[at, node]];
    if (node && typeof node === "object") return Object.entries(node).flatMap(([key, value]) => values(value, at ? `${at}.${key}` : key));
    return [];
  }

  it("in messages/en.json", () => {
    expect(values(en).filter(([, text]) => british(text))).toEqual([]);
  });

  it("in src/content (not the blog's posts) and in the manifests' English tagline and description", () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!full.replace(/\\/g, "/").endsWith("src/content/blog/posts")) walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        // String literals only: a comment may say "colour" without a reader ever seeing it.
        const strings = fs.readFileSync(full, "utf8").match(/"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g) ?? [];
        for (const text of strings) if (british(text)) found.push(`${path.relative(process.cwd(), full)}: ${text.slice(0, 80)}`);
      }
    };
    walk(path.join(process.cwd(), "src/content"));
    for (const m of TEMPLATE_MANIFESTS) for (const text of [m.tagline.en, m.description.en]) if (british(text)) found.push(`${m.slug}: ${text.slice(0, 80)}`);
    expect(found).toEqual([]);
  });
});

describe("agreed-4: the front page says less", () => {
  const sites = { en, es } as const;
  for (const locale of ["en", "es"] as const) {
    const p = sites[locale].platform;
    it(`each door is its title and a line of at most eight words (${locale})`, () => {
      for (const door of ["dates", "gifts", "ldr", "games"] as const) {
        expect(words(p.doors[door].blurb), `${locale} ${door}`).toBeLessThanOrEqual(8);
        expect(p.doors[door].title.length).toBeGreaterThan(0);
      }
    });
    it(`the dates, long-distance and games bands each keep one line of at most sixteen words (${locale})`, () => {
      for (const band of [p.ideas.blurb, p.ldr.blurb, p.games.blurb]) expect(words(band), band).toBeLessThanOrEqual(16);
    });
  }
});

describe("agreed-3 and front-10: what the front page and the creators card say", () => {
  // Since gifts2 (rule 3, 300 words a page) the closing is its heading and two buttons: the line under it went.
  it("the front page ends on a gift", () => {
    expect(en.platform.closing).toEqual({ title: "Make them something they will keep.", gifts: "Make a gift", dates: "Find a date" });
    expect(es.platform.closing).toMatchObject({ title: "Hazle algo que vaya a guardar." });
    expect(es.platform.closing).not.toHaveProperty("blurb");
  });

  it("€20 is the payout's floor, not a monthly payment", () => {
    expect(en.growth.creators.ticket.paid).toBe("minimum payout, paid monthly");
    expect(es.growth.creators.ticket.paid).toBe("pago mínimo, cada mes");
  });

  it("the date ideas' heading is not a calque", () => {
    expect(es.platform.ideas.title).toBe("Una noche con plan.");
  });
});
