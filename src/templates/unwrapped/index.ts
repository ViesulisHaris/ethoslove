import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type UnwrappedFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<UnwrappedFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["stats"], title: { en: "Your year in numbers", es: "Vuestro año en números" } },
  opening: Opening,
};
