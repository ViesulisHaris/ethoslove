import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type WishboneFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<WishboneFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["wish", "winner"], title: { en: "The wish", es: "El deseo" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
