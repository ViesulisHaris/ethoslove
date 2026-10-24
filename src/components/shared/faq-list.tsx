import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Questions that open on a tap, one at a time, with every answer already in the HTML. Radix's
 * accordion renders a closed answer's text only once it opens, so search engines and assistants
 * reading an occasion page saw its questions and none of its answers (checked on the live
 * /occasions/birthday, 24 Oct 2026). <details> keeps them all in the document and needs no script;
 * a shared `name` closes the open one when another opens, as the accordion did.
 */
export function FaqList({
  items,
  name,
  className,
  questionClassName,
  answerClassName,
}: {
  items: { q: string; a: string }[];
  /** Groups the questions so only one is open at a time. Unique per list on the page. */
  name: string;
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
}) {
  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => (
        <details key={item.q} name={name} className="group">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden",
              questionClassName,
            )}
          >
            {item.q}
            <ChevronDown aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p className={cn("pb-5 text-[15px] leading-relaxed text-ink-soft", answerClassName)}>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
