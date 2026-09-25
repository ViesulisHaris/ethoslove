import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type DigicamFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { StampDateField } from "./StampDateField";

export const template: TemplateModule<DigicamFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // A date is the one thing the generated form can't pick well: it gets the site's calendar card.
  fieldEditors: { stampDate: StampDateField },
  leadFields: { keys: ["birthday", "headline", "body"], title: { en: "The camera", es: "La cámara" } },
};
