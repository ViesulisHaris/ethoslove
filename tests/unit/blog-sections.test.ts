import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/content/blog";
import { postSections } from "@/content/blog/text";
import type { BlogBlock } from "@/content/blog/types";

const h2 = (text: string): BlogBlock => ({ type: "h2", text });
const p = (text: string): BlogBlock => ({ type: "p", text });

describe("a post's sections, for its jump list", () => {
  it("gives every h2 an id made of its words, and nothing else one", () => {
    const sections = postSections([p("Intro"), h2("What a monthiversary is"), p("…"), h2("12 ideas for the first year")]);
    expect(sections).toEqual([
      { index: 1, id: "what-a-monthiversary-is", text: "What a monthiversary is" },
      { index: 3, id: "12-ideas-for-the-first-year", text: "12 ideas for the first year" },
    ]);
  });

  it("drops accents and marks, so Spanish headings make plain ids", () => {
    const [section] = postSections([h2("Qué escribir en la **tarjeta** de aniversario")]);
    expect(section?.id).toBe("que-escribir-en-la-tarjeta-de-aniversario");
    expect(section?.text).toBe("Qué escribir en la tarjeta de aniversario");
  });

  it("never repeats an id or takes one the page uses", () => {
    const ids = postSections([h2("FAQ"), h2("Ideas"), h2("Ideas"), h2("Contents")]).map((s) => s.id);
    expect(ids).toEqual(["faq-section", "ideas", "ideas-2", "contents-section"]);
  });

  it("finds unique ids in every published post, in both languages", () => {
    for (const post of BLOG_POSTS) {
      for (const [lang, content] of Object.entries(post.content)) {
        if (!content) continue;
        const ids = postSections(content.body).map((s) => s.id);
        expect(new Set(ids).size, `${post.slug} (${lang}) repeats a section id`).toBe(ids.length);
        for (const id of ids) expect(id, `${post.slug} (${lang})`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });
});
