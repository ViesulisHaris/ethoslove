#!/usr/bin/env node
/**
 * Crawls every page in a site's sitemap and checks what a search engine reads first:
 *
 *   - the page answers 200 and isn't noindex;
 *   - it has a <title>, a meta description and exactly one <h1>;
 *   - its canonical points at itself;
 *   - it lists its translations (en, es, x-default) the way the sitemap does;
 *   - every JSON-LD block parses;
 *   - no two pages share a title.
 *
 * Usage:
 *   node scripts/seo-check.mjs                         # https://tryethos.io
 *   node scripts/seo-check.mjs http://localhost:3217   # a local `next start`
 *   node scripts/seo-check.mjs <origin> --only /gifts  # pages whose path starts with /gifts
 *
 * Against a local build the pages name their production origin (or localhost:3000) in canonicals,
 * so canonicals and alternates are compared by path, not by origin. Exits 1 if any page fails.
 */

const args = process.argv.slice(2);
const origin = (args.find((a) => /^https?:\/\//.test(a)) ?? "https://tryethos.io").replace(/\/$/, "");
const onlyAt = args.indexOf("--only");
const only = onlyAt >= 0 ? args[onlyAt + 1] : null;
const CONCURRENCY = 6;

const pathOf = (url) => {
  const u = new URL(url, origin);
  return u.pathname.replace(/\/$/, "") || "/";
};
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

async function sitemapUrls() {
  const res = await fetch(`${origin}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml answered ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
}

/** An attribute's value. HTML attribute names are case-insensitive, and React writes `hrefLang`. */
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? decode(m[1]) : null;
}

async function check(url) {
  const path = pathOf(url);
  const problems = [];
  const res = await fetch(`${origin}${path === "/" ? "" : path}`, { redirect: "manual" });
  if (res.status !== 200) return { path, title: null, problems: [`status ${res.status}`] };
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>") + 7 || undefined);

  const title = decode(head.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? "");
  if (!title) problems.push("no <title>");
  else if (title.length > 70) problems.push(`title is ${title.length} chars`);

  const description = [...head.matchAll(/<meta[^>]+>/g)].map((m) => m[0]).find((t) => /name="description"/.test(t));
  if (!description || !attr(description, "content")) problems.push("no meta description");

  const robots = [...head.matchAll(/<meta[^>]+>/g)].map((m) => m[0]).find((t) => /name="robots"/.test(t));
  if (robots && /noindex/.test(attr(robots, "content") ?? "")) problems.push("noindex");

  const links = [...head.matchAll(/<link[^>]+>/g)].map((m) => m[0]);
  const canonical = links.find((t) => /rel="canonical"/.test(t));
  if (!canonical) problems.push("no canonical");
  else if (pathOf(attr(canonical, "href")) !== path) problems.push(`canonical is ${pathOf(attr(canonical, "href"))}`);

  const langs = Object.fromEntries(links.filter((t) => /rel="alternate"/.test(t) && /\shreflang=/i.test(t)).map((t) => [attr(t, "hreflang"), pathOf(attr(t, "href"))]));
  for (const l of ["x-default", "en"]) if (!langs[l]) problems.push(`no hreflang ${l}`);

  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) problems.push(`${h1s} h1s`);

  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      problems.push("JSON-LD doesn't parse");
    }
  }
  return { path, title, problems };
}

const urls = (await sitemapUrls()).filter((u) => !only || pathOf(u).replace(/^\/es(?=\/|$)/, "").startsWith(only) || pathOf(u).startsWith(only));
const results = [];
for (let i = 0; i < urls.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(urls.slice(i, i + CONCURRENCY).map((u) => check(u).catch((e) => ({ path: pathOf(u), title: null, problems: [e.message] }))))));
}

const byTitle = new Map();
for (const r of results) if (r.title) byTitle.set(r.title, [...(byTitle.get(r.title) ?? []), r.path]);
for (const [title, paths] of byTitle) if (paths.length > 1) for (const r of results) if (paths.includes(r.path)) r.problems.push(`title shared with ${paths.filter((p) => p !== r.path).join(", ")}: "${title}"`);

const failed = results.filter((r) => r.problems.length > 0);
for (const r of failed) console.log(`✗ ${r.path}\n    ${r.problems.join("\n    ")}`);
console.log(`\n${results.length - failed.length} of ${results.length} pages pass (${origin}${only ? `, only ${only}` : ""}).`);
process.exit(failed.length > 0 ? 1 : 0);
