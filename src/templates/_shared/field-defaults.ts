import { describeObjectSchema } from "@/lib/editor/zod-describe";

type FieldParser = { safeParse?: (value: unknown) => { success: boolean; data?: unknown } };

/**
 * A gift's template settings, made safe for its template before it ever sees them. On 9 Nov an
 * Arcade gift reached its game with no catches per level (a cleared number box saves no value, and
 * a live edit was stored as the editor sent it): the counter read "8/undefined" and no level could
 * ever be cleared. The template sweep (tests/e2e/template-sweep.spec.ts) then found Bloom and
 * Constellations crashing on an option they no longer have.
 *
 * - A setting left out (or a null its schema doesn't allow) reads as the template's default: the
 *   value the editor shows for an empty box and seeds a new gift with.
 * - A choice the template can't take (an option it no longer has, a switch that isn't on or off, a
 *   colour that isn't one) reads as its default too: a choice isn't the sender's words.
 * - A number past its limits reads as the nearest limit (88 catches a level: 20).
 * - What the sender wrote, texts and lists, stays exactly as saved, even outside the schema's limits:
 *   two reasons where the editor asks for three are still their two reasons. Each template copes.
 *
 * Keys the schema doesn't name pass through. The same object comes back when nothing changed, and
 * nothing here throws: a gift renders as before rather than not at all.
 */
export function withFieldDefaults(schema: unknown, fields: Record<string, unknown>): Record<string, unknown> {
  try {
    const shape = (schema as { shape?: Record<string, FieldParser> } | null | undefined)?.shape;
    if (!shape || typeof shape !== "object") return fields;
    const kinds = new Map(describeObjectSchema(schema as never).map((d) => [d.key, d]));
    let out: Record<string, unknown> | null = null;
    const set = (key: string, value: unknown) => {
      (out ??= { ...fields })[key] = value;
    };
    for (const [key, field] of Object.entries(shape)) {
      const parse = field?.safeParse;
      if (typeof parse !== "function") continue;
      const value = fields[key];
      const empty = parse(undefined);
      if (value === undefined || (value === null && !parse(null).success)) {
        if (empty.success && empty.data !== undefined) set(key, empty.data);
        continue;
      }
      if (parse(value).success) continue;
      const kind = kinds.get(key);
      if (!kind) continue;
      if (kind.widget === "number" && typeof value === "number" && Number.isFinite(value)) {
        const clamped = Math.min(kind.max ?? value, Math.max(kind.min ?? value, value));
        const fixed = [clamped, Math.round(clamped)].find((n) => parse(n).success);
        if (fixed !== undefined) {
          set(key, fixed);
          continue;
        }
      }
      // A choice, never words: an option it doesn't have, or a switch, colour or number it can't use.
      if ((kind.widget === "select" || kind.widget === "boolean" || kind.widget === "color" || kind.widget === "number") && empty.success) set(key, empty.data);
      else if (kind.widget === "select" && kind.options?.length) set(key, kind.options[0]);
    }
    return out ?? fields;
  } catch {
    return fields;
  }
}
