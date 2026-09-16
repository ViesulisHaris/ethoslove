import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type GardenFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<GardenFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["garden", "blooms"], title: { en: "The garden", es: "El jardín" } },
};
