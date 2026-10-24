import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type CauldronFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<CauldronFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["ingredients", "potion", "look"], title: { en: "The brew", es: "El brebaje" } },
  opening: Opening,
};
