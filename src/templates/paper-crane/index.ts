import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PaperCraneFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PaperCraneFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // The lines are the gift, so they are asked for straight under the names.
  leadFields: {
    keys: ["lines", "closing"],
    title: { en: "What each fold says", es: "Lo que dice cada pliegue" },
  },
  // A reply is folded from the same sheet of paper; the words are the sender's own.
  replyFields: (fields) => ({ paper: fields.paper }),
};
