import type { Occasion } from "@/config/occasions";

/**
 * Text inside a post: plain sentences with three marks and nothing else, so a post can never carry
 * HTML. `[label](/templates/the-letter)` is a link (a site path goes through the locale-aware Link,
 * an https URL opens in a new tab), `**bold**` and `*italic*`. See ./text.ts.
 */
export type RichText = string;

export type BlogBlock =
  | { type: "p"; text: RichText }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; ordered?: boolean; items: RichText[] }
  /** A line to borrow: a sample message, a card, a caption. */
  | { type: "quote"; text: RichText; cite?: string }
  | { type: "tip"; title: string; text: RichText }
  /** A template card: its poster, why it fits this post, and the way into the editor. */
  | { type: "template"; slug: string; note: RichText }
  /** A file under public/blog/<post slug>/, with its real pixel size. */
  | { type: "image"; src: string; alt: string; width: number; height: number; caption?: string }
  | { type: "table"; head: string[]; rows: RichText[][] };

export type BlogContent = {
  /** The H1 and the <title>, before " · Ethos". Short enough not to be cut off in results. */
  title: string;
  /** The meta description and the card text on /blog. */
  description: string;
  /** The search this post answers. No two posts answer the same one. */
  keyword: string;
  /** The first paragraph: answers the search in its first two sentences. */
  lead: RichText;
  /** Three to five lines in the "Key takeaways" box under the header. */
  takeaways: RichText[];
  body: BlogBlock[];
  faq: { q: string; a: RichText }[];
};

export type BlogPost = {
  /** Lowercase words and hyphens. No dots: a path with a dot skips the proxy and 404s. */
  slug: string;
  /** YYYY-MM-DD, the day it went live. */
  published: string;
  /** YYYY-MM-DD, the last change worth telling a reader about. */
  updated?: string;
  /** The occasion page this post sits under. */
  occasion?: Occasion;
  /** Templates the post recommends, best fit first. The first one is the header image and share card. */
  templates: string[];
  /** English always; Spanish when the post has been written in Spanish too. */
  content: { en: BlogContent; es?: BlogContent };
};
