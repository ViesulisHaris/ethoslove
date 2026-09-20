import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type KeepsakeFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<KeepsakeFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["word", "engraving"], title: { en: "The kept things", es: "Las cosas guardadas" } },
};
