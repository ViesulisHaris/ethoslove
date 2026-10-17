import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { RICH_TEXT_TOKEN } from "@/content/blog/text";

/** A post's inline text: links, bold and italic, and everything else as plain text. */
export function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(RICH_TEXT_TOKEN)) {
    const [whole, label, href, bold, italic] = m;
    if (m.index > last) parts.push(text.slice(last, m.index));
    const key = m.index;
    if (label && href) {
      parts.push(
        href.startsWith("/") ? (
          <Link key={key} href={href} className="text-coral underline underline-offset-4 hover:text-ink">
            {label}
          </Link>
        ) : (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-coral underline underline-offset-4 hover:text-ink">
            {label}
          </a>
        ),
      );
    } else if (bold) {
      parts.push(
        <strong key={key} className="font-semibold text-ink">
          {bold}
        </strong>,
      );
    } else if (italic) {
      parts.push(<em key={key}>{italic}</em>);
    }
    last = m.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
