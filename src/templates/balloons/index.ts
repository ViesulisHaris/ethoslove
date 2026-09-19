import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type BalloonsFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<BalloonsFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["age", "palette"], title: { en: "The room", es: "La habitación" } },
};
