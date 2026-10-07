import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type DarkRomanceFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<DarkRomanceFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "headline"], title: { en: "The diary", es: "El diario" } },
  opening: Opening,
};
