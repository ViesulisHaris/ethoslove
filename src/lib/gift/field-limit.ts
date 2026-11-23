import { LIMITS } from "@/config/site";
import { loadFieldsSchema } from "@/templates/schemas";
import { FREE_NOTE_MAX_CHARS } from "./free-tier";

/**
 * The fields every gift has, by the names the idea pages use for them. "freeNote" is the message
 * of a free Letter, which is held to the note's length (./free-tier).
 */
const SHARED: Record<string, number> = {
  message: LIMITS.messageMaxChars,
  caption: LIMITS.captionMaxChars,
  freeNote: FREE_NOTE_MAX_CHARS,
};

type Walkable = { maxLength?: number | null; def?: { type?: string; innerType?: Walkable; element?: Walkable }; shape?: Record<string, Walkable> };

/**
 * How many characters one of a template's text fields takes, read from the template's own schema:
 * the field itself, or one line of it when it is a list. null when the template has no such text
 * field. The idea pages print this number beside a line to borrow, so it is never typed by hand,
 * and the tests hold every borrowed line to it.
 */
export async function fieldLimit(slug: string, field: string): Promise<number | null> {
  if (Object.hasOwn(SHARED, field)) return SHARED[field];
  const schema = (await loadFieldsSchema(slug)) as Walkable | null;
  let at: Walkable | undefined = schema?.shape && Object.hasOwn(schema.shape, field) ? schema.shape[field] : undefined;
  // Through "optional", "default" and "a list of" to the text underneath.
  while (at && at.def?.type !== "string") at = at.def?.innerType ?? at.def?.element;
  return typeof at?.maxLength === "number" ? at.maxLength : null;
}
