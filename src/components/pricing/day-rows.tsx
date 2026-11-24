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
        // Picture, then name over date, then the distance on the right; under 360 px the distance
        // moves under the date so the name and date keep their room (no "San / Valentín" on a small phone).
        <li key={row.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 max-[359px]:grid-cols-[2.5rem_minmax(0,1fr)]">
          {/* The occasions' own rendered pictures (public/art/occasions), 6 KB each. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.icon} alt="" width={40} height={40} className="row-span-2 size-10 object-contain max-[359px]:row-span-3" />
          <p className="col-start-2 row-start-1 self-end text-[15px] leading-snug font-medium text-ink">{row.name}</p>
          <p className="col-start-2 row-start-2 self-start text-sm text-muted-foreground">{row.date}</p>
          <p className="col-start-3 row-span-2 row-start-1 text-[13px] text-ink-soft max-[359px]:col-start-2 max-[359px]:row-span-1 max-[359px]:row-start-3">{row.away}</p>
        </li>
      ))}
    </ul>
  );
}
