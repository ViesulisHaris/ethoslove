import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type LightTheCandlesFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<LightTheCandlesFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["thanks"], title: { en: "The candles", es: "Las velas" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
