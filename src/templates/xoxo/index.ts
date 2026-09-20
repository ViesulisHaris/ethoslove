import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type XoxoFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<XoxoFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["headline", "lines"], title: { en: "The words", es: "Las palabras" } },
};
