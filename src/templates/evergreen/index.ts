import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type EvergreenFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<EvergreenFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "title"], title: { en: "The parcel", es: "El paquete" } },
  opening: Opening,
};
