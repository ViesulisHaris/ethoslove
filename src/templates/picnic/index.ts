import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PicnicFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PicnicFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["labels"], title: { en: "The basket", es: "La cesta" } },
};
