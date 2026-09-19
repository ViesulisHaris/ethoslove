import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PartyAnimalsFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PartyAnimalsFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["age", "shouts"], title: { en: "The party", es: "La fiesta" } },
};
