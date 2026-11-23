import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AbstractIntlMessages } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { CLIENT_NAMESPACES, GROUP_WORDS, messagesForScope, type ClientScope } from "@/i18n/client-namespaces";
import { isCovered, mergeMessages, omitMessages, pickMessages } from "@/i18n/messages-subset";

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

  it("leaves out a branch or a single line, and a branch that is left empty goes with it", () => {
    expect(omitMessages(all, ["money.code", "games.lobby.start", "common.free"])).toEqual({ common: { premium: "Premium" }, money: { invite: all.money.invite } });
    expect(omitMessages(all, ["nope", "money.nope", "common.free.deeper"])).toEqual(all);
    // The catalogue it was given is not changed.
    expect(all.money.code).toEqual({ apply: "Apply" });
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
    for (const p of [...GROUP_WORDS.browser, ...GROUP_WORDS.server]) expect(has(p), `group words: ${p}`).toBe(true);
  });
});

/**
 * A group card's words are in no layout's share. The editor's and the account's namespaces are sent
 * whole, and while group cards were off that put "Group cards on {template} cost {price}…" and the
 * whole panel into the source of every editor, dashboard and account page.
 *
 * What counts as the product's words is two things. A line that names it ("group card", "tarjeta en
 * grupo"). And every key of the catalogue named for a group or a contribution, whatever its line
 * says: "Add at least {min} notes from your group" and "Send you the finished card?" name nothing,
 * and went out with every editor because of it.
 */
