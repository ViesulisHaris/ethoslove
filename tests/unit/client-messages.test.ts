import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { CLIENT_NAMESPACES } from "@/i18n/client-namespaces";
import { isCovered, mergeMessages, pickMessages } from "@/i18n/messages-subset";

describe("cutting the catalogue down", () => {
  const all = { common: { free: "Free", premium: "Premium" }, money: { code: { apply: "Apply" }, invite: { title: "Invite" } }, games: { lobby: { start: "Start" } } };

  it("keeps whole namespaces and dotted branches, in the catalogue's shape", () => {
    expect(pickMessages(all, ["common", "money.code"])).toEqual({ common: all.common, money: { code: all.money.code } });
  });

  it("skips a path the catalogue doesn't have", () => {
    expect(pickMessages(all, ["nope", "money.nope"])).toEqual({});
  });

  it("merges branches of one namespace sent from two places", () => {
    expect(pickMessages(all, ["money.code", "money.invite"])).toEqual({ money: all.money });
    expect(mergeMessages({ money: { code: all.money.code } }, { money: { invite: all.money.invite }, games: all.games })).toEqual({ money: all.money, games: all.games });
  });

  it("counts a namespace as covering its branches, not the other way round", () => {
    expect(isCovered("games.lobby", ["games"])).toBe(true);
    expect(isCovered("games", ["games"])).toBe(true);
    expect(isCovered("games", ["games.lobby"])).toBe(false);
    expect(isCovered("gamesx", ["games"])).toBe(false);
  });

  it("only names paths the catalogue has", () => {
    const has = (p: string) => p.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), en) !== undefined;
    for (const [scope, paths] of Object.entries(CLIENT_NAMESPACES)) for (const p of paths) expect(has(p), `${scope}: ${p}`).toBe(true);
  });
});

/**
 * Every client component gets the messages it reads. The route files send only parts of the
 * catalogue (src/i18n/client-namespaces.ts); a component that reads a namespace its route doesn't
 * send shows raw keys ("games.lobby.start") in production. This walks each route file's imports
 * the way the bundler would, collects what every component on the way reads, and checks that the
 * providers above it send it.
 */
describe("every route sends what its client components read", () => {
  const ROOT = fileURLToPath(new URL("../..", import.meta.url));
  const SRC = path.join(ROOT, "src");
  const APP = path.join(SRC, "app", "[currency]", "[locale]");
  const EXT = [".tsx", ".ts", ".jsx", ".js"];

  const isFile = (p: string) => existsSync(p) && statSync(p).isFile();
  const read = (p: string) => readFileSync(p, "utf8");

  function resolve(spec: string, from: string): string | null {
    let base: string;
    if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
    else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
    else return null;
    for (const c of [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, `index${e}`))]) if (isFile(c)) return c;
    return null;
  }

  function imports(src: string): string[] {
    const out: string[] = [];
    for (const m of src.matchAll(/\b(?:import|export)\s+(type\s+)?[^;]*?\bfrom\s*["']([^"']+)["']/g)) if (!m[1]) out.push(m[2]);
    for (const m of src.matchAll(/\bimport\s*["']([^"']+)["']/g)) out.push(m[1]);
    for (const m of src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
    return out;
  }

  /** The namespaces a file's `useTranslations` calls read; for a bare `useTranslations()`, the first key segment of each call. */
  function reads(src: string, file: string): string[] {
    const out = new Set<string>();
    for (const m of src.matchAll(/useTranslations\(([^)]*)\)/g)) {
      const arg = m[1].trim();
      if (!arg) continue;
      const literal = /^["'`]([^"'`$]*)["'`]$/.exec(arg);
      if (!literal) throw new Error(`${path.relative(ROOT, file)}: useTranslations(${arg}) can't be checked; pass a literal namespace`);
      out.add(literal[1]);
    }
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*\)/g)) {
      for (const k of src.matchAll(new RegExp(`\\b${m[1]}(?:\\.(?:rich|raw|has|markup))?\\(\\s*[\`"']([A-Za-z]+)[.\`"'$]`, "g"))) out.add(k[1]);
    }
    return [...out];
  }

  const graph = new Map<string, { deps: string[]; reads: string[] }>();
  function node(file: string) {
    let n = graph.get(file);
    if (!n) {
      const src = read(file);
      n = { deps: imports(src).flatMap((s) => resolve(s, file) ?? []), reads: reads(src, file) };
      graph.set(file, n);
    }
    return n;
  }

  /** Each namespace the route file's own tree reads, with a file that reads it. */
  function needs(entry: string): Map<string, string> {
    const out = new Map<string, string>();
    const seen = new Set<string>();
    const stack = [entry];
    while (stack.length) {
      const file = stack.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const n = node(file);
      for (const ns of n.reads) if (!out.has(ns)) out.set(ns, path.relative(ROOT, file));
      stack.push(...n.deps);
    }
    return out;
  }

  const scopes: Record<string, readonly string[]> = CLIENT_NAMESPACES;
  const keyOf = (file: string) => path.relative(APP, file).replace(/\.tsx?$/, "").split(path.sep).join("/");

  function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) return routeFiles(p);
      return /^(page|layout|error|not-found|loading|template)\.tsx$/.test(name) ? [p] : [];
    });
  }

  /** The layouts that wrap a route file, root first, then the file itself. */
  function chain(file: string): string[] {
    const rel = path.relative(APP, path.dirname(file));
    const dirs = rel ? rel.split(path.sep) : [];
    const layouts = [APP, ...dirs.map((_, i) => path.join(APP, ...dirs.slice(0, i + 1)))].map((d) => path.join(d, "layout.tsx")).filter(isFile);
    return layouts.includes(file) ? layouts.slice(0, layouts.indexOf(file) + 1) : [...layouts, file];
  }

  const files = routeFiles(APP);

  it("has a route file for every scope, and each sends its own", () => {
    for (const key of Object.keys(scopes)) {
      const file = path.join(APP, `${key}.tsx`);
      expect(isFile(file), `${key}.tsx`).toBe(true);
      const src = read(file);
      expect(key === "layout" ? src.includes("CLIENT_NAMESPACES.layout") : src.includes(`scope="${key}"`), `${key}.tsx sends its scope`).toBe(true);
    }
    for (const file of files) {
      for (const m of read(file).matchAll(/<ClientMessages\s+scope="([^"]+)"/g)) expect(m[1], path.relative(ROOT, file)).toBe(keyOf(file));
    }
  });

  it("covers every namespace a client component reads", () => {
    const missing: string[] = [];
    for (const file of files) {
      const sent: string[] = [];
      for (const step of chain(file)) {
        sent.push(...(scopes[keyOf(step)] ?? []));
        for (const [ns, reader] of needs(step)) {
          if (!isCovered(ns, sent)) missing.push(`${keyOf(file)}: "${ns}", read in ${reader}, rendered by ${keyOf(step)}; send it from there or a layout above (src/i18n/client-namespaces.ts)`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
