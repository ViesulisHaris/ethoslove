/**
 * A count from the catalogue said as the copy says it, "twelve trips", "ocho juegos", so a page can
 * read the number instead of typing it (reports/seoaudit-audit.md, m1). Up to twenty in words; past
 * that, figures, which is how the copy writes larger numbers anyway.
 */
const EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const ES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"];

/** `n` in words for the locale; `feminine` for a Spanish feminine noun ("una idea", "veintiuna" is past the list). */
export function countWord(n: number, locale: string, options: { capital?: boolean; feminine?: boolean } = {}): string {
  const words = locale === "es" ? ES : EN;
  let word = Number.isInteger(n) && n >= 0 && n < words.length ? words[n] : String(n);
  if (locale === "es" && options.feminine && n === 1) word = "una";
  return options.capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
