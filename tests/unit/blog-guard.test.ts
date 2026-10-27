import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { indexLineProblem, pathProblem, postProblem } from "../../scripts/blog-guard.mjs";

const POSTS_DIR = "src/content/blog/posts";
const posts = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".ts"));
const sample = readFileSync(`${POSTS_DIR}/${posts[0]}`, "utf8");

/**
 * The gate that lets the cloud routine publish with nobody watching: every real post passes it,
 * and the ways a post file could carry code instead of words don't.
 */
describe("blog guard", () => {
  it("passes every post that exists", () => {
    expect(posts.length).toBeGreaterThan(0);
    for (const f of posts) expect(postProblem(readFileSync(`${POSTS_DIR}/${f}`, "utf8")), f).toBeNull();
  });

  it("lets the blog's own files through and nothing else", () => {
    for (const ok of ["src/content/blog/posts/open-when-letter-ideas.ts", "src/content/blog/index.ts", "public/blog/open-when-letter-ideas/jar.webp", "docs/blog/queue.json", "docs/blog/reviews/open-when-letter-ideas.json"]) {
      expect(pathProblem(ok), ok).toBeNull();
    }
    for (const bad of ["src/app/layout.tsx", "src/content/blog/types.ts", "src/content/blog/text.ts", "package.json", ".github/workflows/publish-blog.yml", "scripts/blog-guard.mjs", "docs/blog/PLAYBOOK.md", "public/blog/x/run.js", "next.config.ts"]) {
      expect(pathProblem(bad), bad).not.toBeNull();
    }
  });

  it("refuses a post file that holds code", () => {
    const swap = (from: string, to: string) => {
      expect(sample.includes(from), `sample has ${from}`).toBe(true);
      return sample.replace(from, to);
    };
    const attempts = [
      swap('export const post: BlogPost = {', 'import { exec } from "node:child_process";\nexport const post: BlogPost = {'),
      swap('published: "', 'published: (() => "2026-01-01")() && "'),
      swap('published: "', 'published: `${process.env.X}` + "'),
      swap('published: "', 'published: globalThis.fetch && "'),
      swap('published: "', "published: '2026-01-01', x: \""),
      sample.replace(/};\s*$/, "};\nfetch(\"https://example.com\");\n"),
      swap('published: "', 'published: require("fs") && "'),
      swap('templates: [', 'templates: [...extra, '),
    ];
    for (const source of attempts) expect(postProblem(source)).not.toBeNull();
  });

  it("allows only the import and POSTS lines in the index", () => {
    expect(indexLineProblem('import { post as openWhenLetterIdeas } from "./posts/open-when-letter-ideas";')).toBeNull();
    expect(indexLineProblem("const POSTS: BlogPost[] = [openWhenLetterIdeas, longDistanceBirthdayIdeas, halloweenIdeasForCouples];")).toBeNull();
    expect(indexLineProblem('import { exec } from "node:child_process";')).not.toBeNull();
    expect(indexLineProblem("export const BLOG_POSTS = [];")).not.toBeNull();
    expect(indexLineProblem('const POSTS: BlogPost[] = [a, (await import("x")).post];')).not.toBeNull();
  });
});
