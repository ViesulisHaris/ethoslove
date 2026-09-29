import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type CoquetteFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<CoquetteFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "note"], title: { en: "The collage", es: "El collage" } },
};
