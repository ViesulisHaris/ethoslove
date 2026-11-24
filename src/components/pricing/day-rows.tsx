/**
 * The next days as rows (the occasion's rendered picture, its name, its date, how far away), the
 * way the "two more gifts" card and the gifts page's "gifts ready" strip both draw them. No hooks:
 * the share screen draws it in the browser and the gifts page on the server, from words already made.
 */
export type DayRow = { key: string; icon: string; name: string; date: string; away: string };

/**
 * `short`: on a short screen (max-height 760 px, an iPhone 13's 664 px among them) each row is one
 * line, "Christmas · 25 December" beside a 28 px picture, about 40 px a row, so the card's pay
 * button stays on the first screen. Only the share screen's card asks for it.
 */
export function DayRows({ rows, short = false }: { rows: DayRow[]; short?: boolean }) {
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border" data-testid="pair-days">
      {rows.map((row) => (
        // Picture, then name over date, then the distance on the right; under 360 px the distance
        // moves under the date so the name and date keep their room (no "San / Valentín" on a small phone).
        <li
          key={row.key}
          className={
            short
              ? "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 max-[359px]:grid-cols-[2.5rem_minmax(0,1fr)] [@media(max-height:760px)]:grid-cols-[1.75rem_minmax(0,1fr)_auto] [@media(max-height:760px)]:min-h-10 [@media(max-height:760px)]:gap-x-2.5 [@media(max-height:760px)]:py-1.5 max-[359px]:[@media(max-height:760px)]:grid-cols-[1.75rem_minmax(0,1fr)]"
              : "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 max-[359px]:grid-cols-[2.5rem_minmax(0,1fr)]"
          }
        >
          {/* The occasions' own rendered pictures (public/art/occasions), 6 KB each. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.icon} alt="" width={40} height={40} className={short ? "size-10 object-contain max-[359px]:row-span-2 [@media(max-height:760px)]:size-7" : "size-10 object-contain max-[359px]:row-span-2"} />
          {short ? (
            // One line on a short screen when it fits. Where it doesn't (Spanish, a narrower phone) the
            // date goes under the name: the dot lives in the date's left padding, and the box clips
            // what stands left of its edge, so a date that wrapped starts the line without a stray dot.
            <div className="col-start-2 row-start-1 min-w-0 [@media(max-height:760px)]:overflow-hidden">
              <div className="[@media(max-height:760px)]:-ml-3 [@media(max-height:760px)]:flex [@media(max-height:760px)]:flex-wrap [@media(max-height:760px)]:items-baseline">
                <p className="text-[15px] leading-snug font-medium text-ink [@media(max-height:760px)]:pl-3 [@media(max-height:760px)]:text-sm [@media(max-height:760px)]:leading-tight">{row.name}</p>
                {/* The dot is drawn, not written: the row reads "Christmas, 25 December" aloud as before. */}
                <p className="text-sm text-muted-foreground [@media(max-height:760px)]:relative [@media(max-height:760px)]:pl-3 [@media(max-height:760px)]:text-[13px] [@media(max-height:760px)]:leading-tight [@media(max-height:760px)]:whitespace-nowrap [@media(max-height:760px)]:before:absolute [@media(max-height:760px)]:before:left-1 [@media(max-height:760px)]:before:content-['·']">
                  {row.date}
                </p>
              </div>
            </div>
          ) : (
            <div className="col-start-2 row-start-1 min-w-0">
              <p className="text-[15px] leading-snug font-medium text-ink">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.date}</p>
            </div>
          )}
          <p className="col-start-3 row-start-1 text-[13px] text-ink-soft max-[359px]:col-start-2 max-[359px]:row-start-2">{row.away}</p>
        </li>
      ))}
    </ul>
  );
}
