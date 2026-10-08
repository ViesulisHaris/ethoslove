import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type OnRepeatFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<OnRepeatFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "playlist"], title: { en: "The player", es: "El reproductor" } },
  opening: Opening,
};
