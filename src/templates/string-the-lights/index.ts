import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type StringTheLightsFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<StringTheLightsFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["sign"], title: { en: "In lights", es: "Con luces" } },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
