import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type SketchbookFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<SketchbookFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["age", "theme"], title: { en: "The book", es: "El cuaderno" } },
};
