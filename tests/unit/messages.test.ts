import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" ? flatten(value as Record<string, unknown>, path) : [path];
  });
}

describe("message catalogues", () => {
  it("en and es expose exactly the same keys", () => {
    const enKeys = flatten(en).sort();
    const esKeys = flatten(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("interpolation variables match between locales", () => {
    const vars = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path = "") => {
      for (const key of Object.keys(a)) {
        const va = a[key];
        const vb = b[key];
        if (typeof va === "string" && typeof vb === "string") {
          expect(vars(vb), `${path}${key}`).toEqual(vars(va));
        } else if (va && typeof va === "object") {
          walk(va as Record<string, unknown>, (vb ?? {}) as Record<string, unknown>, `${path}${key}.`);
        }
      }
    };
    walk(en, es);
  });
});

/**
 * Every key the code asks for by name is in the catalogue. Both catalogues can agree and still lack
 * one: the blog's whole `blog` namespace was lost in a merge (Oct 2026), the key-parity test above
 * passed, and only the build's MISSING_MESSAGE errors showed it. A call is read in the namespace of
 * the nearest translator of that name declared above it; keys built at run time aren't checked.
 */
describe("every literal key the code reads exists", () => {
  const SRC = fileURLToPath(new URL("../../src", import.meta.url));
  const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f));
  const NS = String.raw`(?:useTranslations|getTranslations)\(\s*(?:"([^"]*)"|\{[^}]*?namespace:\s*"([^"]*)"[^}]*\}|(\{[^}]*\})|())\s*\)`;
  const namespaceOf = (m: RegExpMatchArray, i: number) => m[i] ?? m[i + 1] ?? (m[i + 2]?.includes("namespace") ? null : "");
  const inCatalogue = (key: string) => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), en) !== undefined;

  function translators(src: string) {
    const out: { at: number; name: string; ns: string | null }[] = [];
    for (const m of src.matchAll(new RegExp(String.raw`const\s+(\w+)\s*=\s*(?:await\s+)?` + NS, "g"))) out.push({ at: m.index, name: m[1], ns: namespaceOf(m, 2) });
    // const [t, tl] = await Promise.all([getTranslations(...), getTranslations(...)])
    for (const m of src.matchAll(/const\s+\[([\w\s,]+)\]\s*=\s*await\s+Promise\.all\(\[([\s\S]*?)\]\)/g)) {
      const names = m[1].split(",").map((s) => s.trim());
      const inner = [...m[2].matchAll(new RegExp(NS, "g"))];
      if (inner.length === names.length) inner.forEach((h, i) => out.push({ at: m.index, name: names[i], ns: namespaceOf(h, 1) }));
    }
    return out.sort((a, b) => a.at - b.at);
  }

  it("finds the translators it checks", () => {
    expect(files.filter((f) => translators(readFileSync(path.join(SRC, f), "utf8")).length).length).toBeGreaterThan(100);
  });

  it("has every one of them", () => {
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(path.join(SRC, file), "utf8");
      const ts = translators(src);
      for (const name of new Set(ts.map((t) => t.name))) {
        for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])${name}(?:\.rich|\.markup|\.raw)?\(\s*"([^"]+)"`, "g"))) {
          const ns = ts.filter((t) => t.name === name && t.at < m.index!).pop()?.ns;
          if (ns == null) continue;
          const key = ns ? `${ns}.${m[1]}` : m[1];
          if (!inCatalogue(key)) missing.push(`${file}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
