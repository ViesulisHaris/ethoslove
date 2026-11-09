type FieldParser = { safeParse?: (value: unknown) => { success: boolean; data?: unknown } };

/**
 * A gift's template settings, with every one it left out filled with the template's default: the
 * value the editor shows for an empty box and seeds a new gift with. A cleared number box saves no
 * value at all, and an edit to a live gift is stored as the editor sent it, so on 9 Nov an Arcade
 * gift reached its game with no catches per level: the counter read "8/undefined" and no level could
 * ever be cleared. A template never meets a hole in its own settings now.
 *
 * Only a missing setting is filled (or a null one its schema doesn't allow). Whatever the sender saved
 * stays exactly as it is, even outside the schema's limits: a list of two reasons where the editor
 * asks for three is still their two reasons, and each template keeps its own guard for odd values
 * (Arcade's catchesPerLevel). The same object comes back when nothing was missing, and nothing here
 * throws: a gift renders as before rather than not at all.
 */
export function withFieldDefaults(schema: unknown, fields: Record<string, unknown>): Record<string, unknown> {
  try {
    const shape = (schema as { shape?: Record<string, FieldParser> } | null | undefined)?.shape;
    if (!shape || typeof shape !== "object") return fields;
    let filled: Record<string, unknown> | null = null;
    for (const [key, field] of Object.entries(shape)) {
      if (typeof field?.safeParse !== "function") continue;
      const value = fields[key];
      const missing = value === undefined || (value === null && !field.safeParse(null).success);
      if (!missing) continue;
      const fallback = field.safeParse(undefined);
      if (!fallback.success || fallback.data === undefined) continue;
      (filled ??= { ...fields })[key] = fallback.data;
    }
    return filled ?? fields;
  } catch {
    return fields;
  }
}
