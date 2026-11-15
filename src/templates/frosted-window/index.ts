import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type FrostedWindowFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<FrostedWindowFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["sign"], title: { en: "Outside the window", es: "Al otro lado de la ventana" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
