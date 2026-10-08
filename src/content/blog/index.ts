import type { GiftLocale } from "@/lib/gift/schema";
import type { BlogContent, BlogPost } from "./types";
import { post as longDistanceBirthdayIdeas } from "./posts/long-distance-birthday-ideas-for-boyfriend";

/**
 * Every post on /blog. A new post is one file in ./posts and one entry here; the list is sorted
 * newest first below, so the order here doesn't matter. docs/blog/PLAYBOOK.md is how they're written.
 */
const POSTS: BlogPost[] = [longDistanceBirthdayIdeas];

export const BLOG_POSTS: readonly BlogPost[] = [...POSTS].sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));

export function getPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

/** The languages a post has been written in. */
export function postLocales(post: BlogPost): GiftLocale[] {
  return post.content.es ? ["en", "es"] : ["en"];
}

/** The post in a language, or in English when it hasn't been translated yet. */
export function postContent(post: BlogPost, locale: string): { content: BlogContent; locale: GiftLocale; translated: boolean } {
  if (locale === "es" && post.content.es) return { content: post.content.es, locale: "es", translated: true };
  return { content: post.content.en, locale: "en", translated: locale === "en" };
}

/** The date a post last changed. */
export function postModified(post: BlogPost): string {
  return post.updated ?? post.published;
}

/**
 * What to read next: posts for the same occasion, then posts that recommend the same templates,
 * then the newest. Never the post itself.
 */
export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const score = (other: BlogPost) =>
    (post.occasion && other.occasion === post.occasion ? 2 : 0) + (other.templates.some((t) => post.templates.includes(t)) ? 1 : 0);
  return BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map(({ p }) => p);
}
