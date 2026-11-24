/**
 * Spanish month abbreviations as Spanish writes them: lower case, with the full stop, "sept." (not
 * the English "Sept"), and May whole, since "may." is not one people use.
 */
const ES_MONTHS = ["ene.", "feb.", "mar.", "abr.", "mayo", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

/**
 * The best months as short runs in the page's language: [3, 4, 5, 6, 9, 10] reads "Mar–Jun, Sept–Oct",
 * and in Spanish "mar.–jun., sept.–oct.". Only ever called on the server, so the browser's own month
 * names can't disagree with it.
 */
export function monthRanges(months: number[], locale: "en" | "es"): string {
  const format = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
  const name = (m: number) => (locale === "es" ? ES_MONTHS[m - 1] : format.format(new Date(Date.UTC(2026, m - 1, 15))).replace(".", ""));
  const sorted = [...new Set(months)].filter((m) => Number.isInteger(m) && m >= 1 && m <= 12).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of sorted) {
    const run = runs[runs.length - 1];
    if (run && m === run[1] + 1) run[1] = m;
    else runs.push([m, m]);
  }
  return runs.map(([from, to]) => (from === to ? name(from) : `${name(from)}–${name(to)}`)).join(", ");
}
