import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type ThankfulPieFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<ThankfulPieFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["ingredients"], title: { en: "The recipe", es: "La receta" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
