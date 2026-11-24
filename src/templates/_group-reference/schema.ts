import { z } from "zod";

/** The reference template has no fields of its own: a group card is the base gift plus `contributions`. */
export const fieldsSchema = z.object({});

export type GroupReferenceFields = z.infer<typeof fieldsSchema>;
