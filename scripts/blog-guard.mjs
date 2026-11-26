#!/usr/bin/env node
/**
 * The gate between the daily blog routine and the live site. The routine commits each post to the
 * public mirror's main; the live repository's "Publish blog" workflow runs this, from its own main,
 * before any of the mirror's new commits reach github.com/reasj2/ethoslove, which Vercel deploys.
 * Nobody reads a post before it goes out, and the routine reads the open web while it researches,
 * so this checks what the commits change, not what they say they change:
 *
 *   - only the blog's own files: src/content/blog/, public/blog/ and docs/blog/, and the ecard
 *     pages' own (src/content/ecards/pages/, their index, docs/ecards/), which a second routine
 *     writes (docs/ecards/PLAYBOOK.md) and which are held to the rules of a post and its index;
 *   - a post file is data and nothing else: one `import type { BlogPost }`, one
 *     `export const post: BlogPost = { … }` of plain strings, numbers, arrays and objects. No
 *     function, call, template string or other import can hide in it, since it runs at build time;
 *   - the post index changes only by an `import { post as … } from "./posts/…"` line and its
 *     `const POSTS` line;
 *   - a post never names Spain or a Spanish city (the owner's rule for the whole site; "Spanish", the
 *     language, is fine);
 *   - images are images, docs are Markdown or JSON;
 *   - every commit is the team's author, or Vercel won't deploy it.
 *
 * Usage: node scripts/blog-guard.mjs <base> <head>   (both git revisions; exits 1 on a problem)
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const TEAM_AUTHOR = "adulis2014@gmail.com";

/**
 * Nothing on the site names Spain or a Spanish city (the owner's rule; tests/unit/cities.test.ts holds the pages
 * to it). A post's example cities come from elsewhere: Lisbon for Europe (docs/blog/VOICE.md). "Spanish", the
 * language, is not on the list: posts rightly say "in English and Spanish". The list reaches past the capitals to the
 * regions, islands and cities a post about a trip would reach for (the code review of 25 Nov 2026, C23).
 */
export const SPAIN_WORDS =
  /\b(spain|españa|espana|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|majorca|ibiza|menorca|canarias|canary islands|tenerife|gran canaria|lanzarote|granada|toledo|zaragoza|salamanca|san sebasti[aá]n|donostia|pamplona|c[aá]diz|alicante|murcia|marbella|galicia|andaluc[ií]a|andalusia|catalu[ñn]a|catalonia|santiago de compostela)\b/i;

const POST_PATH = /^src\/content\/blog\/posts\/[a-z0-9-]+\.ts$/;
const INDEX_PATH = "src/content/blog/index.ts";
const IMAGE_PATH = /^public\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png|jpe?g)$/;
const DOC_PATH = /^docs\/(blog|ecards)\/[a-z0-9/_-]+\.(md|json)$/;
// An ecard page (src/content/ecards/types.ts), written by its own routine (docs/ecards/PLAYBOOK.md) and held to the
// rules of a post. Its address ends in "ecards", so the routine can't take the name of another page.
const ECARD_PATH = /^src\/content\/ecards\/pages\/[a-z0-9-]+-ecards\.ts$/;
const ECARD_INDEX_PATH = "src/content/ecards/index.ts";

/** Why a changed path may not go live, or null if it may. `deleted` paths are checked by name only. */
export function pathProblem(path) {
  if (POST_PATH.test(path) || path === INDEX_PATH || IMAGE_PATH.test(path) || DOC_PATH.test(path)) return null;
  if (ECARD_PATH.test(path) || path === ECARD_INDEX_PATH) return null;
  return `not a blog or ecard file: ${path}`;
}

/**
 * Why a post file isn't plain data, or null. Strings are blanked first, so words in the prose
 * ("new", "function") don't matter; what is left must be keys, punctuation, numbers and literals.
 */
export function postProblem(source) {
  return literalProblem(source, "post", "BlogPost");
}

/** The same for an ecard page: one `export const page: EcardPage = { … }` of plain data. */
export function ecardProblem(source) {
  return literalProblem(source, "page", "EcardPage");
}

