import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type NiceListFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<NiceListFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["verdict", "nice", "naughty"], title: { en: "The list", es: "La lista" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
