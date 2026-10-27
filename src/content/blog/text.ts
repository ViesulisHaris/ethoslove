import type { BlogBlock, BlogContent, RichText } from "./types";

/** `[label](href)`, `**bold**`, `*italic*`: the only marks a post's text may use. */
export const RICH_TEXT_TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/** The text with its marks taken off, for meta tags, JSON-LD and word counts. */
export function plainText(text: RichText): string {
  return text.replace(RICH_TEXT_TOKEN, (_whole, label: string | undefined, _href, bold: string | undefined, italic: string | undefined) => label ?? bold ?? italic ?? "");
}

/** Every href linked from a piece of text. */
export function linksIn(text: RichText): string[] {
  return [...text.matchAll(RICH_TEXT_TOKEN)].flatMap((m) => (m[2] ? [m[2]] : []));
}

/** Every piece of reader-facing text in a block, marks included. */
export function blockTexts(block: BlogBlock): RichText[] {
  switch (block.type) {
    case "p":
    case "h2":
    case "h3":
      return [block.text];
    case "list":
      return block.items;
    case "quote":
      return block.cite ? [block.text, block.cite] : [block.text];
    case "tip":
      return [block.title, block.text];
    case "template":
      return [block.note];
    case "image":
      return block.caption ? [block.alt, block.caption] : [block.alt];
    case "table":
      return [...block.head, ...block.rows.flat()];
  }
}

/** All of a post's text in reading order: lead, takeaways, body, FAQ. */
export function contentTexts(content: BlogContent): RichText[] {
  return [content.lead, ...content.takeaways, ...content.body.flatMap(blockTexts), ...content.faq.flatMap((f) => [f.q, f.a])];
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Words a reader goes through, not counting the image alt text. */
export function contentWords(content: BlogContent): number {
  const texts = [content.lead, ...content.takeaways, ...content.body.filter((b) => b.type !== "image").flatMap(blockTexts), ...content.faq.flatMap((f) => [f.q, f.a])];
  return texts.reduce((n, t) => n + wordCount(plainText(t)), 0);
}

/** About 230 words a minute, never less than one. */
export function readingMinutes(content: BlogContent): number {
  return Math.max(1, Math.round(contentWords(content) / 230));
}
