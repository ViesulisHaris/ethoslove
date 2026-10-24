import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type SeanceFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<SeanceFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["spell", "look"], title: { en: "The séance", es: "La sesión" } },
  opening: Opening,
};
