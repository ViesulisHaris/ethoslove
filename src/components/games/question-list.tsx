import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPREAD, SUMMARY } from "./page/layout";

const LIST = "grid list-decimal gap-x-12 gap-y-2.5 pl-5 text-[15.5px] leading-relaxed text-cream/85 marker:text-cream/40 sm:grid-cols-2";

/**
 * Every free question of a game, in the page under the table: the game deals them one at a time,
 * and "would you rather questions for couples" is answered everywhere else by a long list. Laid out
 * as the notes under it are (page/game-notes.tsx): a short left column, and on the right the first
 * few of each group on show and the rest in a closed <details>, still in the HTML, numbered on from
 * where the open ones stop (docs/marketing/growth-build/DESIGN-LESS-TEXT.md: 300 words a page).
 * Only the free decks: the paid packs stay in their packs.
 */
export function QuestionList({ id, label, title, intro, groups, show, more, className }: { id: string; label: string; title: string; intro: string; groups: { name?: string; items: string[] }[]; show: number; more: (count: number) => string; className?: string }) {
  return (
    <section className={cn("container-x relative pb-24", className)} aria-labelledby={id}>
      <div className="border-t border-cream/15 pt-12">
        <div className={SPREAD}>
          <div>
            <p className="text-eyebrow text-blush">{label}</p>
            <h2 id={id} className="mt-4 display-md text-balance text-cream">
              {title}
            </h2>
            <p className="mt-4 max-w-[21rem] text-[15px] leading-relaxed text-cream/70">{intro}</p>
          </div>
          <div className="min-w-0 lg:pt-1">
            {groups.map((group, g) => {
              const rest = group.items.slice(show);
              return (
                <div key={group.name ?? "all"} data-list-group className={g > 0 ? "mt-10" : undefined}>
                  {group.name ? <h3 className="text-eyebrow text-blush">{group.name}</h3> : null}
                  <ol className={cn(LIST, group.name && "mt-4")}>
                    {group.items.slice(0, show).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  {rest.length ? (
                    <details data-list-more className="group mt-4 border-y border-cream/15">
                      <summary className={SUMMARY}>
                        {more(rest.length)}
                        <Plus aria-hidden="true" className="size-4 shrink-0 text-cream/70 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                      </summary>
                      <ol start={show + 1} className={cn(LIST, "pb-5")}>
                        {rest.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/** "A or B?", with Spanish "u" before an o-sound ("una playa u otra"). */
export function eitherOr(a: string, b: string, locale: "en" | "es"): string {
  if (locale === "es") return `¿${a} ${/^h?o/i.test(b) ? "u" : "o"} ${b.charAt(0).toLowerCase()}${b.slice(1)}?`;
  return `${a} or ${b.charAt(0).toLowerCase()}${b.slice(1)}?`;
}
