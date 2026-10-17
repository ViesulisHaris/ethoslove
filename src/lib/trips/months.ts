/**
 * The best months as short runs in the page's language: [3, 4, 5, 6, 9, 10] reads "Mar–Jun, Sept–Oct".
 * Only ever called on the server, so the browser's own month names can't disagree with it.
 */
export function monthRanges(months: number[], locale: "en" | "es"): string {
  const format = new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { month: "short", timeZone: "UTC" });
  const name = (m: number) => {
    const short = format.format(new Date(Date.UTC(2026, m - 1, 15))).replace(".", "");
    return short.charAt(0).toUpperCase() + short.slice(1);
  };
  const sorted = [...new Set(months)].filter((m) => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of sorted) {
    const run = runs[runs.length - 1];
    if (run && m === run[1] + 1) run[1] = m;
    else runs.push([m, m]);
  }
  return runs.map(([from, to]) => (from === to ? name(from) : `${name(from)}–${name(to)}`)).join(", ");
}
