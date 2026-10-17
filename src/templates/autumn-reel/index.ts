import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type AutumnReelFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<AutumnReelFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "wish", "ticket"], title: { en: "The collage", es: "El collage" } },
  opening: Opening,
};
