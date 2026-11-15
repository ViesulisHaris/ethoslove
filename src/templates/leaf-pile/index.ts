import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type LeafPileFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<LeafPileFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["line"], title: { en: "The card", es: "La tarjeta" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