describe("a group card's words", () => {
  const NAMED = /group cards?|tarjetas? en grupo/i;
  const [EN, ES] = [en, es] as unknown as AbstractIntlMessages[];
  const catalogues = { en: EN, es: ES } as const;
  const listed: readonly string[] = [...GROUP_WORDS.browser, ...GROUP_WORDS.server];

  /** Every key named for a group or a contribution, as a dotted path; what is under one is not walked. */
  const KEYED = /group|contribution/i;
  function keyed(node: AbstractIntlMessages, prefix = ""): string[] {
    return Object.entries(node).flatMap(([key, value]) => {
      const here = prefix ? `${prefix}.${key}` : key;
      if (KEYED.test(key)) return [here];
      return typeof value === "object" ? keyed(value, here) : [];
    });
  }
  // The pricing page sorts its questions into groups of questions ("faqGroups", and each question's
  // own "group"): nothing to do with a group card.
  const OTHER_GROUPS = /^pricing\.(faqGroups|faq\.\d+\.group)$/;

  it("are sent by no layout or page, in either language: what each scope sends does not name the product", () => {
    for (const [lang, all] of Object.entries(catalogues)) {
      for (const scope of Object.keys(CLIENT_NAMESPACES) as ClientScope[]) {
        const sent = JSON.stringify(messagesForScope(all, scope));
        expect(sent, `${lang} ${scope}`).not.toMatch(NAMED);
        expect(sent, `${lang} ${scope}`).not.toMatch(/"(groupOn|groupEvery|signInBlurbGroup|priceLine)"/);
      }
    }
  });

  it("are every line of the catalogue that names the product, so a new one can't slip out with its namespace", () => {
    for (const [lang, all] of Object.entries(catalogues)) {
      const rest = JSON.stringify(omitMessages(all, listed));
      expect(rest, lang).not.toMatch(NAMED);
    }
  });

  it("are every key named for a group or a contribution, whether or not its line names the product", () => {
    for (const [lang, all] of Object.entries(catalogues)) {
      const found = keyed(all).filter((path) => !OTHER_GROUPS.test(path));
      expect(found.sort(), lang).toEqual([...listed].sort());
      // With them held back, no such key is left for a namespace to carry out.
      expect(keyed(omitMessages(all, listed)).filter((path) => !OTHER_GROUPS.test(path)), lang).toEqual([]);
    }
  });

  it("the send screen's lines about a group's notes and the confirming page's sentences go with no layout or page", () => {
    for (const [lang, all] of Object.entries(catalogues)) {
      for (const scope of Object.keys(CLIENT_NAMESPACES) as ClientScope[]) {
        const share = messagesForScope(all, scope) as { lifecycle?: Record<string, unknown> };
        const sent = JSON.stringify(share);
        expect(sent, `${lang} ${scope}`).not.toMatch(/"(contributionsMin|contributionsMax|contributionNote)"/);
        expect(share.lifecycle?.group, `${lang} ${scope}`).toBeUndefined();
        // Each of the lines themselves, in this language. One of the ten ("This link has expired.")
        // is also what a kept gift's expired link says, word for word, and that one still goes.
        const rest = JSON.stringify(omitMessages(all, listed));
        const lines = [...Object.values((all as unknown as typeof en).lifecycle.group), ...(["contributionsMin", "contributionsMax", "contributionNote"] as const).map((key) => (all as unknown as typeof en).editor.publishSheet.problems[key])];
        const own = lines.filter((line) => !rest.includes(JSON.stringify(line)));
        expect(own).toHaveLength(9);
        for (const line of own) expect(sent.includes(JSON.stringify(line)), `${lang} ${scope}: ${line}`).toBe(false);
      }
    }
    // The confirming page's sentences are the server's alone: the one provider that sends a group
    // card's words to a browser does not carry them.
    expect((pickMessages(EN, GROUP_WORDS.browser) as { lifecycle?: unknown }).lifecycle).toBeUndefined();
    expect(JSON.stringify(pickMessages(EN, GROUP_WORDS.browser))).not.toContain(JSON.stringify(en.lifecycle.group.confirmTitle));
    expect((pickMessages(EN, GROUP_WORDS.server) as unknown as typeof en).lifecycle.group).toEqual(en.lifecycle.group);
  });

  it("the rest of the editor's and the account's words still go: only those lines are held back", () => {
    const editor = messagesForScope(EN, "(editor)/layout") as unknown as typeof en;
    expect(editor.editor.publishSheet.signInTitle).toBe(en.editor.publishSheet.signInTitle);
    expect(Object.keys(editor.editor.publishSheet).length).toBe(Object.keys(en.editor.publishSheet).length - 1);
    // The checklist keeps every line but the three about a group's notes.
    expect(editor.editor.publishSheet.problems.photosMin).toBe(en.editor.publishSheet.problems.photosMin);
    expect(editor.editor.publishSheet.problems.fields).toEqual(en.editor.publishSheet.problems.fields);
    expect(Object.keys(editor.editor.publishSheet.problems).length).toBe(Object.keys(en.editor.publishSheet.problems).length - 3);
    expect(Object.keys(editor.editor.sections).length).toBe(Object.keys(en.editor.sections).length - 1);
    expect(Object.keys(editor.editor).length).toBe(Object.keys(en.editor).length - 1);
    expect(Object.keys(editor.money.product).length).toBe(Object.keys(en.money.product).length - 1);
    // The pages that confirm, stop and remove keep their words: only the group card's page goes.
    expect(Object.keys(editor.lifecycle).length).toBe(Object.keys(en.lifecycle).length - 1);
    const app = messagesForScope(EN, "(app)/layout") as unknown as typeof en;
    expect(Object.keys(app.account).length).toBe(Object.keys(en.account).length - 2);
    expect(Object.keys(app.lifecycle).length).toBe(Object.keys(en.lifecycle).length - 1);
    expect(app.lifecycle.unsubscribe).toEqual(en.lifecycle.unsubscribe);
  });

  it("go to the browser whole from the one provider that sends them", () => {
    const sent = pickMessages(EN, GROUP_WORDS.browser) as unknown as typeof en;
    expect(sent.editor.group).toEqual(en.editor.group);
    expect(sent.editor.sections.group).toEqual(en.editor.sections.group);
    const { contributionsMin, contributionsMax, contributionNote } = en.editor.publishSheet.problems;
    expect(sent.editor.publishSheet).toEqual({ signInBlurbGroup: en.editor.publishSheet.signInBlurbGroup, problems: { contributionsMin, contributionsMax, contributionNote } });
    expect(Object.keys(sent)).toEqual(["editor"]);
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

  // It reads every client component in the repo: on a machine busy with a dev server beside it, more than the default 5 s.
  it("covers every namespace a client component reads", { timeout: 30_000 }, () => {
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

  // No layout sends a group card's words (GROUP_WORDS), so "editor" above does not cover them: a
  // route whose components read them wraps what it renders in <GroupMessages>, or its panel would
  // show raw keys. And nothing in the browser may read the lines kept for the server.
  it("every route that can draw a group card's panel sends its words itself, and no other route does", () => {
    const under = (ns: string, paths: readonly string[]) => paths.some((p) => ns === p || ns.startsWith(`${p}.`));
    const draws: string[] = [];
    for (const file of files) {
      const namespaces = [...needs(file).keys()];
      expect(namespaces.filter((ns) => under(ns, GROUP_WORDS.server)), `${keyOf(file)} reads words kept for the server`).toEqual([]);
      const sends = /<GroupMessages\b/.test(read(file));
      const reads = namespaces.some((ns) => under(ns, GROUP_WORDS.browser));
      expect(sends, `${keyOf(file)}: ${reads ? "reads a group card's words and must wrap its panel in <GroupMessages>" : "sends a group card's words and reads none"}`).toBe(reads);
      if (reads) draws.push(keyOf(file));
    }
    expect(draws.sort()).toEqual(["(editor)/create/[templateSlug]/page", "(editor)/group-preview/panel/page", "(editor)/group-preview/pay/page"]);
    // The editor sends them only while group cards are on, and only with a template made for them.
    const editor = read(path.join(APP, "(editor)", "create", "[templateSlug]", "page.tsx"));
    expect(editor).toContain("{groupEnabled && manifest.features.group ? <GroupMessages locale={locale}>{shell}</GroupMessages> : shell}");
    expect(editor.match(/<GroupMessages\b/g)).toHaveLength(1);
  });
});