function literalProblem(source, name, type) {
  const lines = source.replace(/\r\n/g, "\n").trim();
  const header = `import type { ${type} } from "../types";`;
  if (!lines.startsWith(header)) return `doesn't start with the ${type} type import`;
  const body = lines.slice(header.length).trim();
  const opening = `export const ${name}: ${type} = `;
  if (!body.startsWith(`${opening}{`) || !body.endsWith("};")) return `isn't a single \`${opening}{ … };\``;
  const literal = body.slice(opening.length, -1);
  // What the post says, read before the strings are blanked.
  for (const [text] of literal.matchAll(/"(?:[^"\\\n]|\\.)*"/g)) {
    const named = SPAIN_WORDS.exec(text);
    if (named) return `names Spain or a Spanish city: ${named[0]}`;
  }
  // Blank the strings. A post uses double quotes; anything else that quotes is suspect.
  const blanked = literal.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  if (/[`']/.test(blanked)) return "has a template string or a single-quoted string";
  const code = blanked
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\b[A-Za-z_][A-Za-z0-9_]*\s*:/g, ":")
    .replace(/""\s*:/g, ":")
    .replace(/\b(true|false|null)\b/g, "")
    .replace(/-?\b\d+(\.\d+)?\b/g, "");
  const left = code.replace(/[\s{}[\],:"]/g, "");
  return left ? `has code in it, not only data: ${JSON.stringify(left.slice(0, 40))}` : null;
}

/** Why a line added to or removed from the post index isn't allowed, or null. */
export function indexLineProblem(line) {
  if (/^import \{ post as [A-Za-z][A-Za-z0-9_]* \} from "\.\/posts\/[a-z0-9-]+";$/.test(line)) return null;
  if (/^const POSTS: BlogPost\[\] = \[[A-Za-z0-9_, ]*\];$/.test(line)) return null;
  return `index line not allowed: ${line}`;
}

/** The same for the ecard pages' index: the import of a page, and the list. */
export function ecardIndexLineProblem(line) {
  if (/^import \{ page as [A-Za-z][A-Za-z0-9_]* \} from "\.\/pages\/[a-z0-9-]+-ecards";$/.test(line)) return null;
  if (/^const PAGES: EcardPage\[\] = \[[A-Za-z0-9_, ]*\];$/.test(line)) return null;
  return `ecard index line not allowed: ${line}`;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Every problem with what `head` changes since `base`, as lines; empty when it may go live. */
export function check(base, head) {
  const problems = [];
  const changes = git("diff", "--name-status", "--no-renames", base, head).split("\n").filter(Boolean);
  if (changes.length === 0) problems.push("the branch changes nothing");
  for (const change of changes) {
    const [status, path] = change.split("\t");
    const problem = pathProblem(path);
    if (problem) {
      problems.push(problem);
      continue;
    }
    if (status === "D") {
      if (POST_PATH.test(path) || path === INDEX_PATH || ECARD_PATH.test(path) || path === ECARD_INDEX_PATH) problems.push(`deletes ${path}`);
      continue;
    }
    if (POST_PATH.test(path)) {
      const problem = postProblem(git("show", `${head}:${path}`));
      if (problem) problems.push(`${path} ${problem}`);
    }
    if (ECARD_PATH.test(path)) {
      const problem = ecardProblem(git("show", `${head}:${path}`));
      if (problem) problems.push(`${path} ${problem}`);
    }
    if (path === INDEX_PATH || path === ECARD_INDEX_PATH) {
      const diff = git("diff", "--unified=0", base, head, "--", path).split("\n");
      for (const line of diff) {
        if (!/^[+-]/.test(line) || /^(\+\+\+|---) /.test(line)) continue;
        const problem = (path === INDEX_PATH ? indexLineProblem : ecardIndexLineProblem)(line.slice(1).replace(/\r$/, ""));
        if (problem) problems.push(problem);
      }
    }
  }
  const authors = [...new Set(git("log", "--format=%ae", `${base}..${head}`).split("\n").filter(Boolean))];
  for (const a of authors) if (a !== TEAM_AUTHOR) problems.push(`a commit is authored by ${a}, not ${TEAM_AUTHOR}`);
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error("usage: node scripts/blog-guard.mjs <base> <head>");
    process.exit(2);
  }
  const problems = check(base, head);
  for (const p of problems) console.error(`✗ ${p}`);
  console.log(problems.length ? `${problems.length} problem(s): not publishing.` : "Only blog files, plain data, the team's author: fine to publish.");
  process.exit(problems.length ? 1 : 0);
}
