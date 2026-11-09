import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A gift says it was seen to its end when its end screen scrolls into view, through an
 * IntersectionObserver set up in an effect. Most end screens only appear once the message has
 * typed out (`{done ? <div ref={endRef}>…`), so an effect that doesn't re-run on `done` finds
 * nothing when it first runs and never watches again: until 9 Nov 2026 eleven templates (Arcade,
 * Birthday Cinema, Bloom, Constellations, Fortune Cookie, Jar of Reasons, Midnight Countdown,
 * Museum, Our Timeline, Passport, Vinyl) never told the gift page a typed message had been read
 * to the end, so a view never reached 100%.
 */
const ROOT = "src/templates";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith(".tsx") ? [join(dir, e.name)] : []));
}

/** Watchers whose element sits behind a condition the effect doesn't depend on. */
function blindWatchers(file: string): string[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/useEffect\(\(\) => \{/.test(lines[i])) continue;
    let j = i;
    const body: string[] = [];
    for (; j < lines.length && j < i + 40; j++) {
      body.push(lines[j]);
      if (/^\s*\}, \[.*\]\);/.test(lines[j])) break;
    }
    const text = body.join("\n");
    const watched = /IntersectionObserver/.test(text) ? /const el = ([a-zA-Z]+)\.current/.exec(text)?.[1] : undefined;
    if (!watched) continue;
    const deps = (/\}, \[(.*)\]\);/.exec(lines[j])?.[1] ?? "").split(/,\s*/);
    const at = lines.findIndex((l) => l.includes(`ref={${watched}}`));
    if (at < 0) continue;
    const before = [lines[at - 2] ?? "", lines[at - 1] ?? "", lines[at]].join(" ");
    const gate = [...before.matchAll(/\{\s*([a-zA-Z.!&| ]+?)\s*\?\s*(\(|<)/g)].map((c) => c[1].trim()).at(-1);
    if (!gate) continue;
    const missing = gate.split(/[^a-zA-Z.]+/).filter((v) => v && !/^(data|mode)$/.test(v) && !deps.includes(v));
    if (missing.length) found.push(`${relative(ROOT, file).split(sep).join("/")}:${j + 1} watches ${watched}, shown when ${gate}, without re-running on ${missing.join(", ")}`);
  }
  return found;
}

describe("templates' end-of-gift watchers", () => {
  it("re-run once their end screen exists, so every gift can say it was seen to the end", () => {
    expect(tsxFiles(ROOT).flatMap(blindWatchers)).toEqual([]);
  });

  it("catch the pattern itself: a watcher on a `done`-gated end screen that only re-runs on onEvent", () => {
    const blind = [
      "  useEffect(() => {",
      "    const el = endRef.current;",
      "    if (!el) return;",
      "    const io = new IntersectionObserver(() => onEvent?.({ type: \"ended\" }));",
      "    io.observe(el);",
      "    return () => io.disconnect();",
      "  }, [onEvent]);",
      "  return (",
      "    <div>",
      "      {done ? <div ref={endRef}><EndScreen /></div> : null}",
      "    </div>",
      "  );",
    ];
    const dir = mkdtempSync(join(tmpdir(), "end-watchers-"));
    writeFileSync(join(dir, "Blind.tsx"), blind.join("\n"));
    writeFileSync(join(dir, "Fixed.tsx"), blind.join("\n").replace("}, [onEvent]);", "}, [onEvent, done]);"));
    expect(blindWatchers(join(dir, "Blind.tsx"))).toHaveLength(1);
    expect(blindWatchers(join(dir, "Fixed.tsx"))).toEqual([]);
  });
});
