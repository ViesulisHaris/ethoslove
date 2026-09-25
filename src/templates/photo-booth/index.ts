import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PhotoBoothFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PhotoBoothFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["booth", "filter"], title: { en: "The booth", es: "El fotomatón" } },
};
