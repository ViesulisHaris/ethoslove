import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type TrickOrTreatFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<TrickOrTreatFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
};
