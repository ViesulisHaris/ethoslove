import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PopupCardFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PopupCardFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["age", "theme"], title: { en: "The card", es: "La tarjeta" } },
};
