/**
 * Every free question of a game, written out under the table. The game deals them one at a time,
 * so a page that only held the game said almost nothing to anyone reading it as text, search
 * engines included, while "would you rather questions for couples" is answered everywhere else by
 * a long list. This is that list, and the game above it is what the list pages don't have. Only
 * the free decks: the paid packs stay in their packs.
 */
export function QuestionList({ id, title, intro, groups }: { id: string; title: string; intro: string; groups: { name?: string; items: string[] }[] }) {
  return (
    <section className="container-x relative pb-24" aria-labelledby={id}>
      <div className="border-t border-cream/15 pt-12">
        <h2 id={id} className="display-md max-w-3xl text-cream">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-cream/70">{intro}</p>
        {groups.map((group) => (
          <div key={group.name ?? "all"} className="mt-10">
            {group.name ? <h3 className="text-eyebrow text-blush">{group.name}</h3> : null}
            <ol className="mt-4 grid list-decimal gap-x-12 gap-y-2.5 pl-5 text-[15.5px] leading-relaxed text-cream/85 marker:text-cream/40 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "A or B?", with Spanish "u" before an o-sound ("una playa u otra"). */
export function eitherOr(a: string, b: string, locale: "en" | "es"): string {
  if (locale === "es") return `¿${a} ${/^h?o/i.test(b) ? "u" : "o"} ${b.charAt(0).toLowerCase()}${b.slice(1)}?`;
  return `${a} or ${b.charAt(0).toLowerCase()}${b.slice(1)}?`;
}
