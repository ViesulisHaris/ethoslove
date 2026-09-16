import { z } from "zod";

/** The colours a sheet of paper comes in. Four, so the editor lays them out as buttons. */
export const PAPER_IDS = ["ivory", "blush", "sage", "slate"] as const;
export type PaperId = (typeof PAPER_IDS)[number];

/** A crane takes six folds, so six lines is as many as there is paper for. */
export const MAX_LINES = 6;
export const MIN_LINES = 3;

export const fieldsSchema = z.object({
  paper: z.enum(PAPER_IDS).default("ivory"),
  /** One short line per fold, in the order they are folded. Empty falls back to the demo's own. */
  lines: z.array(z.string().trim().min(1).max(72)).min(MIN_LINES).max(MAX_LINES).default([]),
  /** The line left on the table once the crane has gone. */
  closing: z.string().trim().max(90).default(""),
});

export type PaperCraneFields = z.infer<typeof fieldsSchema>;

/**
 * The fields as the template should draw them, whatever shape they arrive in.
 *
 * A whole-object parse is all or nothing, and the editor renders the gift live while the sender
 * is still typing — so between the first line and the third the object is invalid and everything
 * else would snap back to a default, taking the paper they chose and the line they wrote with it.
 * Each key is read on its own instead, and only the key that is wrong falls back.
 */
export function readFields(value: unknown): PaperCraneFields {
  const whole = fieldsSchema.safeParse(value);
  if (whole.success) return whole.data;
  const raw = (value ?? {}) as Record<string, unknown>;
  const paper = z.enum(PAPER_IDS).safeParse(raw.paper);
  const lines = z.array(z.string()).safeParse(raw.lines);
  const closing = z.string().safeParse(raw.closing);
  return {
    paper: paper.success ? paper.data : "ivory",
    lines: lines.success ? lines.data.slice(0, MAX_LINES) : [],
    closing: closing.success ? closing.data.trim().slice(0, 90) : "",
  };
}
