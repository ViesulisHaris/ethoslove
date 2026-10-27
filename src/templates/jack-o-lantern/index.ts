import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type JackOLanternFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<JackOLanternFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["carving", "face", "look"], title: { en: "The pumpkin", es: "La calabaza" } },
  opening: Opening,
};
