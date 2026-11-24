/**
 * The line a "note" step card shows in handwriting ("How to send" on a gift's page). A step says
 * which field it is about (content/template-steps.ts, `quote`), and the card shows a real value of
 * that field: a line the gift's own cards lend for it, or what its demo has there. So "Set both
 * cities" shows "Berlin → Riga" and "Choose the flower" shows "Peony", where every card used to
 * show the gift's first short line to borrow whatever its step was about (a nationality line under
 * "Set both cities").
 *
 * A spec is one field, several to try in turn (an array), or fields to join with an arrow
 * ("fields.fromCity+fields.toCity"). A field is one every gift has ("title", "message",
 * "recipientName", "caption") or one of the template's own ("fields.sign").
 */
export type QuoteSpec = string | readonly string[];

export type QuoteSource = {
  /** The gift's lines to borrow, each with the field it goes in. */
  lent: readonly { field: string; line: string }[];
  /** The gift's demo in this language, as its demo-data file has it. */
  demo: Record<string, unknown> | null;
  /** The names the editor gives a field's choices, by field, in this language. */
  options: Record<string, Record<string, string>>;
};

/** What reads on a card that small: a word at least, thirty characters at most. */
export const fitsCard = (line: string) => line.length >= 2 && line.length <= 30;

/** What the demo has in a field, as words: a list gives its first entry, a choice the name the editor shows, a place its name. */
function demoValue(path: string, source: QuoteSource): string | null {
  const demo = source.demo;
  if (!demo) return null;
  const key = path.startsWith("fields.") ? path.slice("fields.".length) : path;
  const raw = path.startsWith("fields.") ? (demo.fields as Record<string, unknown> | undefined)?.[key] : path === "caption" ? (demo.photos as { caption?: string }[] | undefined)?.find((p) => p.caption)?.caption : demo[key];
  const one: unknown = Array.isArray(raw) ? raw[0] : raw;
  if (typeof one === "number") return String(one);
  if (one && typeof one === "object" && typeof (one as { name?: unknown }).name === "string") return (one as { name: string }).name;
  if (typeof one !== "string" || one.trim() === "") return null;
  return source.options[key]?.[one] ?? one;
}

export function stepQuote(spec: QuoteSpec, source: QuoteSource): string | null {
  for (const field of typeof spec === "string" ? [spec] : spec) {
    if (field.includes("+")) {
      const parts = field.split("+").map((part) => demoValue(part, source));
      const joined = parts.join(" → ");
      if (parts.every(Boolean) && fitsCard(joined)) return joined;
      continue;
    }
    const lent = source.lent.find((l) => l.field === field && fitsCard(l.line));
    if (lent) return lent.line;
    const demo = demoValue(field, source);
    if (demo && fitsCard(demo)) return demo;
  }
  return null;
}
