import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type HauntedHouseFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<HauntedHouseFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["tag", "look"], title: { en: "The house", es: "La casa" } },
  opening: Opening,
};
