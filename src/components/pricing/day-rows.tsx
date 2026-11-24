/**
 * The next days as two rows (the occasion's rendered picture, its name, its date, how far away), the
 * way the "two more gifts" card and the gifts page's "gifts ready" strip both draw them. No hooks:
 * the share screen draws it in the browser and the gifts page on the server, from words already made.
 */
export type DayRow = { key: string; icon: string; name: string; date: string; away: string };

export function DayRows({ rows }: { rows: DayRow[] }) {
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border" data-testid="pair-days">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-4 py-2.5">
          {/* The occasions' own rendered pictures (public/art/occasions), 6 KB each. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.icon} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-snug font-medium text-ink">{row.name}</p>
            <p className="text-sm text-muted-foreground">{row.date}</p>
          </div>
          <p className="shrink-0 text-[13px] text-ink-soft">{row.away}</p>
        </li>
      ))}
    </ul>
  );
}
